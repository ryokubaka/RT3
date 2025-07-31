from fastapi import APIRouter, Depends, HTTPException, Path
from sqlalchemy.orm import Session
from typing import List

from ..dependencies import (
    get_db, 
    get_current_user_dependency as get_current_user, 
    admin_required_dependency as admin_required,
    create_owner_or_admin_required
)
from ..models import RedTeamTraining, Certification, VendorTraining, SkillLevelHistory, TeamRoster
from ..schemas import (
    RedTeamTrainingUpdate, RedTeamTrainingResponse,
    CertificationUpdate, CertificationResponse,
    VendorTrainingUpdate, VendorTrainingResponse,
    SkillLevelHistoryUpdate, SkillLevelHistoryResponse
)
from ..crud import red_team_training, certification, vendor_training, skill_level_history
from ..utils.file_utils import delete_file
from .red_team_training import router as red_team_training_router

router = APIRouter(prefix="/training", tags=["training"])

# Create dependencies for each record type
red_team_owner_or_admin = create_owner_or_admin_required("red_team")
certification_owner_or_admin = create_owner_or_admin_required("certification")
vendor_owner_or_admin = create_owner_or_admin_required("vendor")
skill_level_owner_or_admin = create_owner_or_admin_required("skill_level")

# Red Team Training routes
@router.get("/red-team", response_model=List[RedTeamTrainingResponse], summary="Get all red team training records")
def get_red_team_training(
    db: Session = Depends(get_db), 
    user: TeamRoster = Depends(get_current_user)
):
    """
    Retrieve all red team training records.
    
    This endpoint returns a list of all red team training records in the system.
    """
    return red_team_training.get_all(db)

@router.post("/red-team", response_model=RedTeamTrainingResponse, summary="Create a red team training record")
def create_red_team_training(
    data: RedTeamTrainingUpdate, 
    db: Session = Depends(get_db), 
    user: TeamRoster = Depends(get_current_user)
):
    """
    Create a new red team training record.
    
    This endpoint creates a new red team training record with the provided data.
    Users can only create records for themselves.
    """
    # Ensure users can only create records for themselves
    if user.team_role != "ADMIN" and data.operator_name != user.name:
        raise HTTPException(
            status_code=403,
            detail="You can only create records for yourself"
        )
    return red_team_training.create(db, data)

@router.put("/red-team/{id}", response_model=RedTeamTrainingResponse, summary="Update a red team training record")
def update_red_team_training(
    id: int = Path(..., gt=0), 
    data: RedTeamTrainingUpdate = None, 
    db: Session = Depends(get_db), 
    user: TeamRoster = Depends(red_team_owner_or_admin)
):
    """
    Update an existing red team training record.
    
    This endpoint updates a red team training record with the provided data.
    Users can only update their own records.
    """
    existing_record = red_team_training.get(db, id)
    if not existing_record:
        raise HTTPException(status_code=404, detail="Training record not found")
    
    # Ensure users can only update their own records
    if user.team_role != "ADMIN" and data.operator_name != user.name:
        raise HTTPException(
            status_code=403,
            detail="You can only update your own records"
        )
    
    return red_team_training.update(db, existing_record, data)

@router.delete("/red-team/{id}", summary="Delete a red team training record")
def delete_red_team_training(
    id: int = Path(..., gt=0), 
    db: Session = Depends(get_db), 
    user: TeamRoster = Depends(red_team_owner_or_admin)
):
    """
    Delete a red team training record.
    
    This endpoint deletes a red team training record with the specified ID.
    Users can only delete their own records.
    """
    existing_record = red_team_training.get(db, id)
    if not existing_record:
        raise HTTPException(status_code=404, detail="Training record not found")
    
    # Delete associated file if it exists
    delete_file(existing_record.file_url)
    
    # Delete the record
    red_team_training.delete(db, id)
    return {"message": "Training record deleted successfully"}

