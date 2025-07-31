# backend/app/schemas.py
from pydantic import BaseModel, EmailStr, Field
from datetime import date, datetime
from typing import Union, Optional, List
from .enums import OperatorLevel, ComplianceStatus, UserRole
from pydantic import validator
import json
from enum import Enum

# TeamRoster Schemas
class TeamRosterBase(BaseModel):
    name: str
    operator_handle: Optional[str] = None
    email: Optional[str] = None
    team_role: Union[str, List[str]]
    onboarding_date: Optional[date] = None
    operator_level: Optional[OperatorLevel] = OperatorLevel.team_member
    compliance_8570: Optional[ComplianceStatus] = ComplianceStatus.non_compliant
    legal_document_status: Optional[ComplianceStatus] = ComplianceStatus.non_compliant
    active: bool = True
    password: Optional[str] = None

    @validator('team_role', pre=True)
    def validate_team_role(cls, v):
        if isinstance(v, list):
            return ', '.join(v)
        return v

class TeamRosterUpdate(TeamRosterBase):
    pass

class TeamRosterResponse(TeamRosterBase):
    id: int

    model_config = {"from_attributes": True}  # Pydantic V2

# JQRItem Schemas
class JQRItemBase(BaseModel):
    task_number: str
    question: str
    task_section: str
    training_status: str
    apprentice: bool
    journeyman: bool
    master: bool

class JQRItemUpdate(JQRItemBase):
    pass

class JQRItemResponse(JQRItemBase):
    id: int

    model_config = {"from_attributes": True}

# Mission Schemas
class MissionBase(BaseModel):
    mission: str
    team_lead: str
    mission_lead: str
    rep: str
    remote_operators: str
    local_operators: str
    remote_operators_on_keyboard: Optional[str] = ""
    local_operators_on_keyboard: Optional[str] = ""
    planner: str
    location: str

class MissionUpdate(MissionBase):
    pass

class MissionResponse(MissionBase):
    id: int

    model_config = {"from_attributes": True}

# Red Team Training schemas
class RedTeamTrainingBase(BaseModel):
    title: str
    description: Optional[str] = None
    date: datetime
    duration: int  # in minutes
    instructor: str
    location: Optional[str] = None
    max_participants: Optional[int] = None
    prerequisites: Optional[str] = None
    materials_needed: Optional[str] = None
    notes: Optional[str] = None

class RedTeamTrainingCreate(RedTeamTrainingBase):
    pass

class RedTeamTrainingUpdate(BaseModel):
    operator_name: str
    training_name: str
    training_type: Optional[str] = None  # New field for training type
    due_date: Optional[date] = None
    expiration_date: Optional[date] = None
    date_submitted: Optional[date] = None
    file_url: Optional[str] = None
    
    model_config = {
        "extra": "ignore",
        "validate_assignment": True
    }
    
    @validator('due_date', 'expiration_date', 'date_submitted', pre=True)
    def validate_date(cls, v):
        if v == "" or v is None:
            return None
        return v

class RedTeamTrainingResponse(RedTeamTrainingUpdate):
    id: int
    
    model_config = {"from_attributes": True}

# Certification schemas
class CertificationBase(BaseModel):
    name: str
    description: Optional[str] = None
    issuer: str
    issue_date: datetime
    expiry_date: Optional[datetime] = None
    certification_id: Optional[str] = None
    verification_url: Optional[str] = None
    notes: Optional[str] = None

class CertificationCreate(CertificationBase):
    pass

class CertificationUpdate(BaseModel):
    operator_name: str
    certification_name: str
    date_acquired: Optional[date] = None
    training_hours: Optional[int] = None
    expiration_date: Optional[date] = None
    file_url: Optional[str] = None
    dod_8140: bool = False  # New field for DoD 8140
    
    model_config = {
        "extra": "ignore",
        "validate_assignment": True
    }
    
    @validator('date_acquired', 'expiration_date', pre=True)
    def validate_date(cls, v):
        if v == "" or v is None:
            return None
        return v
    
    @validator('training_hours', pre=True)
    def validate_hours(cls, v):
        if v == "" or v is None:
            return None
        return v

class CertificationResponse(CertificationUpdate):
    id: int
    
    model_config = {"from_attributes": True}

# Vendor Training schemas
class VendorTrainingBase(BaseModel):
    title: str
    description: Optional[str] = None
    vendor: str
    date: datetime
    duration: int  # in minutes
    instructor: Optional[str] = None
    location: Optional[str] = None
    max_participants: Optional[int] = None
    prerequisites: Optional[str] = None
    materials_needed: Optional[str] = None
    notes: Optional[str] = None

class VendorTrainingCreate(VendorTrainingBase):
    pass

