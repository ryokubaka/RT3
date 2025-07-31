from typing import Any, Dict, Generic, List, Optional, Type, TypeVar, Union
from sqlalchemy.orm import Session
from fastapi import HTTPException
from pydantic import BaseModel

ModelType = TypeVar("ModelType")
CreateSchemaType = TypeVar("CreateSchemaType", bound=BaseModel)
UpdateSchemaType = TypeVar("UpdateSchemaType", bound=BaseModel)

class CRUDBase(Generic[ModelType, CreateSchemaType, UpdateSchemaType]):
    """
    Base class for CRUD operations on a database model
    """
    def __init__(self, model: Type[ModelType]):
        self.model = model

    def get(self, db: Session, id: int) -> Optional[ModelType]:
        """
        Get a record by ID
        """
        return db.query(self.model).filter(self.model.id == id).first()

    def get_all(self, db: Session) -> List[ModelType]:
        """
        Get all records
        """
        return db.query(self.model).all()
    
    def get_multi_by_attribute(self, db: Session, attr_name: str, attr_value: Any) -> List[ModelType]:
        """
        Get multiple records by a specific attribute
        """
        return db.query(self.model).filter(getattr(self.model, attr_name) == attr_value).all()

    def create(self, db: Session, obj_in: CreateSchemaType) -> ModelType:
        """
        Create a new record
        """
        obj_in_data = obj_in.dict() if hasattr(obj_in, "dict") else obj_in
        db_obj = self.model(**obj_in_data)
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def update(self, db: Session, db_obj: ModelType, obj_in: Union[UpdateSchemaType, Dict[str, Any]]) -> ModelType:
        """
        Update a record
        """
        obj_data = db_obj.__dict__
        if isinstance(obj_in, dict):
            update_data = obj_in
        else:
            update_data = obj_in.dict(exclude_unset=True)
        
        for field in obj_data:
            if field in update_data:
                setattr(db_obj, field, update_data[field])
        
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def delete(self, db: Session, id: int) -> bool:
        """
        Delete a record
        """
        obj = db.query(self.model).filter(self.model.id == id).first()
        if obj:
            db.delete(obj)
            db.commit()
            return True
        return False

def get_object_or_404(db: Session, model: Type[ModelType], id: int, detail: str = "Record not found") -> ModelType:
    """
    Get an object by ID or raise a 404 exception
    """
    obj = db.query(model).filter(model.id == id).first()
    if not obj:
        raise HTTPException(status_code=404, detail=detail)
    return obj

def update_document_url(db: Session, model: Type[ModelType], id: int, url_field: str, url_value: str) -> Optional[ModelType]:
    """
    Update the document URL field of a record
    
    Args:
        db: Database session
        model: Model class
        id: Record ID
        url_field: Field name to update
        url_value: New URL value
        
    Returns:
        Updated object or None if not found
    """
    obj = db.query(model).filter(model.id == id).first()
    if obj:
        setattr(obj, url_field, url_value)
        db.commit()
        db.refresh(obj)
    return obj 