# Certification routes
@router.get("/certs", response_model=List[CertificationResponse], summary="Get all certification records")
def get_certs(
    db: Session = Depends(get_db), 
    user: TeamRoster = Depends(get_current_user)
):
    """
    Retrieve all certification records.
    
    This endpoint returns a list of all certification records in the system.
    """
    return certification.get_all(db)

@router.post("/certs", response_model=CertificationResponse, summary="Create a certification record")
def create_cert(
    data: CertificationUpdate, 
    db: Session = Depends(get_db), 
    user: TeamRoster = Depends(get_current_user)
):
    """
    Create a new certification record.
    
    This endpoint creates a new certification record with the provided data.
    Users can only create records for themselves.
    """
    # Ensure users can only create records for themselves
    if user.team_role != "ADMIN" and data.operator_name != user.name:
        raise HTTPException(
            status_code=403,
            detail="You can only create records for yourself"
        )
    return certification.create(db, data)

@router.put("/certs/{id}", response_model=CertificationResponse, summary="Update a certification record")
def update_cert(
    id: int = Path(..., gt=0), 
    data: CertificationUpdate = None, 
    db: Session = Depends(get_db), 
    user: TeamRoster = Depends(certification_owner_or_admin)
):
    """
    Update an existing certification record.
    
    This endpoint updates a certification record with the provided data.
    Users can only update their own records.
    """
    existing_record = certification.get(db, id)
    if not existing_record:
        raise HTTPException(status_code=404, detail="Certification record not found")
    
    # Ensure users can only update their own records
    if user.team_role != "ADMIN" and data.operator_name != user.name:
        raise HTTPException(
            status_code=403,
            detail="You can only update your own records"
        )
    
    return certification.update(db, existing_record, data)

@router.delete("/certs/{id}", summary="Delete a certification record")
def delete_cert(
    id: int = Path(..., gt=0), 
    db: Session = Depends(get_db), 
    user: TeamRoster = Depends(certification_owner_or_admin)
):
    """
    Delete a certification record.
    
    This endpoint deletes a certification record with the specified ID.
    Users can only delete their own records.
    """
    existing_record = certification.get(db, id)
    if not existing_record:
        raise HTTPException(status_code=404, detail="Certification record not found")
    
    # Delete associated file if it exists
    delete_file(existing_record.file_url)
    
    # Delete the record
    certification.delete(db, id)
    return {"message": "Certification record deleted successfully"}

# Vendor Training routes
@router.get("/vendor", response_model=List[VendorTrainingResponse], summary="Get all vendor training records")
def get_vendor_training(
    db: Session = Depends(get_db), 
    user: TeamRoster = Depends(get_current_user)
):
    """
    Retrieve all vendor training records.
    
    This endpoint returns a list of all vendor training records in the system.
    """
    return vendor_training.get_all(db)

@router.post("/vendor", response_model=VendorTrainingResponse, summary="Create a vendor training record")
def create_vendor_training(
    data: VendorTrainingUpdate, 
    db: Session = Depends(get_db), 
    user: TeamRoster = Depends(get_current_user)
):
    """
    Create a new vendor training record.
    
    This endpoint creates a new vendor training record with the provided data.
    Users can only create records for themselves.
    """
    # Ensure users can only create records for themselves
    if user.team_role != "ADMIN" and data.operator_name != user.name:
        raise HTTPException(
            status_code=403,
            detail="You can only create records for yourself"
        )
    return vendor_training.create(db, data)

@router.put("/vendor/{id}", response_model=VendorTrainingResponse, summary="Update a vendor training record")
def update_vendor_training(
    id: int = Path(..., gt=0), 
    data: VendorTrainingUpdate = None, 
    db: Session = Depends(get_db), 
    user: TeamRoster = Depends(vendor_owner_or_admin)
):
    """
    Update an existing vendor training record.
    
    This endpoint updates a vendor training record with the provided data.
    Users can only update their own records.
    """
    existing_record = vendor_training.get(db, id)
    if not existing_record:
        raise HTTPException(status_code=404, detail="Vendor training record not found")
    
    # Ensure users can only update their own records
    if user.team_role != "ADMIN" and data.operator_name != user.name:
        raise HTTPException(
            status_code=403,
            detail="You can only update your own records"
        )
    
    return vendor_training.update(db, existing_record, data)

