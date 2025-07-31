from typing import Any, Dict, List, Optional, Type, TypeVar, Union
from datetime import datetime, date
from pydantic import BaseModel

ResponseType = TypeVar("ResponseType", bound=BaseModel)


def format_date(date_obj: Optional[Union[datetime, date]]) -> Optional[str]:
    """
    Format a date or datetime object to YYYY-MM-DD string format.
    
    Args:
        date_obj: The date or datetime object to format
        
    Returns:
        Formatted date string or None if input is None
    """
    if not date_obj:
        return None
    
    if isinstance(date_obj, datetime):
        return date_obj.date().isoformat()
    elif isinstance(date_obj, date):
        return date_obj.isoformat()
    else:
        return str(date_obj)


def model_to_dict(obj: Any) -> Dict[str, Any]:
    """
    Convert a database model object to a dictionary.
    
    Args:
        obj: The model object to convert
        
    Returns:
        Dictionary representation of the model
    """
    if hasattr(obj, "__table__"):
        # SQLAlchemy model
        return {c.name: getattr(obj, c.name) for c in obj.__table__.columns}
    
    # Handle non-SQLAlchemy objects
    return {k: v for k, v in obj.__dict__.items() if not k.startswith("_")}


def model_to_response(obj: Any, response_model: Type[ResponseType]) -> ResponseType:
    """
    Convert a database model object to a Pydantic response model.
    
    Args:
        obj: The model object to convert
        response_model: The Pydantic model class to convert to
        
    Returns:
        Instance of the response model
    """
    obj_dict = model_to_dict(obj)
    return response_model(**obj_dict)


def models_to_responses(
    obj_list: List[Any], 
    response_model: Type[ResponseType]
) -> List[ResponseType]:
    """
    Convert a list of database model objects to Pydantic response models.
    
    Args:
        obj_list: List of model objects to convert
        response_model: The Pydantic model class to convert to
        
    Returns:
        List of response model instances
    """
    return [model_to_response(obj, response_model) for obj in obj_list]


def format_nested_response(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Format a nested dictionary for API response with date formatting.
    
    Args:
        data: The data dictionary to format
        
    Returns:
        Formatted dictionary with ISO-formatted dates
    """
    result = {}
    
    for key, value in data.items():
        if isinstance(value, (datetime, date)):
            result[key] = format_date(value)
        elif isinstance(value, dict):
            result[key] = format_nested_response(value)
        elif isinstance(value, list):
            result[key] = [
                format_nested_response(item) if isinstance(item, dict) 
                else item 
                for item in value
            ]
        else:
            result[key] = value
            
    return result 