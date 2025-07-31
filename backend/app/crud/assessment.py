from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from datetime import datetime
import json
import csv
import io
import base64
from sqlalchemy.sql import func

from ..models import Assessment, AssessmentQuestion
from ..schemas import AssessmentCreate, AssessmentUpdate
from ..crud.category import get_or_create

def get(db: Session, assessment_id: int) -> Optional[Assessment]:
    """Get an assessment by ID."""
    return db.query(Assessment).filter(Assessment.id == assessment_id).options(
        joinedload(Assessment.questions).joinedload(AssessmentQuestion.category)
    ).first()

def get_all(db: Session) -> List[Assessment]:
    """Get all assessments."""
    return db.query(Assessment).all()

def get_all_active(db: Session) -> List[Assessment]:
    """Get all active assessments."""
    return db.query(Assessment).filter(Assessment.is_active == True).options(
        joinedload(Assessment.questions).joinedload(AssessmentQuestion.category)
    ).all()

def create(db: Session, assessment_data: AssessmentCreate, created_by: int) -> Assessment:
    """Create a new assessment."""
    # Create assessment
    db_assessment = Assessment(
        title=assessment_data.title,
        description=assessment_data.description,
        is_active=assessment_data.is_active,
        created_by=created_by,
        created_at=datetime.utcnow()
    )
    db.add(db_assessment)
    db.flush()  # Flush to get the assessment ID

    # Create questions
    for question_data in assessment_data.questions:
        # Convert options to JSON if it's a list
        options = question_data.options
        if isinstance(options, list):
            options = json.dumps(options)

        print("Creating question with data:", question_data.model_dump())  # Debug logging
        
        db_question = AssessmentQuestion(
            assessment_id=db_assessment.id,
            question_text=question_data.question_text,
            question_type=question_data.question_type,
            options=options,
            correct_answer=question_data.correct_answer,
            points=question_data.points,
            order=question_data.order,
            category_id=question_data.category_id
        )
        print("Question object before commit:", db_question.__dict__)  # Debug logging
        db.add(db_question)

    db.commit()
    db.refresh(db_assessment)
    return db_assessment

def update(db: Session, assessment_id: int, assessment_data: AssessmentUpdate) -> Optional[Assessment]:
    """Update an assessment."""
    db_assessment = get(db, assessment_id)
    if not db_assessment:
        return None

    update_data = assessment_data.model_dump(exclude_unset=True)
    update_data["updated_at"] = datetime.utcnow()

    # Update assessment fields
    for key, value in update_data.items():
        if key != 'questions':
            setattr(db_assessment, key, value)

    # Update questions if provided
    if 'questions' in update_data and update_data['questions'] is not None:
        # Get all existing questions for this assessment
        existing_questions = {q.id: q for q in db_assessment.questions}
        processed_ids = set()

        # Update or add questions
        for question_data in update_data['questions']:
            question_id = question_data.get('id')
            
            # Convert options to JSON if it's a list
            options = question_data.get('options')
            if isinstance(options, list):
                options = json.dumps(options)

            if question_id and question_id in existing_questions:
                # Update existing question
                db_question = existing_questions[question_id]
                # Update only the editable fields
                db_question.question_text = question_data['question_text']
                db_question.question_type = question_data['question_type']
                db_question.options = options
                db_question.correct_answer = question_data.get('correct_answer')
                db_question.points = question_data.get('points', 1)
                db_question.order = question_data.get('order', 0)
                db_question.category_id = question_data.get('category_id')
                processed_ids.add(question_id)
            else:
                # Create new question
                db_question = AssessmentQuestion(
                    assessment_id=assessment_id,
                    question_text=question_data['question_text'],
                    question_type=question_data['question_type'],
                    options=options,
                    correct_answer=question_data.get('correct_answer'),
                    points=question_data.get('points', 1),
                    order=question_data.get('order', 0),
                    category_id=question_data.get('category_id'),
                    created_at=datetime.utcnow()  # Only set created_at for new questions
                )
                db.add(db_question)

        # Delete questions that weren't in the update
        for question_id, question in existing_questions.items():
            if question_id not in processed_ids:
                db.delete(question)

    db.commit()
    db.refresh(db_assessment)
    return db_assessment

