# backend/app/routes/jqr.py
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, Body, Path, UploadFile, File, Form
from sqlalchemy.orm import Session
from pydantic import BaseModel
import csv
from io import StringIO

from ..dependencies import get_db, get_current_user_dependency as get_current_user, admin_required_dependency as admin_required
from ..models import JQRItem, JQRTracker, TeamRoster
from ..schemas import (
    JQRItemResponse, JQRItemUpdate, JQRItemBase,
    JQRTrackerResponse, JQRTrackerUpdate, JQRTrackerBulkUpdate, JQRTrackerCreate
)
from ..crud import jqr_item, jqr_tracker
from ..enums import OperatorLevel

router = APIRouter(tags=["jqr"])

def isAdmin(user) -> bool:
    """
    Check if a user has admin privileges.
    Consistent with frontend isAdmin check.
    """
    try:
        # First try object attribute access
        team_role = getattr(user, "team_role", None)
        if team_role is None and hasattr(user, "get"):
            # Try dictionary access
            team_role = user.get("team_role", None)
            
        # Handle both string and list roles
        if isinstance(team_role, str):
            return "ADMIN" in team_role
        elif isinstance(team_role, (list, tuple)):
            return "ADMIN" in team_role
            
        return False
    except Exception:
        return False

# JQR Questionnaire routes
@router.get("/questionnaire", response_model=List[JQRItemResponse], summary="Get JQR questionnaire")
def get_jqr_questionnaire(
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user)
):
    """
    Retrieve all JQR questionnaire items.
    
    Returns:
        List of all JQR items in the system
    """
    return jqr_item.get_all(db)

@router.post("/questionnaire", response_model=JQRItemResponse, summary="Create JQR item")
def create_jqr_item(
    item_data: JQRItemBase,
    db: Session = Depends(get_db),
    user: dict = Depends(admin_required)
):
    """
    Create a new JQR questionnaire item.
    
    Only users with admin privileges can create items.
    
    Args:
        item_data: The JQR item data
        
    Returns:
        The created JQR item
    """
    return jqr_item.create(db, item_data)

@router.put("/questionnaire/{id}", response_model=JQRItemResponse, summary="Update JQR item")
def update_jqr_item(
    id: int = Path(..., gt=0),
    item_data: JQRItemUpdate = Body(...),
    db: Session = Depends(get_db),
    user: dict = Depends(admin_required)
):
    """
    Update an existing JQR questionnaire item.
    
    Only users with admin privileges can update items.
    
    Args:
        id: The ID of the JQR item to update
        item_data: The updated JQR item data
        
    Returns:
        The updated JQR item
    """
    existing_item = jqr_item.get(db, id)
    if not existing_item:
        raise HTTPException(status_code=404, detail="JQR item not found")
    
    return jqr_item.update(db, existing_item, item_data)

@router.delete("/questionnaire/bulk", response_model=Dict[str, Any], summary="Bulk delete JQR items")
def bulk_delete_jqr_items(
    item_ids: List[int] = Body(...),
    db: Session = Depends(get_db),
    user: dict = Depends(admin_required)
):
    """
    Bulk delete multiple JQR questionnaire items.
    
    Only users with admin privileges can delete items.
    
    Args:
        item_ids: List of JQR item IDs to delete
        
    Returns:
        Dictionary with deletion results
    """
    if not item_ids:
        raise HTTPException(status_code=400, detail="No item IDs provided")
    
    deleted_items = []
    failed_items = []
    
    for item_id in item_ids:
        try:
            existing_item = jqr_item.get(db, item_id)
            if existing_item:
                # Store item for response before deleting
                response_item = JQRItemResponse.from_orm(existing_item)
                deleted_items.append(response_item)
                
                # Delete item
                jqr_item.delete(db, item_id)
            else:
                failed_items.append({"id": item_id, "error": "Item not found"})
        except Exception as e:
            failed_items.append({"id": item_id, "error": str(e)})
    
    return {
        "deleted_count": len(deleted_items),
        "failed_count": len(failed_items),
        "deleted_items": deleted_items,
        "failed_items": failed_items
    }

