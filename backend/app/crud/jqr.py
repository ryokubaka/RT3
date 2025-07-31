from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session, joinedload
from ..utils.db_utils import CRUDBase
from ..models import JQRItem, JQRTracker, TeamRoster
from ..schemas import (
    JQRItemUpdate, JQRItemResponse,
    JQRTrackerUpdate, JQRTrackerResponse,
    JQRTrackerCreate
)
from ..enums import OperatorLevel


class CRUDJQRItem(CRUDBase[JQRItem, JQRItemUpdate, JQRItemUpdate]):
    """CRUD operations for JQR Items"""
    
    def get_by_section(self, db: Session, section: str) -> List[JQRItem]:
        """Get all JQR items for a specific section"""
        return db.query(self.model).filter(self.model.task_section == section).all()


class CRUDJQRTracker(CRUDBase[JQRTracker, JQRTrackerCreate, JQRTrackerUpdate]):
    """CRUD operations for JQR Tracker"""
    
    def get_all(self, db: Session) -> List[JQRTracker]:
        """Get all JQR tracker items with their related tasks"""
        return db.query(self.model).options(joinedload(self.model.task)).all()
    
    def get_by_operator(self, db: Session, operator_name: str) -> List[JQRTracker]:
        """Get all JQR tracker items for a specific operator"""
        return db.query(self.model).options(joinedload(self.model.task)).filter(self.model.operator_name == operator_name).all()
    
    def get_multi_by_ids(self, db: Session, ids: List[int]) -> List[JQRTracker]:
        """Get multiple JQR tracker items by their IDs"""
        return db.query(self.model).options(joinedload(self.model.task)).filter(self.model.id.in_(ids)).all()
    
    def get_with_task(self, db: Session, id: int) -> Optional[JQRTracker]:
        """Get a JQR tracker item with its related task"""
        return db.query(self.model).options(joinedload(self.model.task)).filter(self.model.id == id).first()
    
    def bulk_update(self, db: Session, ids: List[int], update_data: Dict[str, Any]) -> List[JQRTracker]:
        """Update multiple JQR tracker items at once"""
        # First query all items to ensure they exist
        items = db.query(self.model).filter(self.model.id.in_(ids)).all()
        
        # Validate that all requested IDs were found
        found_ids = {item.id for item in items}
        missing_ids = set(ids) - found_ids
        if missing_ids:
            raise ValueError(f"Could not find JQR tracker items with IDs: {missing_ids}")
        
        try:
            # Update each item with the provided data
            for item in items:
                for key, value in update_data.items():
                    if hasattr(item, key):
                        setattr(item, key, value)
            
            # Commit all changes in a transaction
            db.commit()
            
            # Refresh all items to get updated data
            for item in items:
                db.refresh(item)
                
            return items
            
        except Exception as e:
            # Rollback on any error
            db.rollback()
            raise ValueError(f"Error updating JQR tracker items: {str(e)}")
    
    def sync_with_roster(self, db: Session) -> Dict[str, int]:
        """Sync JQR tracker with current roster"""
        try:
            # Get all active operators
            operators = db.query(TeamRoster).filter(TeamRoster.active == True).all()
            print(f"Found {len(operators)} active operators")
            
            # Get all JQR items
            jqr_items = jqr_item.get_all(db)
            print(f"Found {len(jqr_items)} JQR items")
            
            # Get operator levels
            operator_levels = {}
            for op in operators:
                operator_levels[op.name] = op.operator_level
            print(f"Operator levels: {operator_levels}")
            
            # Get existing tracker items
            existing_items = self.get_all(db)
            print(f"Found {len(existing_items)} existing tracker items")
            
            # Create a set of existing item IDs for quick lookup
            existing_item_ids = {f"{item.operator_name}_{item.task_id}" for item in existing_items}
            
            # Track created and deleted items
            created_count = 0
            deleted_count = 0
            
            # Create a set of valid JQR item IDs
            valid_jqr_ids = {item.id for item in jqr_items}
            
            # Remove orphaned tracker items (where JQR item no longer exists)
            for tracker_item in existing_items:
                if tracker_item.task_id not in valid_jqr_ids:
                    print(f"Removing orphaned tracker item: {tracker_item.operator_name} - Task ID {tracker_item.task_id}")
                    db.delete(tracker_item)
                    deleted_count += 1
                    existing_item_ids.discard(f"{tracker_item.operator_name}_{tracker_item.task_id}")
            
            # Process each operator
            for op in operators:
                print(f"Processing operator: {op.name}, level: {op.operator_level.value}")
                
                # For each JQR item
                for item in jqr_items:
                    # Check if item should be assigned to this operator's level
                    should_assign = False
                    if op.operator_level == OperatorLevel.apprentice and item.apprentice:
                        should_assign = True
                    elif op.operator_level == OperatorLevel.journeyman and item.journeyman:
                        should_assign = True
                    elif op.operator_level == OperatorLevel.master and item.master:
                        should_assign = True
                    
                    if should_assign:
                        # Create unique key for this operator-item combination
                        item_key = f"{op.name}_{item.id}"
                        
                        # Only create if it doesn't exist
                        if item_key not in existing_item_ids:
                            tracker_item = JQRTracker(
                                operator_name=op.name,
                                task_id=item.id,
                                operator_level=op.operator_level,
                                task_skill_level="apprentice" if item.apprentice else "journeyman" if item.journeyman else "master"
                            )
                            # Set the task relationship
                            tracker_item.task = item
                            db.add(tracker_item)
                            created_count += 1
                            existing_item_ids.add(item_key)
                            print(f"Created tracker item for {op.name} - Task: {item.question}")
            
            # Commit all changes
            db.commit()
            print(f"Total new entries created: {created_count}")
            print(f"Total orphaned entries deleted: {deleted_count}")
            
            return {
                "new_entries_created": created_count,
                "orphaned_entries_deleted": deleted_count
            }
            
        except Exception as e:
            db.rollback()
            print(f"Error in sync_with_roster: {str(e)}")
            raise e
    
    @staticmethod
    def _should_assign_item_to_level(item_level: str, operator_level: str) -> bool:
        """
        Determine if an item should be assigned to an operator based on levels
        
        Args:
            item_level: The skill level of the item (apprentice, journeyman, master)
            operator_level: The operator's level (Team Member, Apprentice, Journeyman, Master)
                          or their enum values (team_member, apprentice, journeyman, master)
            
        Returns:
            True if the item should be assigned to the operator
        """
        # Normalize operator_level to handle both enum values and display values
        normalized_level = operator_level.lower()
        if "team member" in normalized_level or "team_member" in normalized_level:
            normalized_level = "team_member"
        elif "apprentice" in normalized_level:
            normalized_level = "apprentice"
        elif "journeyman" in normalized_level:
            normalized_level = "journeyman"
        elif "master" in normalized_level:
            normalized_level = "master"
            
        # Handle team_member level - they should see apprentice tasks
        if normalized_level == "team_member":
            return item_level == "apprentice"
            
        # Apprentice level - they should see apprentice tasks plus journeyman tasks
        if normalized_level == "apprentice":
            return item_level in ["apprentice", "journeyman"]
            
        # Journeyman and Master levels - they should see all tasks
        if normalized_level in ["journeyman", "master"]:
            return item_level in ["apprentice", "journeyman", "master"]
            
        # Default case - no tasks assigned
        return False


# Create instances
jqr_item = CRUDJQRItem(JQRItem)
jqr_tracker = CRUDJQRTracker(JQRTracker) 