def delete(db: Session, assessment_id: int) -> bool:
    """Delete an assessment."""
    db_assessment = get(db, assessment_id)
    if not db_assessment:
        return False

    db.delete(db_assessment)
    db.commit()
    return True

def parse_options_string(options_str: str) -> list:
    """Parse options string in format 'a.Option1,b.Option2,c.Option3' into a list.
    
    Args:
        options_str: String containing options in format 'a.Text,b.Text,c.Text'
        
    Returns:
        List of options in order, preserving the letter prefixes
    """
    if not options_str:
        return []
    
    # Find all positions where we have a pattern like ",a." ",b." etc
    options = []
    option_starts = []
    
    # Add the start of the first option (should start with 'a.')
    if not options_str.startswith('a.'):
        raise ValueError("Options must start with 'a.'")
    option_starts.append(0)
    
    # Find all other option starts (looking for patterns like ",b.", ",c.", etc)
    expected_next_letter = 'b'
    pos = 0
    while pos < len(options_str):
        if pos + 2 < len(options_str):
            # Look for ",x." pattern where x is our expected letter
            if (options_str[pos] == ',' and 
                options_str[pos + 1] == expected_next_letter and 
                options_str[pos + 2] == '.'):
                option_starts.append(pos + 1)
                expected_next_letter = chr(ord(expected_next_letter) + 1)
        pos += 1
    
    # Split the string at the found positions
    for i in range(len(option_starts)):
        start = option_starts[i]
        end = option_starts[i + 1] - 1 if i + 1 < len(option_starts) else len(options_str)
        option = options_str[start:end].strip()
        
        # Validate the option
        if len(option) < 2:
            raise ValueError(f"Option {chr(ord('a') + i)} is too short: '{option}'")
        if not option[0].isalpha():
            raise ValueError(f"Option {chr(ord('a') + i)} does not start with a letter: '{option}'")
        if option[1] != '.':
            raise ValueError(f"Option {chr(ord('a') + i)} is missing period after letter: '{option}'")
        if len(option) <= 2:
            raise ValueError(f"Option {chr(ord('a') + i)} has no content after letter prefix: '{option}'")
        
        options.append(option)
    
    if not options:
        raise ValueError("No valid options found")
    
    # Verify we have sequential letters
    letters = [opt[0].lower() for opt in options]
    expected_letters = [chr(ord('a') + i) for i in range(len(options))]
    
    if letters != expected_letters:
        raise ValueError(
            f"Options must use sequential letters starting with 'a'. "
            f"Found: {', '.join(letters)}, Expected: {', '.join(expected_letters)}"
        )
    
    return options

def clean_csv_content(content: bytes) -> str:
    """Clean CSV content by trying different encodings and cleaning special characters.
    
    Args:
        content: Raw bytes from the CSV file
        
    Returns:
        Cleaned string content
        
    Raises:
        ValueError: If content cannot be decoded with any supported encoding
    """
    # Try different encodings in order of likelihood
    encodings = ['utf-8', 'utf-8-sig', 'cp1252', 'iso-8859-1']
    
    # Special characters mapping
    char_map = {
        '\u2018': "'",  # Left single quote
        '\u2019': "'",  # Right single quote
        '\u201c': '"',  # Left double quote
        '\u201d': '"',  # Right double quote
        '\u2013': '-',  # En dash
        '\u2014': '-',  # Em dash
        '\u2026': '...',  # Ellipsis
        '\u00a0': ' ',  # Non-breaking space
    }
    
    decoded = None
    for encoding in encodings:
        try:
            decoded = content.decode(encoding)
            break
        except UnicodeDecodeError:
            continue
    
    if decoded is None:
        raise ValueError("Unable to decode CSV content with any supported encoding")
        
    # Clean up special characters
    for old, new in char_map.items():
        decoded = decoded.replace(old, new)
    
    return decoded