@router.delete("/questionnaire/{id}", response_model=JQRItemResponse, summary="Delete JQR item")
def delete_jqr_item(
    id: int = Path(..., gt=0),
    db: Session = Depends(get_db),
    user: dict = Depends(admin_required)
):
    """
    Delete a JQR questionnaire item.
    
    Only users with admin privileges can delete items.
    
    Args:
        id: The ID of the JQR item to delete
        
    Returns:
        The deleted JQR item
    """
    existing_item = jqr_item.get(db, id)
    if not existing_item:
        raise HTTPException(status_code=404, detail="JQR item not found")
    
    # Store item for response before deleting
    response_item = JQRItemResponse.from_orm(existing_item)
    
    # Delete item
    jqr_item.delete(db, id)
    
    return response_item

@router.post("/questionnaire/import", response_model=List[JQRItemResponse], summary="Import JQR items from CSV")
async def import_jqr_items(
    file: UploadFile = File(...),
    section: str = Form(...),
    db: Session = Depends(get_db),
    user: dict = Depends(admin_required)
):
    """
    Import JQR items from a CSV file.
    
    Only users with admin privileges can import items.
    
    Args:
        file: The CSV file containing JQR items
        section: The section to import items into (apprentice/journeyman/master)
        
    Returns:
        List of imported JQR items
    """
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="File must be a CSV file")
    
    if section not in ['apprentice', 'journeyman', 'master']:
        raise HTTPException(status_code=400, detail="Invalid section. Must be one of: apprentice, journeyman, master")
    
    try:
        contents = await file.read()
        
        # Try different encodings to handle various CSV file formats
        encodings_to_try = ['utf-8', 'utf-8-sig', 'cp1252', 'latin-1', 'iso-8859-1']
        csv_data = None
        
        for encoding in encodings_to_try:
            try:
                csv_data = StringIO(contents.decode(encoding))
                break
            except UnicodeDecodeError:
                continue
        
        if csv_data is None:
            raise HTTPException(
                status_code=400, 
                detail="Unable to decode CSV file. Please ensure the file is saved with UTF-8, Windows-1252, or Latin-1 encoding."
            )
        
        csv_reader = csv.reader(csv_data)
        
        # Skip header row
        next(csv_reader)
        
        imported_items = []
        current_section = None
        
        for row in csv_reader:
            if not row or not row[0]:  # Skip empty rows
                continue
                
            task_number = row[0].strip()
            content = row[1].strip() if len(row) > 1 else ""
            
            # Determine if this is a section or a question
            if task_number.count('.') == 1:  # Main section (e.g., 0.1)
                current_section = content
                continue
            elif task_number.count('.') > 1:  # Question (e.g., 0.1.1.1)
                # Create JQR item with the selected section set to true
                item_data = JQRItemBase(
                    task_number=task_number,
                    question=content,
                    task_section=current_section,
                    training_status="Active",  # Default to Active
                    apprentice=section == 'apprentice',  # Set based on selected section
                    journeyman=section == 'journeyman',  # Set based on selected section
                    master=section == 'master'  # Set based on selected section
                )
                
                # Create item in database
                item = jqr_item.create(db, item_data)
                imported_items.append(item)
        
        return imported_items
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error importing CSV: {str(e)}")

# JQR Tracker routes
@router.get("/tracker", response_model=List[JQRTrackerResponse], summary="Get JQR tracker items")
def get_jqr_tracker(
    operator_name: Optional[str] = None,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user)
):
    """
    Get JQR tracker items with optional filtering by operator name
    
    Args:
        operator_name: Optional filter by operator name
        
    Returns:
        List of JQR tracker items
    """
    if operator_name:
        return jqr_tracker.get_by_operator(db, operator_name)
    else:
        return jqr_tracker.get_all(db)

