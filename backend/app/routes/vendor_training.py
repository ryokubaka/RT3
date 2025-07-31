from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import SessionLocal
from ..models import VendorTraining
from ..schemas import VendorTrainingResponse, VendorTrainingCreate, VendorTrainingUpdate
from ..auth import get_current_user

router = APIRouter()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("", response_model=list[VendorTrainingResponse])
def get_vendor_training(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    training = db.query(VendorTraining).offset(skip).limit(limit).all()
    return training

@router.post("", response_model=VendorTrainingResponse)
def create_vendor_training(
    training: VendorTrainingCreate,
    db: Session = Depends(get_db)
):
    db_training = VendorTraining(**training.model_dump())
    db.add(db_training)
    db.commit()
    db.refresh(db_training)
    return db_training

@router.get("/{training_id}", response_model=VendorTrainingResponse)
def get_vendor_training_by_id(
    training_id: int,
    db: Session = Depends(get_db)
):
    training = db.query(VendorTraining).filter(VendorTraining.id == training_id).first()
    if not training:
        raise HTTPException(status_code=404, detail="Training not found")
    return training

@router.put("/{training_id}", response_model=VendorTrainingResponse)
def update_vendor_training(
    training_id: int,
    training: VendorTrainingUpdate,
    db: Session = Depends(get_db)
):
    db_training = db.query(VendorTraining).filter(VendorTraining.id == training_id).first()
    if not db_training:
        raise HTTPException(status_code=404, detail="Training not found")
    
    for key, value in training.model_dump(exclude_unset=True).items():
        setattr(db_training, key, value)
    
    db.commit()
    db.refresh(db_training)
    return db_training

@router.delete("/{training_id}")
def delete_vendor_training(
    training_id: int,
    db: Session = Depends(get_db)
):
    training = db.query(VendorTraining).filter(VendorTraining.id == training_id).first()
    if not training:
        raise HTTPException(status_code=404, detail="Training not found")
    
    db.delete(training)
    db.commit()
    return {"message": "Training deleted successfully"} 