def import_from_csv(db: Session, csv_content: str, title: str, description: str = "", is_active: bool = True) -> Assessment:
    """Import assessment questions from CSV content.
    
    Args:
        db: Database session
        csv_content: Base64 encoded CSV content
        title: Assessment title
        description: Assessment description
        is_active: Whether the assessment is active
        
    Returns:
        Created assessment with imported questions
        
    Raises:
        ValueError: If CSV content is invalid or required columns are missing
    """
    try:
        # Decode base64 content and clean it
        raw_content = base64.b64decode(csv_content)
        try:
            decoded_content = clean_csv_content(raw_content)
        except ValueError as e:
            raise ValueError(f"Error processing CSV file: {str(e)}")
        
        csv_data = list(csv.DictReader(io.StringIO(decoded_content)))
        
        if not csv_data:
            raise ValueError("CSV file is empty")
            
        required_columns = {'question_text', 'question_type', 'options', 'correct_answer', 'category_name'}
        csv_columns = set(csv_data[0].keys())
        
        if not required_columns.issubset(csv_columns):
            missing = required_columns - csv_columns
            raise ValueError(f"Missing required columns: {', '.join(missing)}")
            
        # Create new assessment
        assessment = Assessment(
            title=title,
            description=description,
            is_active=is_active
        )
        db.add(assessment)
        db.flush()  # Get assessment ID
        
        # Process each row
        for row in csv_data:
            # Process category if provided
            category_id = None
            if row.get('category_name'):
                category = get_or_create(db, row['category_name'])
                category_id = category.id
                
            # Parse options from comma-separated string
            options = [opt.strip() for opt in row['options'].split(',') if opt.strip()]
            
            question = AssessmentQuestion(
                assessment_id=assessment.id,
                question_text=row['question_text'],
                question_type=row['question_type'],
                options=options,
                correct_answer=row['correct_answer'],
                category_id=category_id
            )
            db.add(question)
            
        db.commit()
        return assessment
        
    except (csv.Error, UnicodeDecodeError) as e:
        raise ValueError(f"Invalid CSV format: {str(e)}")
    except Exception as e:
        db.rollback()
        raise ValueError(f"Error importing CSV: {str(e)}")

