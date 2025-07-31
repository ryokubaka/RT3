from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import SessionLocal
from ..models import Certification
from ..schemas import CertificationResponse, CertificationCreate, CertificationUpdate
from ..auth import get_current_user

router = APIRouter()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("", response_model=list[CertificationResponse])
def get_certifications(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    certifications = db.query(Certification).offset(skip).limit(limit).all()
    return certifications

@router.post("", response_model=CertificationResponse)
def create_certification(
    certification: CertificationCreate,
    db: Session = Depends(get_db)
):
    db_certification = Certification(**certification.model_dump())
    db.add(db_certification)
    db.commit()
    db.refresh(db_certification)
    return db_certification

@router.get("/{certification_id}", response_model=CertificationResponse)
def get_certification_by_id(
    certification_id: int,
    db: Session = Depends(get_db)
):
    certification = db.query(Certification).filter(Certification.id == certification_id).first()
    if not certification:
        raise HTTPException(status_code=404, detail="Certification not found")
    return certification

@router.put("/{certification_id}", response_model=CertificationResponse)
def update_certification(
    certification_id: int,
    certification: CertificationUpdate,
    db: Session = Depends(get_db)
):
    db_certification = db.query(Certification).filter(Certification.id == certification_id).first()
    if not db_certification:
        raise HTTPException(status_code=404, detail="Certification not found")
    
    for key, value in certification.model_dump(exclude_unset=True).items():
        setattr(db_certification, key, value)
    
    db.commit()
    db.refresh(db_certification)
    return db_certification

@router.delete("/{certification_id}")
def delete_certification(
    certification_id: int,
    db: Session = Depends(get_db)
):
    certification = db.query(Certification).filter(Certification.id == certification_id).first()
    if not certification:
        raise HTTPException(status_code=404, detail="Certification not found")
    
    db.delete(certification)
    db.commit()
    return {"message": "Certification deleted successfully"} 