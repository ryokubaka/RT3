from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import Optional

from ..auth import get_current_user
from ..database import SessionLocal
from ..models import RedTeamTraining, Certification, VendorTraining, SkillLevelHistory
from ..utils.file_utils import save_uploaded_file, delete_file
from ..utils.constants import VALID_DOCUMENT_TYPES, DOCUMENT_URL_FIELD_MAP
from ..utils.db_utils import update_document_url

router = APIRouter(prefix="/document", tags=["documents"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post("/upload", summary="Upload a document")
async def upload_document(
    file: UploadFile = File(...),
    document_type: str = Form(...),
    operator_name: str = Form(...),
    record_id: Optional[int] = Form(None),
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    """
    Upload a document for training records.
    
    Args:
        file: The file to upload
        document_type: Type of document (red_team, certification, vendor, skill_level)
        operator_name: Name of the operator
        record_id: ID of the record to attach the document to
    """
    # Validate document type
    if document_type not in VALID_DOCUMENT_TYPES:
        raise HTTPException(status_code=400, detail="Invalid document type")
    
    # Check if user has permission to upload for this operator
    if user.team_role != "ADMIN" and user.name != operator_name:
        raise HTTPException(status_code=403, detail="You can only upload documents for your own records")
    
    # Save the file and get the relative path
    relative_path = save_uploaded_file(file, operator_name, document_type)
    
    # Update the record in the database with the file URL if record_id is provided
    if record_id:
        model_map = {
            "red_team": RedTeamTraining,
            "certification": Certification,
            "vendor": VendorTraining,
            "skill_level": SkillLevelHistory
        }
        
        url_field = DOCUMENT_URL_FIELD_MAP.get(document_type)
        if url_field and document_type in model_map:
            update_document_url(db, model_map[document_type], record_id, url_field, relative_path)
    
    # Return the file information
    return {
        "file_url": relative_path,
        "filename": file.filename
    }


@router.delete("", summary="Delete a document")
async def delete_document(
    document_type: str,
    operator_name: str,
    record_id: int,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    """
    Delete a document and remove the reference from the database.
    
    Args:
        document_type: Type of document (red_team, certification, vendor, skill_level)
        operator_name: Name of the operator
        record_id: ID of the record the document is attached to
    """
    # Validate document type
    if document_type not in VALID_DOCUMENT_TYPES:
        raise HTTPException(status_code=400, detail="Invalid document type")
    
    # Check if user has permission to delete for this operator
    if user.team_role != "ADMIN" and user.name != operator_name:
        raise HTTPException(status_code=403, detail="You can only delete documents from your own records")
    
    # Get the record and file URL
    file_url = None
    model_map = {
        "red_team": RedTeamTraining,
        "certification": Certification,
        "vendor": VendorTraining,
        "skill_level": SkillLevelHistory
    }
    
    if document_type not in model_map:
        raise HTTPException(status_code=400, detail="Invalid document type")
    
    record = db.query(model_map[document_type]).filter(model_map[document_type].id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")
    
    # Get the URL field based on document type
    url_field = DOCUMENT_URL_FIELD_MAP.get(document_type)
    if not url_field:
        raise HTTPException(status_code=400, detail="Invalid document type")
    
    # Get the file URL and clear it from the record
    file_url = getattr(record, url_field)
    setattr(record, url_field, None)
    db.commit()
    
    # Delete the file from disk if it exists
    delete_file(file_url)
    
    return {"message": "Document deleted successfully"} 