def import_questions_to_existing(db: Session, assessment_id: int, csv_content: str) -> Assessment:
    """Import questions from CSV content into an existing assessment."""
    try:
        # Get the existing assessment
        assessment_obj = get(db, assessment_id)
        if not assessment_obj:
            raise ValueError("Assessment not found")
            
        # Decode base64 content and clean it
        raw_content = base64.b64decode(csv_content)
        try:
            decoded_content = clean_csv_content(raw_content)
        except ValueError as e:
            raise ValueError(f"Error processing CSV file: {str(e)}")
        
        # Parse CSV with universal newlines and proper quote handling
        csv_reader = csv.DictReader(
            io.StringIO(decoded_content, newline=None),
            quoting=csv.QUOTE_MINIMAL,
            escapechar='\\'
        )
        csv_data = list(csv_reader)
        
        if not csv_data:
            raise ValueError("CSV file is empty")
            
        required_columns = {'question_text', 'question_type', 'options', 'correct_answer', 'category_name'}
        csv_columns = set(csv_data[0].keys())
        
        if not required_columns.issubset(csv_columns):
            missing = required_columns - csv_columns
            raise ValueError(f"Missing required columns: {', '.join(missing)}")
            
        # Get the current highest order
        max_order = db.query(func.max(AssessmentQuestion.order)).filter(
            AssessmentQuestion.assessment_id == assessment_id
        ).scalar() or 0
        
        # Process each row
        for i, row in enumerate(csv_data, 1):
            try:
                # Clean up each field and ensure we have the required columns
                row = {k: v.strip() if isinstance(v, str) else v for k, v in row.items()}
                
                # Validate required fields
                if not row.get('question_text'):
                    raise ValueError(f"Missing question_text in row {i}")
                if not row.get('question_type'):
                    raise ValueError(f"Missing question_type in row {i}")
                if not row.get('correct_answer'):
                    raise ValueError(f"Missing correct_answer in row {i}")
                
                # Process category if provided
                category_id = None
                if row.get('category_name'):
                    category = get_or_create(db, row['category_name'])
                    category_id = category.id

                # First validate the correct answer since it's simpler
                # Extract just the first character if it's a complex string
                print(f"Raw correct_answer from row: {row.get('correct_answer')}")  # Debug print
                print(f"Row keys: {row.keys()}")  # Debug print
                print(f"Row values: {row}")  # Debug print
                
                correct_answer = str(row.get('correct_answer', '')).strip().lower()
                print(f"Processed correct_answer: {correct_answer}")  # Debug print
                
                # Check if correct_answer is empty or None
                if correct_answer is None or correct_answer == '':
                    print(f"Row data for debugging: {row}")  # Debug print
                    raise ValueError(f"Missing correct_answer in row {i}")

                # Handle different question types
                question_type = row['question_type'].strip().lower()
                cleaned_options = []
                correct_option = correct_answer

                if question_type == 'multiple_choice':
                    if not row.get('options'):
                        raise ValueError(f"Missing options in row {i} for multiple_choice question")
                    
                    if '.' in correct_answer:
                        # If we got a full option instead of just the letter, take the first character
                        correct_answer = correct_answer.split('.')[0].strip().lower()
                        print(f"Correct answer after splitting: {correct_answer}")  # Debug print
                    
                    if len(correct_answer) != 1 or not correct_answer.isalpha():
                        raise ValueError(f"Correct answer must be a single letter for multiple_choice, got '{correct_answer}'")

                    # Parse options using letter prefixes as delimiters
                    options_str = str(row['options']).strip()
                    if not options_str:
                        raise ValueError("Options string is empty")

                    print(f"Processing options string: {options_str}")  # Debug print

                    # Find all letter prefixes first
                    prefixes = []
                    for letter in 'abcdefghijklmnopqrstuvwxyz':
                        prefix = f"{letter}."
                        pos = options_str.find(prefix)
                        if pos != -1:
                            prefixes.append((letter, pos))
                    
                    prefixes.sort(key=lambda x: x[1])  # Sort by position in case they're out of order
                    
                    if not prefixes:
                        raise ValueError("No valid options found (no letter prefixes)")
                    
                    # Extract options using the found prefixes
                    for idx, (letter, start_pos) in enumerate(prefixes):
                        # Get the end position from the next prefix or end of string
                        if idx < len(prefixes) - 1:
                            end_pos = prefixes[idx + 1][1]
                        else:
                            end_pos = len(options_str)
                        
                        # Extract and clean the option text
                        option_text = options_str[start_pos + 2:end_pos].strip()
                        # Remove trailing comma if present
                        if option_text.endswith(','):
                            option_text = option_text[:-1].strip()
                        
                        if option_text:
                            cleaned_options.append(option_text)
                            print(f"Added option {letter}: {option_text}")  # Debug print

                    if not cleaned_options:
                        raise ValueError("No valid options found after parsing")

                    print(f"Final cleaned options: {cleaned_options}")  # Debug print
                    print(f"Correct answer: {correct_answer}")  # Debug print

                    # Validate the correct answer index
                    answer_index = ord(correct_answer) - ord('a')
                    if answer_index < 0 or answer_index >= len(cleaned_options):
                        raise ValueError(
                            f"Correct answer '{correct_answer}' must be between 'a' and "
                            f"'{chr(ord('a') + len(cleaned_options) - 1)}'. "
                            f"Found {len(cleaned_options)} options: {cleaned_options}"
                        )

                    # Get the correct option
                    correct_option = cleaned_options[answer_index]
                elif question_type == 'free_form':
                    # For free_form questions, the correct_answer is the expected answer text
                    # No options needed
                    pass
                else:
                    raise ValueError(f"Unsupported question type: {question_type}")

                # Get points value, default to 1 if not provided or invalid
                try:
                    points = int(row.get('points', 1))
                    if points <= 0:
                        points = 1
                except (ValueError, TypeError):
                    points = 1
                
                # Create the question object
                try:
                    question = AssessmentQuestion(
                        assessment_id=assessment_id,
                        question_text=row['question_text'],
                        question_type=question_type,
                        options=json.dumps(cleaned_options) if cleaned_options else None,
                        correct_answer=correct_option,
                        category_id=category_id,
                        points=points,
                        order=max_order + i
                    )
                    db.add(question)
                except Exception as e:
                    print(f"Error creating question object: {str(e)}")  # Debug print
                    print(f"Question data: {row}")  # Debug print
                    raise ValueError(f"Error creating question in row {i}: {str(e)}")
            except Exception as e:
                raise ValueError(f"Error processing row {i}: {str(e)}")
            
        db.commit()
        db.refresh(assessment_obj)
        return assessment_obj
        
    except (csv.Error, UnicodeDecodeError) as e:
        raise ValueError(f"Invalid CSV format: {str(e)}")
    except Exception as e:
        db.rollback()
        raise ValueError(f"Error importing CSV: {str(e)}") 