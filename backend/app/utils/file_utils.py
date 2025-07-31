import os
import shutil
import uuid
from typing import Optional

BASE_UPLOAD_DIR = "uploads"

def ensure_directory(path: str) -> None:
    """Create directory if it doesn't exist"""
    os.makedirs(path, exist_ok=True)

def get_document_path(operator_name: str, document_type: str) -> str:
    """Generate the directory path for a document"""
    operator_dir = os.path.join(BASE_UPLOAD_DIR, operator_name.replace(" ", "_"))
    training_dir = os.path.join(operator_dir, "training")
    doc_type_dir = os.path.join(training_dir, document_type)
    
    # Ensure all directory levels exist
    ensure_directory(BASE_UPLOAD_DIR)
    ensure_directory(operator_dir)
    ensure_directory(training_dir)
    ensure_directory(doc_type_dir)
    
    return doc_type_dir

def save_uploaded_file(file, operator_name: str, document_type: str) -> str:
    """
    Save an uploaded file and return the relative file path
    
    Args:
        file: The uploaded file object
        operator_name: Name of the operator
        document_type: Type of document
        
    Returns:
        Relative file path for database storage
    """
    doc_type_dir = get_document_path(operator_name, document_type)
    
    # Generate a unique filename
    file_ext = os.path.splitext(file.filename)[1]
    unique_filename = f"{uuid.uuid4()}{file_ext}"
    file_path = os.path.join(doc_type_dir, unique_filename)
    
    # Save the file
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # Return the path relative to the uploads directory
    return f"/{os.path.relpath(file_path, BASE_UPLOAD_DIR)}"

def delete_file(file_url: Optional[str]) -> bool:
    """
    Delete file from disk
    
    Args:
        file_url: The relative URL of the file
        
    Returns:
        True if file was deleted, False otherwise
    """
    if not file_url:
        return False
    
    try:
        # Handle file paths correctly - file_url may start with / but not /uploads
        full_path = os.path.join(os.getcwd(), BASE_UPLOAD_DIR, file_url.lstrip('/'))
        
        if os.path.exists(full_path):
            os.remove(full_path)
            return True
    except Exception as e:
        # Log the error
        print(f"Error deleting file: {str(e)}")
    
    return False 