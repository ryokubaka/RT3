from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from ..models import QuestionCategory
from ..schemas import QuestionCategoryCreate

def get_all(db: Session) -> List[QuestionCategory]:
    """Get all question categories."""
    return db.query(QuestionCategory).order_by(QuestionCategory.name).all()

def get(db: Session, category_id: int) -> Optional[QuestionCategory]:
    """Get a category by ID."""
    return db.query(QuestionCategory).filter(QuestionCategory.id == category_id).first()

def get_by_name(db: Session, name: str) -> Optional[QuestionCategory]:
    """Get a category by name."""
    return db.query(QuestionCategory).filter(QuestionCategory.name == name).first()

def create(db: Session, category_data: QuestionCategoryCreate) -> QuestionCategory:
    """Create a new category."""
    db_category = QuestionCategory(
        name=category_data.name
    )
    db.add(db_category)
    db.commit()
    db.refresh(db_category)
    return db_category

def get_or_create(db: Session, name: str) -> QuestionCategory:
    """Get an existing category by name or create a new one."""
    print(f"Looking for category with name: {name}")  # Debug logging
    existing = get_by_name(db, name)
    if existing:
        print(f"Found existing category: {existing.__dict__}")  # Debug logging
        return existing
    
    print(f"Creating new category with name: {name}")  # Debug logging
    new_category = QuestionCategory(name=name)
    db.add(new_category)
    db.flush()  # Flush to get the ID
    print(f"Created new category: {new_category.__dict__}")  # Debug logging
    return new_category 