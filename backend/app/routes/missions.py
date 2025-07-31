from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..auth import admin_required, get_current_user
from ..database import SessionLocal
from ..models import Mission
from ..schemas import MissionResponse, MissionUpdate, MissionBase

router = APIRouter()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("", response_model=MissionResponse)
def create_mission(mission_data: MissionBase, db: Session = Depends(get_db), user: dict = Depends(admin_required)):
    mission = Mission(**mission_data.model_dump())
    db.add(mission)
    db.commit()
    db.refresh(mission)
    return mission

@router.get("", response_model=list[MissionResponse])
def get_missions(db: Session = Depends(get_db)):
    return db.query(Mission).all()

@router.get("/count", response_model=dict)
def get_missions_count(db: Session = Depends(get_db)):
    count = db.query(Mission).count()
    return {"count": count}

@router.get("/{id}", response_model=MissionResponse)
def get_mission(id: int, db: Session = Depends(get_db)):
    mission = db.query(Mission).filter(Mission.id == id).first()
    if not mission:
        raise HTTPException(status_code=404, detail="Mission not found")
    return mission

@router.put("/{id}", response_model=MissionResponse)
def update_mission(id: int, mission_data: MissionUpdate, db: Session = Depends(get_db), user: dict = Depends(admin_required)):
    mission = db.query(Mission).filter(Mission.id == id).first()
    if not mission:
        raise HTTPException(status_code=404, detail="Mission not found")
    mission.mission = mission_data.mission
    mission.team_lead = mission_data.team_lead
    mission.mission_lead = mission_data.mission_lead
    mission.rep = mission_data.rep
    mission.remote_operators = mission_data.remote_operators
    mission.local_operators = mission_data.local_operators
    mission.remote_operators_on_keyboard = mission_data.remote_operators_on_keyboard or ""
    mission.local_operators_on_keyboard = mission_data.local_operators_on_keyboard or ""
    mission.planner = mission_data.planner
    mission.location = mission_data.location
    db.commit()
    db.refresh(mission)
    return mission

@router.delete("/{id}")
def delete_mission(id: int, db: Session = Depends(get_db), user: dict = Depends(admin_required)):
    mission = db.query(Mission).filter(Mission.id == id).first()
    if not mission:
        raise HTTPException(status_code=404, detail="Mission not found")
    db.delete(mission)
    db.commit()
    return {"message": "Mission deleted successfully"}
