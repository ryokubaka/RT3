from sqlalchemy import Column, Integer, String, Date, Enum, DateTime, ForeignKey, Text, Boolean, ARRAY, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .enums import OperatorLevel, ComplianceStatus, UserRole
import enum
from datetime import datetime

Base = declarative_base()

class ImageType(str, enum.Enum):
    avatar = "avatar"
    dashboard = "dashboard"
    mission = "mission"

class QuestionType(str, enum.Enum):
    multiple_choice = "multiple_choice"
    free_form = "free_form"

class AssessmentStatus(str, enum.Enum):
    pending_review = "pending_review"
    graded = "graded"

class TeamRoster(Base):
    __tablename__ = "team_roster"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    operator_handle = Column(String, unique=True, index=True)  # Now used as username
    team_role = Column(String)  # Stores roles as comma-separated string
    onboarding_date = Column(Date)
    operator_level = Column(Enum(OperatorLevel), default=OperatorLevel.team_member)
    compliance_8570 = Column(Enum(ComplianceStatus), default=ComplianceStatus.non_compliant)
    legal_document_status = Column(Enum(ComplianceStatus), default=ComplianceStatus.non_compliant)
    active = Column(Boolean, default=True)
    hashed_password = Column(String)
    email = Column(String, unique=True, index=True)
    avatar_id = Column(Integer, ForeignKey("images.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    avatar = relationship("Image", foreign_keys=[avatar_id], back_populates="team_roster_avatar")
    uploaded_images = relationship("Image", foreign_keys="Image.uploaded_by", back_populates="uploader")

class JQRItem(Base):
    __tablename__ = "jqr_items"
    id = Column(Integer, primary_key=True, index=True)
    task_number = Column(String)
    question = Column(String)  # Changed from title
    task_section = Column(String)
    training_status = Column(String)  # active/inactive
    apprentice = Column(Boolean, default=False)  # Changed to boolean
    journeyman = Column(Boolean, default=False)  # Changed to boolean
    master = Column(Boolean, default=False)  # Changed to boolean

class Mission(Base):
    __tablename__ = "missions"
    id = Column(Integer, primary_key=True, index=True)
    mission = Column(String)
    team_lead = Column(String)
    mission_lead = Column(String)
    rep = Column(String)
    remote_operators = Column(String)
    local_operators = Column(String)
    remote_operators_on_keyboard = Column(String)  # New field for tracking on keyboard status
    local_operators_on_keyboard = Column(String)   # New field for tracking on keyboard status
    planner = Column(String)
    location = Column(String)

class RedTeamTraining(Base):
    __tablename__ = "red_team_training"
    id = Column(Integer, primary_key=True, index=True)
    operator_name = Column(String)
    training_name = Column(String)
    training_type = Column(String)  # New field for training type
    due_date = Column(Date)
    expiration_date = Column(Date)
    date_submitted = Column(Date)
    file_url = Column(String)

class Certification(Base):
    __tablename__ = "certifications"
    id = Column(Integer, primary_key=True, index=True)
    operator_name = Column(String)
    certification_name = Column(String)
    date_acquired = Column(Date)
    training_hours = Column(Integer)
    expiration_date = Column(Date)
    file_url = Column(String)
    dod_8140 = Column(Boolean, default=False)  # New field for DoD 8140

class VendorTraining(Base):
    __tablename__ = "vendor_training"
    id = Column(Integer, primary_key=True, index=True)
    operator_name = Column(String)
    class_name = Column(String)
    start_date = Column(Date)
    end_date = Column(Date)
    hours = Column(Integer)
    location = Column(String)
    file_url = Column(String)

class SkillLevelHistory(Base):
    __tablename__ = "skill_level_history"
    id = Column(Integer, primary_key=True, index=True)
    operator_name = Column(String)
    skill_level = Column(Enum(OperatorLevel))
    date_assigned = Column(Date)
    signed_memo_url = Column(String)

class Image(Base):
    __tablename__ = "images"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, index=True)
    file_path = Column(String)
    content_type = Column(String)
    image_type = Column(Enum(ImageType))
    uploaded_by = Column(Integer, ForeignKey("team_roster.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    is_active = Column(Boolean, default=False)
    
    # Relationships
    team_roster_avatar = relationship("TeamRoster", foreign_keys="TeamRoster.avatar_id", back_populates="avatar")
    uploader = relationship("TeamRoster", foreign_keys=[uploaded_by], back_populates="uploaded_images")

class JQRTracker(Base):
    __tablename__ = "jqr_tracker"
    id = Column(Integer, primary_key=True, index=True)
    operator_name = Column(String)
    task_id = Column(Integer, ForeignKey("jqr_items.id"))
    start_date = Column(Date, nullable=True)
    completion_date = Column(Date, nullable=True)
    operator_signature = Column(String, nullable=True)
    trainer_signature = Column(String, nullable=True)
    operator_level = Column(Enum(OperatorLevel))
    task_skill_level = Column(String)  # "apprentice", "journeyman", "master"
    
    # Relationship to JQRItem
    task = relationship("JQRItem", foreign_keys=[task_id])

class Assessment(Base):
    __tablename__ = "assessments"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(Text)
    created_by = Column(Integer, ForeignKey("team_roster.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, onupdate=datetime.utcnow)
    is_active = Column(Boolean, default=True)

    # Relationships
    creator = relationship("TeamRoster", foreign_keys=[created_by])
    questions = relationship("AssessmentQuestion", back_populates="assessment", cascade="all, delete-orphan")
    responses = relationship("AssessmentResponse", back_populates="assessment", cascade="all, delete-orphan")

class QuestionCategory(Base):
    __tablename__ = "question_categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, unique=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    questions = relationship("AssessmentQuestion", back_populates="category")

class AssessmentQuestion(Base):
    __tablename__ = "assessment_questions"

    id = Column(Integer, primary_key=True, index=True)
    assessment_id = Column(Integer, ForeignKey("assessments.id"))
    category_id = Column(Integer, ForeignKey("question_categories.id"))
    question_text = Column(Text, nullable=False)
    question_type = Column(Enum(QuestionType), nullable=False)
    options = Column(JSON)  # Store options as JSON for SQLite compatibility
    correct_answer = Column(String)  # For multiple choice questions
    points = Column(Integer, default=1)
    order = Column(Integer)
    created_at = Column(DateTime, default=datetime.utcnow)  # Track when question was created

    # Relationships
    assessment = relationship("Assessment", back_populates="questions")
    category = relationship("QuestionCategory", back_populates="questions")
    responses = relationship("QuestionResponse", back_populates="question", cascade="all, delete-orphan")

class AssessmentResponse(Base):
    __tablename__ = "assessment_responses"

    id = Column(Integer, primary_key=True, index=True)
    assessment_id = Column(Integer, ForeignKey("assessments.id"))
    operator_id = Column(Integer, ForeignKey("team_roster.id"))
    started_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime)
    score = Column(Integer)  # Initial score (for multiple choice)
    final_score = Column(Integer)  # Final score after grading
    status = Column(Enum(AssessmentStatus), default=AssessmentStatus.pending_review)
    graded_by = Column(Integer, ForeignKey("team_roster.id"))
    graded_at = Column(DateTime)

    # Relationships
    assessment = relationship("Assessment", back_populates="responses")
    operator = relationship("TeamRoster", foreign_keys=[operator_id])
    grader = relationship("TeamRoster", foreign_keys=[graded_by])
    question_responses = relationship("QuestionResponse", back_populates="assessment_response", cascade="all, delete-orphan")

class QuestionResponse(Base):
    __tablename__ = "question_responses"

    id = Column(Integer, primary_key=True, index=True)
    assessment_response_id = Column(Integer, ForeignKey("assessment_responses.id"))
    question_id = Column(Integer, ForeignKey("assessment_questions.id"))
    answer = Column(Text, nullable=False)
    is_correct = Column(Boolean)  # For multiple choice questions
    points_awarded = Column(Integer)  # Points awarded after grading
    graded_by = Column(Integer, ForeignKey("team_roster.id"))
    graded_at = Column(DateTime)
    feedback = Column(Text)

    # Relationships
    assessment_response = relationship("AssessmentResponse", back_populates="question_responses")
    question = relationship("AssessmentQuestion", back_populates="responses")
    grader = relationship("TeamRoster", foreign_keys=[graded_by])