class VendorTrainingUpdate(BaseModel):
    operator_name: str
    class_name: str
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    hours: Optional[int] = None
    location: Optional[str] = None
    file_url: Optional[str] = None
    
    model_config = {
        "extra": "ignore",
        "validate_assignment": True
    }
    
    @validator('start_date', 'end_date', pre=True)
    def validate_date(cls, v):
        if v == "" or v is None:
            return None
        return v
    
    @validator('hours', pre=True)
    def validate_hours(cls, v):
        if v == "" or v is None:
            return None
        return v

class VendorTrainingResponse(VendorTrainingUpdate):
    id: int
    
    model_config = {"from_attributes": True}

# Skill Level History schemas
class SkillLevelHistoryBase(BaseModel):
    user_id: int
    skill_id: int
    level: int
    notes: Optional[str] = None
    date: datetime

class SkillLevelHistoryCreate(SkillLevelHistoryBase):
    pass

class SkillLevelHistoryUpdate(BaseModel):
    operator_name: str
    skill_level: str
    date_assigned: Optional[date] = None
    signed_memo_url: Optional[str] = None
    
    model_config = {
        "extra": "ignore",
        "validate_assignment": True
    }
    
    @validator('date_assigned', pre=True)
    def validate_date(cls, v):
        if v == "" or v is None:
            return None
        return v

class SkillLevelHistoryResponse(SkillLevelHistoryUpdate):
    id: int
    
    model_config = {"from_attributes": True}

# User Schemas
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

class UserBase(BaseModel):
    username: str
    email: Optional[EmailStr] = None
    name: Optional[str] = None

class UserCreate(UserBase):
    password: str
    role: UserRole = UserRole.OPERATOR

class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    name: Optional[str] = None
    role: Optional[UserRole] = None
    avatar_id: Optional[int] = None
    password: Optional[str] = None

    model_config = {
        "extra": "ignore",
        "validate_assignment": True
    }
    
    @validator('email', pre=True)
    def validate_email(cls, v):
        if v == "" or v is None:
            return None
        return v

class UserResponse(UserBase):
    id: int
    role: UserRole
    avatar_id: Optional[int] = None
    avatar: Optional[dict] = None
    avatar_url: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}

class PasswordChange(BaseModel):
    current_password: str
    new_password: str

# JQRTracker Schemas
class JQRTrackerBase(BaseModel):
    operator_name: str
    task_id: int
    start_date: Optional[date] = None
    completion_date: Optional[date] = None
    operator_signature: Optional[str] = None
    trainer_signature: Optional[str] = None
    operator_level: OperatorLevel
    task_skill_level: str

class JQRTrackerCreate(JQRTrackerBase):
    pass

class JQRTrackerUpdate(BaseModel):
    start_date: Optional[date] = None
    completion_date: Optional[date] = None
    operator_signature: Optional[str] = None
    trainer_signature: Optional[str] = None
    
    class Config:
        extra = "ignore"  # Ignore extra fields in request
        validate_assignment = True  # Validate values during assignment
        json_encoders = {
            date: lambda v: v.isoformat() if v else None
        }
        
    @validator('start_date', 'completion_date', pre=True)
    def validate_date(cls, v):
        if v == "" or v is None:
            return None
        return v

class JQRTrackerBulkUpdate(BaseModel):
    ids: List[int]
    start_date: Optional[date] = None
    completion_date: Optional[date] = None
    operator_signature: Optional[str] = None
    trainer_signature: Optional[str] = None
    
    class Config:
        extra = "ignore"  # Ignore extra fields in request
        validate_assignment = True  # Validate values during assignment
        json_encoders = {
            date: lambda v: v.isoformat() if v else None
        }
        
    @validator('start_date', 'completion_date', pre=True)
    def validate_date(cls, v):
        if v == "" or v is None:
            return None
        return v

class JQRTrackerResponse(JQRTrackerBase):
    id: int
    task: Optional[JQRItemResponse] = None

    class Config:
        from_attributes = True
        orm_mode = True  # For backward compatibility with older Pydantic versions

# Assessment Schemas
class QuestionCategoryBase(BaseModel):
    name: str

class QuestionCategoryCreate(QuestionCategoryBase):
    pass

class QuestionCategoryResponse(QuestionCategoryBase):
    id: int
    created_at: datetime
    model_config = {"from_attributes": True}

class QuestionBase(BaseModel):
    """Base schema for assessment questions."""
    question_text: str
    question_type: str
    options: Union[List[str], str]  # Can be list or JSON string
    correct_answer: str
    points: int = 1
    order: int = 0
    category_id: Optional[int] = None

class QuestionCreate(QuestionBase):
    """Schema for creating a new question."""
    pass

class QuestionUpdate(BaseModel):
    """Schema for updating a question."""
    question_text: Optional[str] = None
    question_type: Optional[str] = None
    options: Optional[Union[List[str], str]] = None
    correct_answer: Optional[str] = None
    points: Optional[int] = None
    order: Optional[int] = None
    category_id: Optional[int] = None

