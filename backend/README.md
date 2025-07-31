# RT3 Backend

The backend service for the Red Team Training Tracker (RT3) application, built with FastAPI.

## Structure

```
backend/
├── app/
│   ├── routes/          # API route handlers
│   │   ├── assessments.py
│   │   ├── certifications.py
│   │   ├── documents.py
│   │   ├── images.py
│   │   ├── jqr.py
│   │   ├── missions.py
│   │   ├── red_team_training.py
│   │   ├── skill_level_history.py
│   │   ├── team_roster.py
│   │   ├── training.py
│   │   └── vendor_training.py
│   ├── crud/           # Database operations
│   │   ├── assessment.py
│   │   ├── assessment_response.py
│   │   ├── category.py
│   │   ├── jqr.py
│   │   └── training.py
│   ├── schemas/        # Pydantic models
│   │   └── assessment.py
│   ├── models/         # SQLAlchemy models
│   ├── utils/          # Utility functions
│   ├── main.py         # Application entry point
│   ├── config.py       # Configuration settings
│   ├── auth.py         # Authentication
│   ├── database.py     # Database connection
│   ├── dependencies.py # Dependency injection
│   ├── enums.py        # Enum definitions
│   ├── models.py       # SQLAlchemy models
│   └── schemas.py      # Pydantic models
├── alembic/            # Database migrations
├── migrations/         # Migration scripts
├── uploads/           # File upload directory
├── data/             # Data files
├── requirements.txt   # Python dependencies
├── Dockerfile        # Container configuration
└── alembic.ini       # Alembic configuration
```

## Key Components

### Routes
- `assessments.py`: Assessment creation, management, and response handling
- `certifications.py`: Certification tracking and management
- `documents.py`: Document upload and management
- `images.py`: Image handling and storage
- `jqr.py`: JQR task and tracker management
- `missions.py`: Mission tracking and management
- `red_team_training.py`: Internal training records
- `skill_level_history.py`: Operator level change tracking
- `team_roster.py`: Team member management
- `training.py`: General training management
- `vendor_training.py`: External training records

### CRUD Operations
- `assessment.py`: Assessment database operations
- `assessment_response.py`: Assessment response handling
- `category.py`: Question category management
- `jqr.py`: JQR task operations
- `training.py`: Training record operations

### Core Functionality
- `auth.py`: JWT authentication and authorization
- `config.py`: Application configuration
- `database.py`: Database connection management
- `dependencies.py`: Dependency injection setup
- `enums.py`: Common enumerations (OperatorLevel, ComplianceStatus, etc.)
- `utils/`: Utility functions and helpers

## Development

### Prerequisites
- Docker
- Docker Compose

### Running the Application

The backend is part of the Docker Compose setup. See the main README.md for complete setup instructions.

```bash
# Start all services
docker compose up -d

# View backend logs
docker compose logs -f backend
```

The backend API will be available at:
- API: http://localhost:8000
- API Documentation: http://localhost:8000/docs

### Development Mode

For development with hot-reload:
```bash
# Start in development mode
docker compose -f docker-compose.yml -f docker-compose.override.yml up -d

# View logs
docker compose logs -f backend
```

### Stopping the Application

```bash
# Stop all services
docker compose down

# Stop and remove volumes (will delete database data)
docker compose down -v
```

### Database Management

```bash
# Access the database
docker compose exec backend sqlite3 /app/data/rt3.db

# Run database migrations
docker compose exec backend alembic upgrade head
```

# To create a new migration:
docker compose exec backend alembic revision -m "description_of_changes"

# To rollback the last migration:
docker compose exec backend alembic downgrade -1

# To rollback all migrations:
docker compose exec backend alembic downgrade base

# To check migration status:
docker compose exec backend alembic current
docker compose exec backend alembic history
```

### Backup Management

Backups are automatically created every 6 hours via cron job. The backup directory is configurable via the `RT3_BACKUP_DIR` environment variable.

```bash
# Manual backup (if needed)
docker compose exec backend /opt/rt3/utils/backup_rt3.sh

# View backup logs
docker compose exec backend cat /app/backup/backup.log

# List available backups
docker compose exec backend ls -la /app/backup/

# Check cron job status
docker compose exec backend service cron status

# View cron logs
docker compose exec backend cat /app/backup/cron.log

