from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import SessionLocal
from ..models import SkillLevelHistory
from ..schemas import SkillLevelHistoryResponse, SkillLevelHistoryCreate, SkillLevelHistoryUpdate
from ..auth import get_current_user

router = APIRouter()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("", response_model=list[SkillLevelHistoryResponse])
def get_skill_level_history(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    history = db.query(SkillLevelHistory).offset(skip).limit(limit).all()
    return history

@router.post("", response_model=SkillLevelHistoryResponse)
def create_skill_level_history(
    history: SkillLevelHistoryCreate,
    db: Session = Depends(get_db)
):
    db_history = SkillLevelHistory(**history.model_dump())
    db.add(db_history)
    db.commit()
    db.refresh(db_history)
    return db_history

@router.get("/{history_id}", response_model=SkillLevelHistoryResponse)
def get_skill_level_history_by_id(
    history_id: int,
    db: Session = Depends(get_db)
):
    history = db.query(SkillLevelHistory).filter(SkillLevelHistory.id == history_id).first()
    if not history:
        raise HTTPException(status_code=404, detail="History record not found")
    return history

@router.put("/{history_id}", response_model=SkillLevelHistoryResponse)
def update_skill_level_history(
    history_id: int,
    history: SkillLevelHistoryUpdate,
    db: Session = Depends(get_db)
):
    db_history = db.query(SkillLevelHistory).filter(SkillLevelHistory.id == history_id).first()
    if not db_history:
        raise HTTPException(status_code=404, detail="History record not found")
    
    for key, value in history.model_dump(exclude_unset=True).items():
        setattr(db_history, key, value)
    
    db.commit()
    db.refresh(db_history)
    return db_history

@router.delete("/{history_id}")
def delete_skill_level_history(
    history_id: int,
    db: Session = Depends(get_db)
):
    history = db.query(SkillLevelHistory).filter(SkillLevelHistory.id == history_id).first()
    if not history:
        raise HTTPException(status_code=404, detail="History record not found")
    
    db.delete(history)
    db.commit()
    return {"message": "History record deleted successfully"} 