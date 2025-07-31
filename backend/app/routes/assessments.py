from fastapi import APIRouter, Depends, HTTPException, Path, File, UploadFile, Form, Request
from sqlalchemy.orm import Session
from typing import List, Any, Optional
from datetime import datetime
import base64
from fastapi.responses import JSONResponse
import logging

from ..dependencies import get_db, get_current_user_dependency as get_current_user, admin_required_dependency as admin_required
from ..models import Assessment, AssessmentQuestion, AssessmentResponse, QuestionResponse, TeamRoster, QuestionCategory
from ..schemas import (
    AssessmentCreate, AssessmentUpdate, AssessmentResponse as AssessmentResponseSchema,
    AssessmentResponseCreate, AssessmentResponseUpdate, AssessmentResponseResponse,
    QuestionResponseCreate, QuestionResponseUpdate, QuestionCategoryResponse, AssessmentCSVImport,
    QuestionUpdate, QuestionCreate, QuestionReorder
)
from ..crud import assessment, assessment_response, category

router = APIRouter(prefix="/assessments", tags=["assessments"])

logger = logging.getLogger(__name__)

@router.get("", response_model=List[AssessmentResponseSchema])
def get_assessments(
    db: Session = Depends(get_db),
    user: TeamRoster = Depends(get_current_user)
):
    """Get all active assessments."""
    return assessment.get_all_active(db)

@router.get("/my-responses", response_model=List[AssessmentResponseResponse])
def get_my_responses(
    db: Session = Depends(get_db),
    user: TeamRoster = Depends(get_current_user)
):
    """Get all responses for the current user."""
    return assessment_response.get_by_operator(db, user.id)

@router.get("/categories", response_model=List[QuestionCategoryResponse])
def get_categories(
    db: Session = Depends(get_db),
    user: TeamRoster = Depends(get_current_user)
):
    """Get all question categories."""
    return category.get_all(db)

def process_question_category(db: Session, question_data: dict) -> int:
    """Process the category for a question, creating it if needed."""
    if question_data.get('category_id'):
        return question_data['category_id']
    elif question_data.get('category_name'):
        cat = category.get_or_create(db, question_data['category_name'])
        return cat.id
    return None

@router.post("", response_model=AssessmentResponseSchema)
def create_assessment(
    assessment_data: AssessmentCreate,
    db: Session = Depends(get_db),
    user: TeamRoster = Depends(admin_required)
):
    """Create a new assessment. Only admins can create assessments."""
    # Process categories for each question
    for question in assessment_data.questions:
        question_dict = question.model_dump()
        category_id = process_question_category(db, question_dict)
        question.category_id = category_id
    return assessment.create(db, assessment_data, user.id)

@router.get("/{id}", response_model=AssessmentResponseSchema)
def get_assessment(
    id: int = Path(..., gt=0),
    db: Session = Depends(get_db),
    user: TeamRoster = Depends(get_current_user)
):
    """Get a specific assessment by ID."""
    result = assessment.get(db, id)
    if not result:
        raise HTTPException(status_code=404, detail="Assessment not found")
    return result

@router.put("/{id}", response_model=AssessmentResponseSchema)
def update_assessment(
    assessment_data: AssessmentUpdate,
    id: int = Path(..., gt=0),
    db: Session = Depends(get_db),
    user: TeamRoster = Depends(admin_required)
):
    """Update an assessment. Only admins can update assessments."""
    # Process categories for each question if questions are provided
    if assessment_data.questions:
        for question in assessment_data.questions:
            question_dict = question.model_dump()
            category_id = process_question_category(db, question_dict)
            question.category_id = category_id
    
    result = assessment.update(db, id, assessment_data)
    if not result:
        raise HTTPException(status_code=404, detail="Assessment not found")
    return result