# Restore from backup (example)
docker compose exec backend tar -xzf /app/backup/backup_2024-01-27_1200.tar.gz -C /app/
```

**Backup Configuration:**
- **Schedule**: Every 6 hours (0, 6, 12, 18)
- **Retention**: 28 most recent backups (7 days × 4 backups/day)
- **Contents**: Database file and uploads directory
- **Location**: Configurable via `RT3_BACKUP_DIR` environment variable
- **Automatic Setup**: Cron job is automatically configured on container startup

### Testing

```bash
# Run all tests
docker compose exec backend pytest

# Run specific test file
docker compose exec backend pytest tests/test_file.py

# Run with coverage
docker compose exec backend pytest --cov=app
```

## Common Issues

### Database Connection
- Ensure the data volume is properly mounted
- Check database file permissions
- Verify database migrations are up to date

### File Uploads
- Verify upload directory permissions
- Check file size and type restrictions
- Ensure proper CORS configuration for file access

### Authentication
- Verify JWT settings in docker-compose.yml
- Check token expiration settings
- Ensure proper user role assignments

### CORS
- Verify CORS settings in docker-compose.yml
- Check nginx configuration for proper headers
- Ensure proper CORS middleware configuration

### Backup Issues
- Check backup logs: `docker compose exec backend cat /app/backup/backup.log`
- Check cron logs: `docker compose exec backend cat /app/backup/cron.log`
- Verify backup directory permissions
- Ensure sufficient disk space for backups
- Check cron service is running: `docker compose exec backend service cron status`
- Verify backup script is executable: `docker compose exec backend ls -la /opt/rt3/utils/backup_rt3.sh`

### API Issues
- Check backend logs: `docker compose logs backend`
- Verify database connection
- Check API documentation at http://localhost:8000/docs

## Deployment

1. Build and run with Docker Compose:
```bash
# For development
docker compose -f docker-compose.yml -f docker-compose.override.yml up -d

# For production
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

2. For production:
- Use HTTPS (configured in nginx)
- Set proper CORS origins in docker-compose.prod.yml
- Configure proper file storage
- Set up proper logging
- Use environment variables in docker-compose.yml for sensitive data

## API Features

### Authentication
- JWT-based authentication
- Role-based access control
- Token refresh mechanism
- Secure password hashing

### File Handling
- Secure file uploads
- File type validation
- Size restrictions
- Path management
- Access control

### Data Validation
- Pydantic models for request/response validation
- SQLAlchemy models for database operations
- Custom validators for business logic

### Error Handling
- Custom exception handlers
- Detailed error messages
- Proper HTTP status codes
- Logging integration

# RT3 Backend API Documentation

This document provides comprehensive documentation for the RT3 backend API endpoints, including request/response schemas, authentication, and usage examples.

## Table of Contents

