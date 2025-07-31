from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from fastapi import HTTPException

from ..models import AssessmentResponse, QuestionResponse, AssessmentQuestion
from ..schemas import AssessmentResponseCreate, AssessmentResponseUpdate, QuestionResponseCreate, QuestionResponseUpdate

def get(db: Session, response_id: int) -> Optional[AssessmentResponse]:
    """Get an assessment response by ID."""
    return db.query(AssessmentResponse).filter(AssessmentResponse.id == response_id).first()

def get_by_operator(db: Session, operator_id: int) -> List[AssessmentResponse]:
    """Get all responses for a specific operator."""
    return db.query(AssessmentResponse).filter(AssessmentResponse.operator_id == operator_id).all()

def get_by_assessment_and_operator(db: Session, assessment_id: int, operator_id: int) -> Optional[AssessmentResponse]:
    """Get a response for a specific assessment and operator."""
    return db.query(AssessmentResponse).filter(
        AssessmentResponse.assessment_id == assessment_id,
        AssessmentResponse.operator_id == operator_id
    ).first()

def create(db: Session, assessment_id: int, operator_id: int, response_data: AssessmentResponseCreate) -> AssessmentResponse:
    """Create a new assessment response."""
    # Create response
    db_response = AssessmentResponse(
        assessment_id=assessment_id,
        operator_id=operator_id,
        started_at=datetime.utcnow(),
        completed_at=datetime.utcnow(),
        status="pending_review"
    )
    db.add(db_response)
    db.flush()  # Flush to get the response ID

    # Calculate initial score for multiple choice questions
    total_score = 0
    total_points = 0

    # Create question responses
    for qr_data in response_data.question_responses:
        # Get the question to check if it's multiple choice and get points
        question = db.query(AssessmentQuestion).filter(AssessmentQuestion.id == qr_data.question_id).first()
        if not question:
            continue

        is_correct = None
        if question.question_type == "multiple_choice" and question.correct_answer:
            is_correct = qr_data.answer.strip().lower() == question.correct_answer.strip().lower()
            if is_correct:
                total_score += question.points
        total_points += question.points

        db_question_response = QuestionResponse(
            assessment_response_id=db_response.id,
            question_id=qr_data.question_id,
            answer=qr_data.answer,
            is_correct=is_correct
        )
        db.add(db_question_response)

    # Update response with initial score
    db_response.score = total_score
    db_response.final_score = total_score if all(qr.is_correct is not None for qr in db_response.question_responses) else None

    db.commit()
    db.refresh(db_response)
    return db_response

def update_grades(db: Session, response_id: int, grades: List[QuestionResponseUpdate], grader_id: int) -> AssessmentResponse:
    """Update the grades for an assessment response."""
    response = get(db, response_id)
    if not response:
        raise HTTPException(status_code=404, detail="Assessment response not found")

    # Update each question response with the provided grades
    total_score = 0
    total_possible = 0
    
    # First pass: update grades and calculate totals
    for grade in grades:
        # Find the matching question response
        question_response = next(
            (qr for qr in response.question_responses if qr.question_id == grade.question_id),
            None
        )
        if not question_response:
            continue

        # Update the grade
        question_response.points_awarded = grade.points_awarded
        question_response.feedback = grade.feedback
        
        # Add to totals
        if grade.points_awarded is not None:
            total_score += grade.points_awarded
        if question_response.question.points is not None:
            total_possible += question_response.question.points

    # Calculate final score as a percentage
    final_score = round((total_score / total_possible) * 100) if total_possible > 0 else 0

    # Update the response
    response.score = total_score  # Store raw score
    response.final_score = final_score  # Store percentage
    response.grader_id = grader_id
    response.graded_at = datetime.utcnow()
    response.status = "graded"

    db.commit()
    db.refresh(response)
    return response

def get_by_assessment(db: Session, assessment_id: int) -> List[AssessmentResponse]:
    """Get all responses for a specific assessment."""
    return db.query(AssessmentResponse).filter(AssessmentResponse.assessment_id == assessment_id).all()

def delete(db: Session, response_id: int) -> None:
    """Delete an assessment response."""
    response = get(db, response_id)
    if not response:
        raise HTTPException(status_code=404, detail="Assessment response not found")
    
    # Delete all question responses first
    for question_response in response.question_responses:
        db.delete(question_response)
    
    # Then delete the response itself
    db.delete(response)
    db.commit() 