@router.patch("/{id}", response_model=AssessmentResponseSchema)
def partial_update_assessment(
    assessment_data: AssessmentUpdate,
    id: int = Path(..., gt=0),
    db: Session = Depends(get_db),
    user: TeamRoster = Depends(admin_required)
):
    """Partially update an assessment. Only admins can update assessments."""
    # Process categories for each question if questions are provided
    if assessment_data.questions:
        for question in assessment_data.questions:
            question_dict = question.model_dump()
            category_id = process_question_category(db, question_dict)
            question.category_id = category_id
    
    result = assessment.update(db, id, assessment_data)
    if not result:
        raise HTTPException(status_code=404, detail="Assessment not found")
    return result

@router.delete("/{id}")
def delete_assessment(
    id: int = Path(..., gt=0),
    db: Session = Depends(get_db),
    user: TeamRoster = Depends(admin_required)
):
    """Delete an assessment. Only admins can delete assessments."""
    existing = assessment.get(db, id)
    if not existing:
        raise HTTPException(status_code=404, detail="Assessment not found")
    assessment.delete(db, id)
    return {"message": "Assessment deleted successfully"}

@router.get("/{id}/responses", response_model=List[AssessmentResponseResponse])
def get_assessment_responses(
    id: int = Path(..., gt=0),
    db: Session = Depends(get_db),
    user: TeamRoster = Depends(admin_required)
):
    """Get all responses for a specific assessment. Only admins can view all responses."""
    # Verify assessment exists
    existing = assessment.get(db, id)
    if not existing:
        raise HTTPException(status_code=404, detail="Assessment not found")
    
    return assessment_response.get_by_assessment(db, id)

@router.post("/{id}/responses", response_model=AssessmentResponseResponse)
def submit_assessment_response(
    response_data: AssessmentResponseCreate,
    id: int = Path(..., gt=0),
    db: Session = Depends(get_db),
    user: TeamRoster = Depends(get_current_user)
):
    """Submit a response to an assessment."""
    # Verify assessment exists and is active
    existing = assessment.get(db, id)
    if not existing:
        raise HTTPException(status_code=404, detail="Assessment not found")
    if not existing.is_active:
        raise HTTPException(status_code=400, detail="Assessment is not active")
    
    # Check if user has already submitted a response
    existing_response = assessment_response.get_by_assessment_and_operator(db, id, user.id)
    if existing_response:
        raise HTTPException(status_code=400, detail="You have already submitted a response to this assessment")
    
    # Set the assessment_id from the path parameter
    response_data.assessment_id = id
    
    return assessment_response.create(db, id, user.id, response_data)

@router.get("/{assessment_id}/responses/{response_id}", response_model=AssessmentResponseResponse)
def get_assessment_response(
    assessment_id: int = Path(..., gt=0),
    response_id: int = Path(..., gt=0),
    db: Session = Depends(get_db),
    user: TeamRoster = Depends(get_current_user)
):
    """Get a specific assessment response."""
    # First verify the assessment exists
    assessment_obj = assessment.get(db, assessment_id)
    if not assessment_obj:
        raise HTTPException(status_code=404, detail="Assessment not found")

    # Then get the response
    result = assessment_response.get(db, response_id)
    if not result:
        raise HTTPException(status_code=404, detail="Assessment response not found")
    
    # Verify the response belongs to this assessment
    if result.assessment_id != assessment_id:
        raise HTTPException(status_code=404, detail="Assessment response not found")
    
    # Only allow admins or the response owner to view it
    if "ADMIN" not in user.team_role.upper() and result.operator_id != user.id:
        raise HTTPException(status_code=403, detail="Not authorized to view this response")
    
    return result

@router.put("/{assessment_id}/responses/{response_id}/grade", response_model=AssessmentResponseResponse)
def grade_assessment_response(
    grades: List[QuestionResponseUpdate],
    assessment_id: int = Path(..., gt=0),
    response_id: int = Path(..., gt=0),
    db: Session = Depends(get_db),
    user: TeamRoster = Depends(admin_required)
):
    """Grade an assessment response. Only admins can grade responses."""
    # First verify the assessment exists
    assessment_obj = assessment.get(db, assessment_id)
    if not assessment_obj:
        raise HTTPException(status_code=404, detail="Assessment not found")

    # Then get the response
    result = assessment_response.get(db, response_id)
    if not result:
        raise HTTPException(status_code=404, detail="Assessment response not found")
    
    # Verify the response belongs to this assessment
    if result.assessment_id != assessment_id:
        raise HTTPException(status_code=404, detail="Assessment response not found")
    
    return assessment_response.update_grades(db, response_id, grades, user.id)