- [Database Schema](#database-schema)
- [API Endpoints Overview](#api-endpoints-overview)
- [Authentication](#authentication)
- [Base URL](#base-url)
- [Common Response Formats](#common-response-formats)
- [Team Roster Management](#team-roster-management)
- [JQR Management](#jqr-management)
- [Training Management](#training-management)
- [Assessment System](#assessment-system)
- [Mission Management](#mission-management)
- [Reporting System](#reporting-system)
- [Document Management](#document-management)
- [Image Management](#image-management)
- [Error Handling](#error-handling)

## Database Schema

### Key Tables

- `team_roster`: Stores operator information and status
  - Basic info (name, handle, email)
  - Operator level and roles
  - Compliance status
  - Authentication (hashed password)
  - Avatar and image relationships

- `jqr_items`: Contains JQR task definitions
  - Task details (number, question, section)
  - Skill level assignments (apprentice, journeyman, master)
  - Training status

- `jqr_tracker`: Tracks operator progress on JQR tasks
  - Links to operator and task
  - Completion dates and signatures
  - Skill level tracking

- `red_team_training`: Records internal training
  - Training details and dates
  - Document attachments
  - Expiration tracking
  - Training type categorization

- `vendor_training`: Tracks external training
  - Class details and dates
  - Location and hours
  - Document attachments

- `certifications`: Manages certification records
  - Certification details
  - Dates and expiration
  - Document attachments
  - DoD 8140 compliance tracking

- `images`: Stores uploaded images and documents
  - File metadata
  - Content type and path
  - Relationships to uploaders and avatars

- `skill_level_history`: Tracks operator level changes
  - Level assignment history
  - Signed documentation

- `assessments`: Stores assessment definitions
  - Title and description
  - Creator and dates
  - Active status
  - Relationships to questions and responses

- `question_categories`: Manages assessment question categories
  - Category names
  - Relationships to questions

- `assessment_questions`: Stores assessment questions
  - Question text and type
  - Options and correct answers
  - Points and ordering
  - Relationships to categories and responses

- `assessment_responses`: Tracks assessment submissions
  - Links to assessment and operator
  - Completion dates
  - Scoring and grading
  - Status tracking

- `question_responses`: Stores individual question answers
  - Links to assessment response and question
  - Answer content
  - Grading and feedback
  - Points awarded

- `missions`: Manages training missions
  - Mission details and organization by year
  - Team assignments (remote and local operators)
  - On keyboard tracking for operators
  - Location and planning info
  - Team structure (lead, rep, planner)

## API Endpoints Overview

### JQR Management
- `GET /api/jqr/tracker`: Get all JQR tracker items
- `POST /api/jqr/sync-tracker`: Sync JQR tracker with team roster
- `PUT /api/jqr/tracker`: Update JQR tracker items
- `DELETE /api/jqr/tracker/{id}`: Delete JQR tracker items
- `PUT /api/jqr/bulk-tracker`: Bulk update JQR tracker items

### Team Roster
- `GET /api/team-roster`: Get all team members
- `POST /api/team-roster`: Add new team member
- `PUT /api/team-roster/{id}`: Update team member
- `DELETE /api/team-roster/{id}`: Remove team member
- `GET /api/team-roster/me`: Get current user information

### Assessments
- `GET /api/assessments`: Get all assessments
- `POST /api/assessments`: Create new assessment
- `PUT /api/assessments/{id}`: Update assessment
- `DELETE /api/assessments/{id}`: Delete assessment
- `POST /api/assessments/{id}/submit`: Submit assessment response
- `GET /api/assessments/{id}/responses`: Get assessment responses

### Missions
- `GET /api/missions`: Get all missions
- `POST /api/missions`: Create new mission
- `PUT /api/missions/{id}`: Update mission
- `DELETE /api/missions/{id}`: Delete mission
- `GET /api/missions/count`: Get mission count

### Reports
- `GET /api/reports/annual-red-team-training`: Generate annual training report
- `GET /api/reports/quarterly-legal-briefings`: Generate quarterly legal briefings report

### Document Management
- `POST /api/training/document/upload`: Upload training documents
- `DELETE /api/training/document`: Delete training documents
- `GET /uploads/{path}`: Access uploaded files

### Image Management
- `POST /api/images/upload`: Upload images
- `GET /api/images/{id}`: Get image details
- `DELETE /api/images/{id}`: Delete image

## Authentication

All API endpoints require JWT authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

### Login Endpoint

**POST** `/auth/login`

Request:
```json
{
  "username": "operator_handle",
  "password": "password"
}
```

Response:
```json
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "token_type": "bearer"
}
```

## Base URL

- Development: `http://localhost:8000`
- Production: `https://your-domain.com`

## Common Response Formats

### Success Response
```json
{
  "id": 1,
  "name": "Example",
  "created_at": "2024-01-27T12:00:00Z"
}
```

### Error Response
```json
{
  "detail": "Error message description"
}
```

### Validation Error Response
```json
{
  "detail": [
    {
      "loc": ["body", "field_name"],
      "msg": "field required",
      "type": "value_error.missing"
    }
  ]
}
```

## Team Roster Management

### Get All Team Members

**GET** `/team-roster`

**Response:**
```json
[
  {
    "id": 1,
    "name": "John Doe",
    "operator_handle": "jdoe",
    "email": "john.doe@example.com",
    "team_role": "Red Team Operator",
    "onboarding_date": "2023-01-15",
    "operator_level": "apprentice",
    "compliance_8570": "compliant",
    "legal_document_status": "compliant",
    "active": true,
    "avatar_id": null,
    "created_at": "2023-01-15T10:00:00Z",
    "updated_at": "2024-01-27T12:00:00Z"
  }
]
```

### Get Current User

**GET** `/team-roster/me`

**Response:**
```json
{
  "id": 1,
  "name": "John Doe",
  "operator_handle": "jdoe",
  "email": "john.doe@example.com",
  "team_role": "Red Team Operator",
  "operator_level": "apprentice",
  "active": true
}
```

### Create Team Member

**POST** `/team-roster`

**Request:**
```json
{
  "name": "Jane Smith",
  "operator_handle": "jsmith",
  "email": "jane.smith@example.com",
  "team_role": "Red Team Operator",
  "onboarding_date": "2024-01-27",
  "operator_level": "team_member",
  "password": "secure_password"
}
```

### Update Team Member

**PUT** `/team-roster/{id}`

**Request:**
```json
{
  "name": "Jane Smith Updated",
  "operator_level": "apprentice",
  "active": true
}
```

### Delete Team Member

**DELETE** `/team-roster/{id}`

**Response:**
```json
{
  "message": "Team member deleted successfully"
}
```

## JQR Management

### Get JQR Tracker Items

**GET** `/jqr/tracker`

**Response:**
```json
[
  {
    "id": 1,
    "operator_name": "John Doe",
    "task_id": 1,
    "start_date": "2024-01-15",
    "completion_date": "2024-01-20",
    "operator_signature": "John Doe",
    "trainer_signature": "Trainer Name",
    "operator_level": "apprentice",
    "task_skill_level": "apprentice",
    "task": {
      "id": 1,
      "task_number": "JQR-001",
      "question": "Describe the red team methodology",
      "task_section": "Methodology",
      "training_status": "active"
    }
  }
]
```

### Sync JQR Tracker

**POST** `/jqr/sync-tracker`

**Response:**
```json
{
  "message": "JQR tracker synced successfully",
  "added": 5,
  "removed": 2
}
```

### Update JQR Tracker Item

**PUT** `/jqr/tracker`

**Request:**
```json
{
  "id": 1,
  "completion_date": "2024-01-20",
  "operator_signature": "John Doe",
  "trainer_signature": "Trainer Name"
}
```

### Bulk Update JQR Tracker

**PUT** `/jqr/bulk-tracker`

**Request:**
```json
{
  "ids": [1, 2, 3],
  "completion_date": "2024-01-20",
  "trainer_signature": "Trainer Name"
}
```

## Training Management

### Red Team Training

#### Get All Red Team Training Records

**GET** `/red-team-training`

**Response:**
```json
[
  {
    "id": 1,
    "operator_name": "John Doe",
    "training_name": "Red Team Methodology",
    "training_type": "Red Team Methodology and Mission Risk Agreement",
    "due_date": "2024-12-31",
    "expiration_date": "2025-12-31",
    "date_submitted": "2024-01-15",
    "file_url": "/uploads/training_doc.pdf"
  }
]
```

#### Create Red Team Training Record

**POST** `/red-team-training`

**Request:**
```json
{
  "operator_name": "John Doe",
  "training_name": "Red Team Methodology",
  "training_type": "Red Team Methodology and Mission Risk Agreement",
  "due_date": "2024-12-31",
  "date_submitted": "2024-01-15"
}
```

#### Update Red Team Training Record

**PUT** `/red-team-training/{id}`

**Request:**
```json
{
  "training_name": "Updated Training Name",
  "date_submitted": "2024-01-20"
}
```

### Vendor Training

#### Get All Vendor Training Records

**GET** `/vendor-training`

**Response:**
```json
[
  {
    "id": 1,
    "operator_name": "John Doe",
    "class_name": "Advanced Penetration Testing",
    "start_date": "2024-01-15",
    "end_date": "2024-01-20",
    "hours": 40,
    "location": "Online",
    "file_url": "/uploads/certificate.pdf"
  }
]
```

#### Create Vendor Training Record

**POST** `/vendor-training`

**Request:**
```json
{
  "operator_name": "John Doe",
  "class_name": "Advanced Penetration Testing",
  "start_date": "2024-01-15",
  "end_date": "2024-01-20",
  "hours": 40,
  "location": "Online"
}
```

### Certifications

#### Get All Certifications

**GET** `/certifications`

**Response:**
```json
[
  {
    "id": 1,
    "operator_name": "John Doe",
    "certification_name": "OSCP",
    "date_acquired": "2023-06-15",
    "training_hours": 80,
    "expiration_date": "2026-06-15",
    "file_url": "/uploads/oscp_cert.pdf",
    "dod_8140": true
  }
]
```

#### Create Certification Record

**POST** `/certifications`

**Request:**
```json
{
  "operator_name": "John Doe",
  "certification_name": "OSCP",
  "date_acquired": "2023-06-15",
  "training_hours": 80,
  "dod_8140": true
}
```

## Assessment System

### Get All Assessments

**GET** `/assessments`

**Response:**
```json
[
  {
    "id": 1,
    "title": "Red Team Fundamentals",
    "description": "Assessment covering basic red team concepts",
    "created_by": 1,
    "created_at": "2024-01-15T10:00:00Z",
    "updated_at": "2024-01-15T10:00:00Z",
    "is_active": true,
    "questions": [
      {
        "id": 1,
        "question_text": "What is the primary goal of red teaming?",
        "question_type": "multiple_choice",
        "options": ["Option A", "Option B", "Option C"],
        "correct_answer": "Option A",
        "points": 5,
        "order": 1
      }
    ]
  }
]
```

### Create Assessment

**POST** `/assessments`

**Request:**
```json
{
  "title": "Red Team Fundamentals",
  "description": "Assessment covering basic red team concepts",
  "is_active": true,
  "questions": [
    {
      "question_text": "What is the primary goal of red teaming?",
      "question_type": "multiple_choice",
      "options": ["Option A", "Option B", "Option C"],
      "correct_answer": "Option A",
      "points": 5,
      "order": 1,
      "category_name": "Fundamentals"
    }
  ]
}
```

### Submit Assessment Response

**POST** `/assessments/{id}/submit`

**Request:**
```json
{
  "question_responses": [
    {
      "question_id": 1,
      "answer": "Option A"
    }
  ]
}
```

### Get Assessment Responses

**GET** `/assessments/{id}/responses`

**Response:**
```json
[
  {
    "id": 1,
    "operator_id": 1,
    "started_at": "2024-01-15T10:00:00Z",
    "completed_at": "2024-01-15T10:30:00Z",
    "score": 85,
    "final_score": 85,
    "status": "graded",
    "operator": {
      "id": 1,
      "name": "John Doe",
      "operator_handle": "jdoe"
    }
  }
]
```

## Mission Management

### Get All Missions

**GET** `/missions`

**Response:**
```json
[
  {
    "id": 1,
    "mission": "2024-001",
    "team_lead": "John Doe",
    "mission_lead": "Jane Smith",
    "rep": "Bob Johnson",
    "remote_operators": "Alice Brown, Charlie Wilson",
    "local_operators": "David Lee, Eve Davis",
    "remote_operators_on_keyboard": "Alice Brown",
    "local_operators_on_keyboard": "David Lee",
    "planner": "Frank Miller",
    "location": "Training Facility A"
  }
]
```

### Create Mission

**POST** `/missions`

**Request:**
```json
{
  "mission": "2024-001",
  "team_lead": "John Doe",
  "mission_lead": "Jane Smith",
  "rep": "Bob Johnson",
  "remote_operators": "Alice Brown, Charlie Wilson",
  "local_operators": "David Lee, Eve Davis",
  "remote_operators_on_keyboard": "Alice Brown",
  "local_operators_on_keyboard": "David Lee",
  "planner": "Frank Miller",
  "location": "Training Facility A"
}
```

### Update Mission

**PUT** `/missions/{id}`

**Request:**
```json
{
  "mission": "2024-001",
  "remote_operators_on_keyboard": "Alice Brown, Charlie Wilson",
  "local_operators_on_keyboard": "David Lee"
}
```

### Get Mission Count

**GET** `/missions/count`

**Response:**
```json
{
  "count": 25
}
```

## Reporting System

### Annual Red Team Training Report

**GET** `/reports/annual-red-team-training`

**Response:**
```json
{
  "report_type": "Annual Red Team Training",
  "generated_at": "2024-01-27T12:00:00Z",
  "current_year": 2024,
  "required_training_types": [
    "Red Team Member Non-Disclosure Agreement",
    "Red Team Mission Risk Agreement",
    "Red Team Data Protection Agreement",
    "Red Team Code of Conduct Agreement"
  ],
  "summary": {
    "total_operators": 10,
    "current_year_required_records": 40,
    "current_year_completed_records": 35,
    "current_year_not_applicable": 5,
    "current_year_compliance_rate": 87.5
  },
  "data": [
    {
      "year": 2024,
      "required_training_types": [...],
      "training_types": {
        "Red Team Member Non-Disclosure Agreement": {
          "operators": {
            "John Doe": {
              "operator_handle": "jdoe",
              "status": "Completed",
              "date_submitted": "2024-01-15",
              "file_url": "/uploads/nda.pdf"
            }
          }
        }
      }
    }
  ]
}
```

### Quarterly Legal Briefings Report

**GET** `/reports/quarterly-legal-briefings`

**Response:**
```json
{
  "report_type": "Quarterly Legal Briefings",
  "generated_at": "2024-01-27T12:00:00Z",
  "current_year": 2024,
  "current_quarter": 1,
  "summary": {
    "total_operators": 10,
    "required_records": 10,
    "completed_records": 8,
    "not_applicable": 2,
    "compliance_rate": 80.0
  },
  "data": [
    {
      "quarter": "2024 Q1",
      "operators": {
        "John Doe": {
          "operator_handle": "jdoe",
          "status": "Completed",
          "date_submitted": "2024-01-15",
          "file_url": "/uploads/legal_brief.pdf"
        }
      }
    }
  ]
}
```

## Document Management

### Upload Training Document

**POST** `/training/document/upload`

**Request:** Multipart form data
- `file`: The document file
- `operator_name`: Name of the operator
- `training_type`: Type of training document

**Response:**
```json
{
  "message": "Document uploaded successfully",
  "file_url": "/uploads/training_doc.pdf"
}
```

### Delete Training Document

**DELETE** `/training/document`

**Request:**
```json
{
  "operator_name": "John Doe",
  "training_type": "Red Team Methodology"
}
```

## Image Management

### Upload Image

**POST** `/images/upload`

**Request:** Multipart form data
- `file`: The image file
- `image_type`: Type of image (avatar, dashboard, mission)
- `uploaded_by`: ID of the user uploading the image

**Response:**
```json
{
  "id": 1,
  "filename": "avatar.jpg",
  "file_path": "/uploads/avatar.jpg",
  "content_type": "image/jpeg",
  "image_type": "avatar",
  "uploaded_by": 1,
  "created_at": "2024-01-27T12:00:00Z",
  "is_active": true
}
```

### Get Image Details

**GET** `/images/{id}`

**Response:**
```json
{
  "id": 1,
  "filename": "avatar.jpg",
  "file_path": "/uploads/avatar.jpg",
  "content_type": "image/jpeg",
  "image_type": "avatar",
  "uploaded_by": 1,
  "created_at": "2024-01-27T12:00:00Z",
  "is_active": true
}
```

### Delete Image

**DELETE** `/images/{id}`

**Response:**
```json
{
  "message": "Image deleted successfully"
}
```

## Error Handling

### Common HTTP Status Codes

- **200 OK**: Request successful
- **201 Created**: Resource created successfully
- **400 Bad Request**: Invalid request data
- **401 Unauthorized**: Authentication required
- **403 Forbidden**: Insufficient permissions
- **404 Not Found**: Resource not found
- **422 Unprocessable Entity**: Validation error
- **500 Internal Server Error**: Server error

### Error Response Format

```json
{
  "detail": "Error message description"
}
```

### Validation Error Format

```json
{
  "detail": [
    {
      "loc": ["body", "field_name"],
      "msg": "field required",
      "type": "value_error.missing"
    }
  ]
}
```

## Rate Limiting

The API implements rate limiting to prevent abuse:
- 100 requests per minute per IP address
- 1000 requests per hour per user

## Pagination

For endpoints that return large datasets, pagination is supported:

**GET** `/endpoint?page=1&size=20`

**Response:**
```json
{
  "items": [...],
  "total": 100,
  "page": 1,
  "size": 20,
  "pages": 5
}
```

## File Upload Limits

- Maximum file size: 10MB
- Supported formats: PDF, JPG, PNG, DOC, DOCX
- All files are scanned for malware before storage

## API Versioning

The current API version is v1. Future versions will be available at `/api/v2/`, etc.

## Testing

You can test the API using the interactive documentation at:
- Development: `http://localhost:8000/docs`
- Production: `https://your-domain.com/docs`

## Support

For API support or questions, please contact the development team or create an issue in the project repository.
