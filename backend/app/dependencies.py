from typing import Generator, Callable
from sqlalchemy.orm import Session
from .database import SessionLocal
from .auth import get_current_user, admin_required
from fastapi import Depends, HTTPException, Path
from .models import RedTeamTraining, Certification, VendorTraining, SkillLevelHistory, TeamRoster


def get_db() -> Generator[Session, None, None]:
    """
    Creates a new database session for each request and closes it when done.
    Can be used as a FastAPI dependency across all route modules.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# Re-export auth dependencies for easier imports
get_current_user_dependency = get_current_user
admin_required_dependency = admin_required


def create_owner_or_admin_required(record_type: str) -> Callable:
    """
    Factory function to create an owner_or_admin_required dependency for a specific record type.
    
    Args:
        record_type: Type of record ('red_team', 'certification', 'vendor', 'skill_level')
    
    Returns:
        A dependency function that checks if the user is either an admin or the owner of the record
    """
    async def owner_or_admin_required(
        id: int = Path(..., gt=0),  # Changed from record_id to id to match path parameter
        db: Session = Depends(get_db),
        user: TeamRoster = Depends(get_current_user)
    ) -> TeamRoster:
        """
        Dependency to check if the user is either an admin or the owner of the record.
        
        Args:
            id: ID of the record to check (from path parameter)
            db: Database session
            user: Current user information
        
        Returns:
            The user if authorized, otherwise raises HTTPException
        """
        if "ADMIN" in user.team_role.upper():
            return user
            
        # Get the record from the appropriate table
        record = None
        if record_type == "red_team":
            record = db.query(RedTeamTraining).filter(RedTeamTraining.id == id).first()
        elif record_type == "certification":
            record = db.query(Certification).filter(Certification.id == id).first()
        elif record_type == "vendor":
            record = db.query(VendorTraining).filter(VendorTraining.id == id).first()
        elif record_type == "skill_level":
            record = db.query(SkillLevelHistory).filter(SkillLevelHistory.id == id).first()
        
        if not record:
            raise HTTPException(status_code=404, detail=f"{record_type} record not found")
        
        # Check if the user is the owner of the record
        if record.operator_name != user.name:
            raise HTTPException(
                status_code=403,
                detail="You don't have permission to modify this record"
            )
        
        return user
    
    return owner_or_admin_required 