@router.put("/tracker/{id}", response_model=JQRTrackerResponse, summary="Update JQR tracker item")
def update_jqr_tracker_item(
    id: int = Path(..., gt=0),
    tracker_data: JQRTrackerUpdate = Body(...),
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user)
):
    """
    Update a single JQR tracker item
    
    Args:
        id: The ID of the tracker item to update
        tracker_data: The updated tracker data
        
    Returns:
        The updated tracker item
    """
    item = jqr_tracker.get(db, id)
    if not item:
        raise HTTPException(status_code=404, detail="JQR tracker item not found")
    
    # Get user's role and name
    try:
        # First try object attributes
        user_name = getattr(user, "name", None)
        user_level = getattr(user, "operator_level", None)
        
        # If attributes are None, try dictionary access
        if user_name is None and hasattr(user, "get"):
            user_name = user.get("name", None)
            user_level = user.get("operator_level", None)
        
        # If we still don't have the values and user is a TeamRoster object
        if user_name is None and isinstance(user, TeamRoster):
            user_name = user.name
            user_level = user.operator_level
            
        if not user_name:
            raise ValueError("Could not determine user name")
            
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error processing user information: {str(e)}"
        )
    
    # If user level is missing, try to get it from the team roster
    if user_level is None:
        operator = db.query(TeamRoster).filter(TeamRoster.name == user_name).first()
        if operator:
            user_level = operator.operator_level
        else:
            # For admin users, assign a master level to ensure they can update anything
            if isAdmin(user):
                user_level = "Master"
    
    # Check if this is the user's own record
    is_own_record = item.operator_name == user_name
    
    # For non-admin users, handle trainer signature updates differently
    if not isAdmin(user):
        if tracker_data.trainer_signature is not None:
            # Get the task's skill level
            task = db.query(JQRItem).filter(JQRItem.id == item.task_id).first()
            if task:
                skill_level = None
                if task.apprentice:
                    skill_level = "Apprentice"
                elif task.journeyman:
                    skill_level = "Journeyman"
                elif task.master:
                    skill_level = "Master"
                
                # Compare user level with task level
                level_hierarchy = {
                    "Team Member": 0,
                    "Apprentice": 1,
                    "Journeyman": 2,
                    "Master": 3
                }
                
                user_rank = level_hierarchy.get(user_level, 0)
                task_rank = level_hierarchy.get(skill_level, 0)
                
                # User must have a higher or equal rank to sign off
                if user_rank < task_rank:
                    raise HTTPException(
                        status_code=403, 
                        detail=f"Your operator level ({user_level}) is insufficient to sign off as trainer for this task ({skill_level})"
                    )
        elif not is_own_record:
            # For non-trainer signature updates, ensure it's the user's own record
            raise HTTPException(status_code=403, detail="You can only update your own records")
    
    # Update the item
    return jqr_tracker.update(db, item, tracker_data)

