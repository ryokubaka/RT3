from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from ..database import SessionLocal
from ..models import Image, ImageType, TeamRoster
from ..auth import get_current_user
import os
import uuid
from datetime import datetime
from fastapi.responses import FileResponse
from pathlib import Path
from fastapi import status

router = APIRouter()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

UPLOAD_DIR = "uploads"
if not os.path.exists(UPLOAD_DIR):
    os.makedirs(UPLOAD_DIR)

@router.post("/upload/")
async def upload_image(
    file: UploadFile = File(...),
    image_type: str = Form(...),
    db: Session = Depends(get_db),
    current_user: TeamRoster = Depends(get_current_user)
):
    # Validate file type
    if not file.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    # Validate and convert image_type
    try:
        image_type = ImageType(image_type)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid image type. Must be one of: {[t.value for t in ImageType]}")
    
    # Generate unique filename
    file_extension = os.path.splitext(file.filename)[1]
    unique_filename = f"{uuid.uuid4()}{file_extension}"
    
    # Create year/month subdirectories
    current_date = datetime.now()
    year_month_dir = os.path.join(UPLOAD_DIR, str(current_date.year), str(current_date.month))
    if not os.path.exists(year_month_dir):
        os.makedirs(year_month_dir)
    
    # Save file
    file_path = os.path.join(year_month_dir, unique_filename)
    with open(file_path, "wb") as buffer:
        content = await file.read()
        buffer.write(content)
    
    # Create database record
    db_image = Image(
        filename=unique_filename,
        file_path=file_path,
        content_type=file.content_type,
        image_type=image_type,
        uploaded_by=current_user.id
    )
    db.add(db_image)
    db.commit()
    db.refresh(db_image)
    
    # Get the relative path for the URL
    relative_path = os.path.relpath(file_path, UPLOAD_DIR)
    
    return {
        "id": db_image.id,
        "filename": db_image.filename,
        "content_type": db_image.content_type,
        "image_type": db_image.image_type,
        "url": f"/api/images/{db_image.id}",
        "direct_url": f"/uploads/{relative_path.replace(os.sep, '/')}"
    }

@router.post("/dashboard/upload")
async def upload_dashboard_image(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: TeamRoster = Depends(get_current_user)
):
    # Create uploads/dashboard directory structure
    upload_dir = Path("uploads/dashboard")
    upload_dir.mkdir(exist_ok=True, parents=True)
    
    # Generate unique filename
    file_extension = os.path.splitext(file.filename)[1]
    unique_filename = f"{uuid.uuid4()}{file_extension}"
    file_path = upload_dir / unique_filename
    
    # Save the file
    try:
        with open(file_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")
    
    # Create image record in database
    image = Image(
        filename=unique_filename,
        file_path=str(file_path),
        content_type=file.content_type,
        image_type=ImageType.dashboard,
        uploaded_by=current_user.id,
        is_active=True
    )
    db.add(image)
    db.commit()
    db.refresh(image)
    
    return {
        "id": image.id,
        "direct_url": f"/uploads/dashboard/{unique_filename}"
    }

@router.post("/dashboard/{image_id}/set-active")
async def set_active_dashboard_image(
    image_id: int,
    db: Session = Depends(get_db),
    current_user: TeamRoster = Depends(get_current_user)
):
    if "ADMIN" not in current_user.team_role.upper():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can set dashboard images"
        )

    # Try to find image by ID first
    try:
        numeric_id = int(image_id)
        image = db.query(Image).filter(Image.id == numeric_id).first()
    except ValueError:
        # If ID is not numeric, try to find by UUID from filename
        image = db.query(Image).filter(
            Image.filename.startswith(f"{image_id}")
        ).first()

    if not image:
        raise HTTPException(status_code=404, detail="Image not found")
    
    if image.image_type != ImageType.dashboard:
        raise HTTPException(status_code=400, detail="Image must be a dashboard image")

    # Set all dashboard images to inactive
    db.query(Image).filter(Image.image_type == ImageType.dashboard).update({"is_active": False})
    
    # Set the selected image as active
    image.is_active = True
    db.commit()
    
    return {
        "id": image.id,
        "direct_url": f"/uploads/dashboard/{image.filename}"
    }

@router.get("/dashboard")
async def get_dashboard_images(db: Session = Depends(get_db)):
    # Only return the active dashboard image
    image = db.query(Image).filter(
        Image.image_type == ImageType.dashboard,
        Image.is_active == True
    ).first()
    
    if not image:
        return []
    
    # Get the filename for the URL
    filename = os.path.basename(image.file_path)
    
    return [{
        "id": image.id,
        "filename": image.filename,
        "content_type": image.content_type,
        "image_type": image.image_type,
        "url": f"/api/images/{image.id}",
        "direct_url": f"/uploads/dashboard/{filename}"
    }]

@router.get("/{image_id}")
async def get_image(image_id: int, db: Session = Depends(get_db)):
    image = db.query(Image).filter(Image.id == image_id).first()
    if not image:
        raise HTTPException(status_code=404, detail="Image not found")
    
    if not os.path.exists(image.file_path):
        raise HTTPException(status_code=404, detail="Image file not found")
    
    return FileResponse(image.file_path, media_type=image.content_type)

@router.delete("/{image_id}")
async def delete_image(
    image_id: str,
    db: Session = Depends(get_db),
    current_user: TeamRoster = Depends(get_current_user)
):
    # Try to find image by ID first
    try:
        numeric_id = int(image_id)
        image = db.query(Image).filter(Image.id == numeric_id).first()
    except ValueError:
        # If ID is not numeric, try to find by UUID from filename
        image = db.query(Image).filter(
            Image.filename.startswith(f"{image_id}")
        ).first()

    if not image:
        raise HTTPException(status_code=404, detail="Image not found")
    
    # Only allow users to delete their own images or admins to delete any image
    if current_user.team_role != "ADMIN":
        raise HTTPException(status_code=403, detail="Not authorized to delete this image")
    
    # Delete file
    if os.path.exists(image.file_path):
        os.remove(image.file_path)
    
    # Delete database record
    db.delete(image)
    db.commit()
    
    return {"message": "Image deleted successfully"} 