@router.delete("/{assessment_id}/responses/{response_id}")
def delete_assessment_response(
    assessment_id: int = Path(..., gt=0),
    response_id: int = Path(..., gt=0),
    db: Session = Depends(get_db),
    user: TeamRoster = Depends(admin_required)
):
    """Delete an assessment response. Only admins can delete responses."""
    # First verify the assessment exists
    assessment_obj = assessment.get(db, assessment_id)
    if not assessment_obj:
        raise HTTPException(status_code=404, detail="Assessment not found")

    # Then get the response
    result = assessment_response.get(db, response_id)
    if not result:
        raise HTTPException(status_code=404, detail="Assessment response not found")
    
    # Verify the response belongs to this assessment
    if result.assessment_id != assessment_id:
        raise HTTPException(status_code=404, detail="Assessment response not found")
    
    # Delete the response
    assessment_response.delete(db, response_id)
    return {"message": "Response deleted successfully"}

@router.post("/import-csv", response_model=AssessmentResponseSchema)
def import_assessment_from_csv(
    import_data: AssessmentCSVImport,
    db: Session = Depends(get_db),
    user: TeamRoster = Depends(admin_required)
) -> Any:
    """Import an assessment from CSV data."""
    try:
        imported = assessment.import_from_csv(
            db=db,
            csv_content=import_data.csv_content,
            title=import_data.title,
            description=import_data.description,
            is_active=import_data.is_active
        )
        return imported
    except ValueError as e:
        raise HTTPException(
            status_code=400,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"An error occurred while importing the assessment: {str(e)}"
        )

@router.post("/{assessment_id}/import-questions", response_model=AssessmentResponseSchema)
async def import_questions_to_assessment(
    request: Request,
    assessment_id: int = Path(..., gt=0),
    db: Session = Depends(get_db),
    user: TeamRoster = Depends(admin_required)
):
    """Import questions from a CSV file into an existing assessment."""
    logger.info("Received import request for assessment %d", assessment_id)
    
    # First verify the assessment exists
    assessment_obj = assessment.get(db, assessment_id)
    if not assessment_obj:
        raise HTTPException(status_code=404, detail="Assessment not found")

    try:
        # Get the form data
        form = await request.form()
        logger.info("Received form data: %s", form)
        
        if 'file' not in form:
            raise HTTPException(
                status_code=400,
                detail="No file uploaded. Please provide a CSV file."
            )
            
        file = form['file']
        if not hasattr(file, 'filename'):
            raise HTTPException(
                status_code=400,
                detail="Invalid file upload. Please provide a CSV file."
            )

        if not file.filename.lower().endswith('.csv'):
            raise HTTPException(
                status_code=400,
                detail="Invalid file type. Please upload a CSV file."
            )

        # Read the file content
        content = await file.read()
        logger.info("Read file content of length: %d", len(content))
        
        # Convert to base64 for our existing import function
        csv_content = base64.b64encode(content).decode('utf-8')
        
        # Import the questions
        updated_assessment = assessment.import_questions_to_existing(
            db=db,
            assessment_id=assessment_id,
            csv_content=csv_content
        )
        
        return updated_assessment
    except ValueError as e:
        logger.error("ValueError during import: %s", str(e))
        raise HTTPException(
            status_code=400,
            detail=str(e)
        )
    except Exception as e:
        logger.error("Error during import: %s", str(e), exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"An error occurred while importing questions: {str(e)}"
        )