@router.put("/bulk-tracker", response_model=List[JQRTrackerResponse], summary="Bulk update JQR tracker items")
def bulk_update_jqr_tracker(
    update_data: JQRTrackerBulkUpdate = Body(...),
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user)
):
    """
    Update multiple JQR tracker items at once
    
    Args:
        update_data: Contains IDs of items to update and update data
        
    Returns:
        List of updated JQR tracker items
    """
    if not update_data.ids:
        raise HTTPException(status_code=400, detail="No item IDs provided for update")
    
    # Get user's role and name, handling both object and dictionary formats
    try:
        # First try object attributes
        user_name = getattr(user, "name", None)
        user_level = getattr(user, "operator_level", None)
        
        # If attributes are None, try dictionary access
        if user_name is None and hasattr(user, "get"):
            user_name = user.get("name", None)
            user_level = user.get("operator_level", None)
        
        # If we still don't have the values and user is a TeamRoster object
        if user_name is None and isinstance(user, TeamRoster):
            user_name = user.name
            user_level = user.operator_level
            
        if not user_name:
            raise ValueError("Could not determine user name")
            
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error processing user information: {str(e)}"
        )
    
    # If user level is missing, try to get it from the team roster
    if user_level is None:
        operator = db.query(TeamRoster).filter(TeamRoster.name == user_name).first()
        if operator:
            user_level = operator.operator_level
        else:
            # For admin users, assign a master level to ensure they can update anything
            if isAdmin(user):
                user_level = "Master"
    
    # For non-admin users, check permissions
    if not isAdmin(user):
        items = jqr_tracker.get_multi_by_ids(db, update_data.ids)
        
        # If updating trainer signature, check level permissions
        if hasattr(update_data, "trainer_signature") and update_data.trainer_signature is not None:
            for item in items:
                # Get the task's skill level
                task = db.query(JQRItem).filter(JQRItem.id == item.task_id).first()
                if task:
                    skill_level = None
                    if task.apprentice:
                        skill_level = "Apprentice"
                    elif task.journeyman:
                        skill_level = "Journeyman"
                    elif task.master:
                        skill_level = "Master"
                    
                    # Compare user level with task level
                    level_hierarchy = {
                        "Team Member": 0,
                        "Apprentice": 1,
                        "Journeyman": 2,
                        "Master": 3
                    }
                    
                    user_rank = level_hierarchy.get(user_level, 0)
                    task_rank = level_hierarchy.get(skill_level, 0)
                    
                    # User must have a higher or equal rank to sign off
                    if user_rank < task_rank:
                        raise HTTPException(
                            status_code=403, 
                            detail=f"Your operator level ({user_level}) is insufficient to sign off as trainer for task {item.id} ({skill_level})"
                        )
        else:
            # For non-trainer signature updates, ensure all items belong to the user
            for item in items:
                if item.operator_name != user_name:
                    raise HTTPException(
                        status_code=403, 
                        detail="You can only update your own records"
                    )
    
    # Prepare update data dictionary
    update_dict = update_data.dict(exclude={"ids"}, exclude_unset=True)
    
    try:
        # Perform bulk update
        updated_items = jqr_tracker.bulk_update(db, update_data.ids, update_dict)
        return updated_items
    except ValueError as e:
        # Handle specific validation errors
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        # Handle unexpected errors
        raise HTTPException(status_code=500, detail=f"An error occurred while updating items: {str(e)}")

@router.post("/sync-tracker", response_model=Dict[str, int], summary="Sync JQR tracker with roster")
def sync_jqr_tracker(
    db: Session = Depends(get_db),
    user: dict = Depends(admin_required)
):
    """
    Sync JQR tracker based on current roster and JQR items.
    
    - Add missing entries for each operator based on their level
    - Updates existing entries with current operator levels
    - Doesn't remove entries if operator level is decreased
    
    Only admins can use this endpoint.
    
    Returns:
        Stats with counts of new entries created and operator levels updated
    """
    return jqr_tracker.sync_with_roster(db)

@router.post("/tracker", response_model=JQRTrackerResponse, summary="Create JQR tracker item")
def create_jqr_tracker_item(
    tracker_data: JQRTrackerCreate = Body(...),
    db: Session = Depends(get_db),
    user: dict = Depends(admin_required)
):
    """
    Create a new JQR tracker item
    
    Only admins can create tracker items.
    
    Args:
        tracker_data: The tracker item data
        
    Returns:
        The created JQR tracker item
    """
    return jqr_tracker.create(db, tracker_data)

@router.delete("/tracker/{id}", response_model=JQRTrackerResponse, summary="Delete JQR tracker item")
def delete_jqr_tracker_item(
    id: int = Path(..., gt=0),
    db: Session = Depends(get_db),
    user: dict = Depends(admin_required)
):
    """
    Delete a single JQR tracker item
    
    Only admins can delete tracker items.
    
    Args:
        id: The ID of the tracker item to delete
        
    Returns:
        The deleted JQR tracker item
    """
    item = jqr_tracker.get(db, id)
    if not item:
        raise HTTPException(status_code=404, detail="JQR tracker item not found")
    
    try:
        # Store the item for response before deleting
        response_item = JQRTrackerResponse.from_orm(item)
        
        # Delete the item
        jqr_tracker.delete(db, id)
        
        return response_item
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error deleting item: {str(e)}")
