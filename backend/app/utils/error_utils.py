from fastapi import HTTPException
from typing import Optional, Dict, Any
import traceback
import logging

# Configure logging
logger = logging.getLogger(__name__)

class AppError(Exception):
    """Base custom error class for application-specific errors"""
    def __init__(
        self, 
        message: str, 
        status_code: int = 500, 
        details: Optional[Dict[str, Any]] = None
    ):
        self.message = message
        self.status_code = status_code
        self.details = details or {}
        super().__init__(self.message)


def handle_db_error(error: Exception, operation: str, resource: str) -> HTTPException:
    """
    Handle database operation errors consistently
    
    Args:
        error: The exception that was raised
        operation: The operation being performed (create, read, update, delete)
        resource: The resource being operated on
        
    Returns:
        HTTPException with appropriate error details
    """
    # Log the error with stack trace
    logger.error(f"Database error during {operation} on {resource}: {str(error)}")
    logger.debug(traceback.format_exc())
    
    # Return a standardized HTTP exception
    return HTTPException(
        status_code=500,
        detail=f"Error during {operation} of {resource}: {str(error)}"
    )


def handle_validation_error(
    message: str, 
    field: Optional[str] = None, 
    value: Optional[Any] = None
) -> HTTPException:
    """
    Handle validation errors consistently
    
    Args:
        message: The error message
        field: Optional field name that failed validation
        value: Optional invalid value
        
    Returns:
        HTTPException with validation error details
    """
    detail = {"message": message}
    
    if field:
        detail["field"] = field
    
    if value is not None:
        detail["value"] = value
    
    return HTTPException(status_code=422, detail=detail)


def handle_not_found(resource: str, resource_id: Any) -> HTTPException:
    """
    Handle resource not found errors consistently
    
    Args:
        resource: The type of resource that wasn't found
        resource_id: The ID or identifier of the resource
        
    Returns:
        HTTPException with not found error details
    """
    return HTTPException(
        status_code=404,
        detail=f"{resource} with id {resource_id} not found"
    )


def handle_permission_error(message: str) -> HTTPException:
    """
    Handle permission/authorization errors consistently
    
    Args:
        message: The error message explaining the permission issue
        
    Returns:
        HTTPException with permission error details
    """
    return HTTPException(
        status_code=403,
        detail=message
    ) 