class QuestionOrderUpdate(BaseModel):
    """Schema for updating a question's order."""
    id: int
    order: int

class QuestionReorder(BaseModel):
    """Schema for reordering multiple questions."""
    updates: List[QuestionOrderUpdate]

class AssessmentQuestionBase(BaseModel):
    question_text: str
    question_type: str  # "multiple_choice" or "free_form"
    options: Optional[List[str]] = None  # For multiple choice questions
    correct_answer: Optional[str] = None  # For multiple choice questions
    points: int = 1
    order: int
    category_id: Optional[int] = None
    category_name: Optional[str] = None  # For creating new categories on the fly

class AssessmentQuestionCreate(AssessmentQuestionBase):
    pass

class AssessmentQuestionUpdate(AssessmentQuestionBase):
    pass

class AssessmentQuestionResponse(AssessmentQuestionBase):
    id: int
    assessment_id: int
    category: Optional[QuestionCategoryResponse] = None
    created_at: Optional[datetime] = None

    @validator('options', pre=True)
    def convert_options_to_list(cls, v):
        if v is None:
            return None
        if isinstance(v, str):
            try:
                return json.loads(v)
            except json.JSONDecodeError:
                return None
        return v

    @validator('category', pre=True)
    def ensure_category_response(cls, v):
        if v is None:
            return None
        if isinstance(v, dict):
            return v
        # If it's a model instance, convert it to a dict
        return {
            'id': v.id,
            'name': v.name,
            'created_at': v.created_at
        }

    model_config = {"from_attributes": True}

class AssessmentBase(BaseModel):
    title: str
    description: Optional[str] = None
    is_active: bool = True

class AssessmentCreate(AssessmentBase):
    questions: List[AssessmentQuestionCreate]

class AssessmentUpdate(AssessmentBase):
    questions: Optional[List[AssessmentQuestionCreate]] = None

class AssessmentResponse(AssessmentBase):
    id: int
    created_by: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    questions: List[AssessmentQuestionResponse] = []
    creator: Optional[dict] = None

    @validator('creator', pre=True)
    def convert_creator_to_dict(cls, v):
        if v is None:
            return None
        if isinstance(v, dict):
            return v
        return {
            'id': v.id,
            'name': v.name,
            'email': v.email,
            'team_role': v.team_role
        }

    model_config = {"from_attributes": True}

class QuestionResponseBase(BaseModel):
    question_id: int
    answer: str

class QuestionResponseCreate(QuestionResponseBase):
    pass

class QuestionResponseUpdate(BaseModel):
    question_id: int
    points_awarded: Optional[int] = None
    feedback: Optional[str] = None

class QuestionResponseResponse(QuestionResponseBase):
    id: int
    assessment_response_id: int
    is_correct: Optional[bool] = None
    points_awarded: Optional[int] = None
    graded_by: Optional[int] = None
    graded_at: Optional[datetime] = None
    feedback: Optional[str] = None
    question: Optional[AssessmentQuestionResponse] = None

    model_config = {"from_attributes": True}

class AssessmentResponseBase(BaseModel):
    assessment_id: int

class AssessmentResponseCreate(AssessmentResponseBase):
    question_responses: List[QuestionResponseCreate]

class AssessmentResponseUpdate(BaseModel):
    status: Optional[str] = None
    score: Optional[int] = None
    final_score: Optional[int] = None

class AssessmentResponseResponse(AssessmentResponseBase):
    id: int
    operator_id: int
    started_at: datetime
    completed_at: Optional[datetime] = None
    score: Optional[int] = None
    status: str
    graded_by: Optional[int] = None
    graded_at: Optional[datetime] = None
    final_score: Optional[int] = None
    question_responses: List[QuestionResponseResponse] = []
    operator: Optional[dict] = None
    grader: Optional[dict] = None

    @validator('operator', pre=True)
    def convert_operator_to_dict(cls, v):
        if v is None:
            return None
        if isinstance(v, dict):
            return v
        return {
            'id': v.id,
            'name': v.name,
            'email': v.email,
            'team_role': v.team_role
        }

    @validator('grader', pre=True)
    def convert_grader_to_dict(cls, v):
        if v is None:
            return None
        if isinstance(v, dict):
            return v
        return {
            'id': v.id,
            'name': v.name,
            'email': v.email,
            'team_role': v.team_role
        }

    model_config = {"from_attributes": True}

class AssessmentCSVImport(BaseModel):
    title: str
    description: Optional[str] = None
    csv_content: str  # Base64 encoded CSV content
    is_active: bool = True

class RedTeamTrainingImportResponse(BaseModel):
    imported: int
    errors: List[str]
    skipped: List[str]
    records: List[RedTeamTrainingResponse]
    
    model_config = {"from_attributes": True}