@router.delete("/vendor/{id}", summary="Delete a vendor training record")
def delete_vendor_training(
    id: int = Path(..., gt=0), 
    db: Session = Depends(get_db), 
    user: TeamRoster = Depends(vendor_owner_or_admin)
):
    """
    Delete a vendor training record.
    
    This endpoint deletes a vendor training record with the specified ID.
    Users can only delete their own records.
    """
    existing_record = vendor_training.get(db, id)
    if not existing_record:
        raise HTTPException(status_code=404, detail="Vendor training record not found")
    
    # Delete associated file if it exists
    delete_file(existing_record.file_url)
    
    # Delete the record
    vendor_training.delete(db, id)
    return {"message": "Vendor training record deleted successfully"}

# Skill Level History routes
@router.get("/skill-level", response_model=List[SkillLevelHistoryResponse], summary="Get all skill level history records")
def get_skill_levels(
    db: Session = Depends(get_db), 
    user: TeamRoster = Depends(get_current_user)
):
    """
    Retrieve all skill level history records.
    
    This endpoint returns a list of all skill level history records in the system.
    """
    return skill_level_history.get_all(db)

@router.post("/skill-level", response_model=SkillLevelHistoryResponse, summary="Create a skill level history record")
def create_skill_level(
    data: SkillLevelHistoryUpdate, 
    db: Session = Depends(get_db), 
    user: TeamRoster = Depends(get_current_user)
):
    """
    Create a new skill level history record.
    
    This endpoint creates a new skill level history record with the provided data.
    Users can only create records for themselves.
    """
    # Ensure users can only create records for themselves
    if user.team_role != "ADMIN" and data.operator_name != user.name:
        raise HTTPException(
            status_code=403,
            detail="You can only create records for yourself"
        )
    return skill_level_history.create(db, data)

@router.put("/skill-level/{id}", response_model=SkillLevelHistoryResponse, summary="Update a skill level history record")
def update_skill_level(
    id: int = Path(..., gt=0), 
    data: SkillLevelHistoryUpdate = None, 
    db: Session = Depends(get_db), 
    user: TeamRoster = Depends(skill_level_owner_or_admin)
):
    """
    Update an existing skill level history record.
    
    This endpoint updates a skill level history record with the provided data.
    Users can only update their own records.
    """
    existing_record = skill_level_history.get(db, id)
    if not existing_record:
        raise HTTPException(status_code=404, detail="Skill level history record not found")
    
    # Ensure users can only update their own records
    if user.team_role != "ADMIN" and data.operator_name != user.name:
        raise HTTPException(
            status_code=403,
            detail="You can only update your own records"
        )
    
    return skill_level_history.update(db, existing_record, data)

@router.delete("/skill-level/{id}", summary="Delete a skill level history record")
def delete_skill_level(
    id: int = Path(..., gt=0), 
    db: Session = Depends(get_db), 
    user: TeamRoster = Depends(skill_level_owner_or_admin)
):
    """
    Delete a skill level history record.
    
    This endpoint deletes a skill level history record with the specified ID.
    Users can only delete their own records.
    """
    existing_record = skill_level_history.get(db, id)
    if not existing_record:
        raise HTTPException(status_code=404, detail="Skill level history record not found")
    
    # Delete associated file if it exists
    delete_file(existing_record.signed_memo_url)
    
    # Delete the record
    skill_level_history.delete(db, id)
    return {"message": "Skill level history record deleted successfully"}

router.include_router(red_team_training_router, prefix="/red-team", tags=["red-team-training"])