@router.post("/{assessment_id}/questions")
def create_question(
    assessment_id: int,
    question_data: QuestionCreate,
    db: Session = Depends(get_db),
    current_user: TeamRoster = Depends(get_current_user)
):
    """Add a new question to an assessment."""
    # Check if user has permission
    if not current_user.team_role == "ADMIN":
        raise HTTPException(status_code=403, detail="Not authorized to add questions")

    # Check if assessment exists
    assessment_obj = assessment.get(db, assessment_id)
    if not assessment_obj:
        raise HTTPException(status_code=404, detail="Assessment not found")

    # Process category if provided
    if question_data.category_id:
        category_obj = db.query(QuestionCategory).filter(
            QuestionCategory.id == question_data.category_id
        ).first()
        if not category_obj:
            raise HTTPException(status_code=404, detail="Category not found")

    # Create new question
    question = AssessmentQuestion(
        assessment_id=assessment_id,
        **question_data.dict()
    )
    db.add(question)
    db.commit()
    db.refresh(question)
    return question

@router.patch("/{assessment_id}/questions/reorder")
def reorder_questions(
    assessment_id: int,
    updates: QuestionReorder,
    db: Session = Depends(get_db),
    current_user: TeamRoster = Depends(get_current_user)
):
    """Reorder questions in an assessment."""
    # Check if user has permission
    if not current_user.team_role == "ADMIN":
        raise HTTPException(status_code=403, detail="Not authorized to reorder questions")

    # Check if assessment exists
    assessment_obj = assessment.get(db, assessment_id)
    if not assessment_obj:
        raise HTTPException(status_code=404, detail="Assessment not found")

    # Update order for each question
    for update in updates.updates:
        question = db.query(AssessmentQuestion).filter(
            AssessmentQuestion.id == update.id,
            AssessmentQuestion.assessment_id == assessment_id
        ).first()
        if not question:
            raise HTTPException(status_code=404, detail=f"Question {update.id} not found")
        question.order = update.order

    db.commit()
    return {"message": "Questions reordered successfully"}

@router.patch("/{assessment_id}/questions/{question_id}")
def update_question(
    assessment_id: int,
    question_id: int,
    question_data: QuestionUpdate,
    db: Session = Depends(get_db),
    current_user: TeamRoster = Depends(get_current_user)
):
    """Update a specific question in an assessment."""
    # Check if user has permission
    if not current_user.team_role == "ADMIN":
        raise HTTPException(status_code=403, detail="Not authorized to update questions")

    # Check if assessment exists and belongs to user
    assessment_obj = assessment.get(db, assessment_id)
    if not assessment_obj:
        raise HTTPException(status_code=404, detail="Assessment not found")

    # Check if question exists and belongs to assessment
    question = db.query(AssessmentQuestion).filter(
        AssessmentQuestion.id == question_id,
        AssessmentQuestion.assessment_id == assessment_id
    ).first()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")

    # Process category if provided
    if question_data.category_id:
        category_obj = db.query(QuestionCategory).filter(
            QuestionCategory.id == question_data.category_id
        ).first()
        if not category_obj:
            raise HTTPException(status_code=404, detail="Category not found")

    # Update question fields
    for key, value in question_data.dict(exclude_unset=True).items():
        setattr(question, key, value)

    db.commit()
    db.refresh(question)
    return question

@router.delete("/{assessment_id}/questions/{question_id}")
def delete_question(
    assessment_id: int,
    question_id: int,
    db: Session = Depends(get_db),
    current_user: TeamRoster = Depends(get_current_user)
):
    """Delete a specific question from an assessment."""
    # Check if user has permission
    if not current_user.team_role == "ADMIN":
        raise HTTPException(status_code=403, detail="Not authorized to delete questions")

    # Check if assessment exists
    assessment_obj = assessment.get(db, assessment_id)
    if not assessment_obj:
        raise HTTPException(status_code=404, detail="Assessment not found")

    # Check if question exists and belongs to assessment
    question = db.query(AssessmentQuestion).filter(
        AssessmentQuestion.id == question_id,
        AssessmentQuestion.assessment_id == assessment_id
    ).first()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")

    db.delete(question)
    db.commit()
    return {"message": "Question deleted successfully"} 