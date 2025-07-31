from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from ..database import SessionLocal
from ..models import RedTeamTraining, TeamRoster
from ..schemas import RedTeamTrainingResponse, RedTeamTrainingCreate, RedTeamTrainingUpdate, RedTeamTrainingImportResponse
from ..auth import get_current_user
import re
from datetime import datetime, date, timedelta
from typing import List, Optional
from difflib import SequenceMatcher
import os
from pathlib import Path
from ..utils.file_utils import save_uploaded_file

router = APIRouter()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Training type mappings
TRAINING_TYPE_MAPPINGS = {
    'red_team_code_of_ethics_agreement': 'Red Team Code of Ethics Agreement',
    'red_team_code_of_ethics_v2': 'Red Team Code of Ethics Agreement',
    'code_of_ethics_agreement': 'Red Team Code of Ethics Agreement',
    'red_team_methodology_and_mission_risk_agreement': 'Red Team Methodology and Mission Risk Agreement',
    'red_team_methodology_and_mission_risk': 'Red Team Methodology and Mission Risk Agreement',
    'red_team_member_non_disclosure_agreement': 'Red Team Member Non-Disclosure Agreement',
    'rt_member_non_disclosure_agreement': 'Red Team Member Non-Disclosure Agreement',
    'rt_non_disclosure_agreement': 'Red Team Member Non-Disclosure Agreement',
    'nda': 'Red Team Member Non-Disclosure Agreement',
    'red_team_data_handling_agreement': 'Red Team Data Handling Agreement',
    'red_team_data_handlingagreement': 'Red Team Data Handling Agreement',
    'data_handling_agreement': 'Red Team Data Handling Agreement',
    'red_team_code_of_conduct_agreement': 'Red Team Code of Conduct Agreement',
    'red_team_code_of_conduct_v2': 'Red Team Code of Conduct Agreement',
    'code_of_conduct_agreement': 'Red Team Code of Conduct Agreement',
    'red_team_data_protection_agreement': 'Red Team Data Protection Agreement',
    'data_protection_agreement': 'Red Team Data Protection Agreement',
    'red_team_mission_risk_agreement': 'Red Team Mission Risk Agreement',
    'mission_risk_agreement': 'Red Team Mission Risk Agreement',
    'red_team_legal_brief': 'Red Team Legal Brief',
    'org_cyber_red_team_legal_brief': 'Red Team Legal Brief',
}

# Nickname/alias mappings for operator name matching
NICKNAME_MAPPINGS = {
    'tony': 'anthony',
    'bob': 'robert',
    'rob': 'robert',
    'jim': 'james',
    'jimmy': 'james',
    'mike': 'michael',
    'mikey': 'michael',
    'chris': 'christopher',
    'nick': 'nicholas',
    'alex': 'alexander',
    'sam': 'samuel',
    'dan': 'daniel',
    'danny': 'daniel',
    'joe': 'joseph',
    'tom': 'thomas',
    'tommy': 'thomas',
    'dave': 'david',
    'davey': 'david',
    'steve': 'steven',
    'bill': 'william',
    'billy': 'william',
    'will': 'william',
    'willy': 'william',
    'rick': 'richard',
    'dick': 'richard',
    'rich': 'richard',
    'ken': 'kenneth',
    'kenny': 'kenneth',
    'larry': 'lawrence',
    'gary': 'garrett',
    'phil': 'phillip',
    'tim': 'timothy',
    'timmy': 'timothy',
    'ron': 'ronald',
    'ronnie': 'ronald',
    'don': 'donald',
    'donnie': 'donald',
    'frank': 'franklin',
    'frankie': 'franklin',
    'ray': 'raymond',
    'gene': 'eugene',
    'ed': 'edward',
    'eddie': 'edward',
    'ted': 'edward',
    'teddy': 'edward',
    'fred': 'frederick',
    'freddie': 'frederick',
    'greg': 'gregory',
    'jeff': 'jeffrey',
    'mark': 'marcus',
    'paul': 'paul',
    'scott': 'scott',
    'eric': 'eric',
    'kevin': 'kevin',
    'jason': 'jason',
    'justin': 'justin',
    'brandon': 'brandon',
    'ryan': 'ryan',
    'jacob': 'jacob',
    'matthew': 'matthew',
    'joshua': 'joshua',
    'andrew': 'andrew',
    'daniel': 'daniel',
    'christopher': 'christopher',
    'tyler': 'tyler',
    'jose': 'jose',
    'anthony': 'anthony',
    'william': 'william',
    'david': 'david',
    'alexander': 'alexander',
    'nicholas': 'nicholas',
    'james': 'james',
    'john': 'john',
    'nathan': 'nathan',
    'samuel': 'samuel',
    'christian': 'christian',
    'benjamin': 'benjamin',
    'jonathan': 'jonathan',
    'dylan': 'dylan',
    'elijah': 'elijah',
    'steven': 'steven',
    'brian': 'brian',
    'jordan': 'jordan',
    'austin': 'austin',
    'evan': 'evan',
    'sean': 'sean',
    'cameron': 'cameron',
    'hunter': 'hunter',
    'isaac': 'isaac',
    'mason': 'mason',
    'owen': 'owen',
    'landon': 'landon',
    'logan': 'logan',
    'adrian': 'adrian',
    'kyle': 'kyle',
    'gavin': 'gavin',
    'jayden': 'jayden',
    'julian': 'julian',
    'aaron': 'aaron',
    'charles': 'charles',
    'luis': 'luis',
    'adam': 'adam',
    'lucas': 'lucas',
    'aidan': 'aidan',
    'jackson': 'jackson',
    'ian': 'ian',
    'robert': 'robert',
    'everett': 'everett',
    'gabriel': 'gabriel',
    'finn': 'finn',
    'carter': 'carter',
    'theodore': 'theodore',
    'angelo': 'angelo'
}

# Initials mappings for operator name matching
INITIALS_MAPPINGS = {
    'SAP': 'Sharaya',  # Example - replace with actual operator name
    'Ru': 'Rudolph',
    # Add more initials mappings as needed
    # Format: 'INITIALS': 'Full Name'
}

def extract_training_type(filename: str) -> Optional[str]:
    """Extract training type from filename"""
    # Convert to lowercase and replace spaces/underscores
    filename_lower = filename.lower().replace(' ', '_').replace('-', '_')
    
    # Sort keys by length (longest first) to avoid partial matches
    sorted_keys = sorted(TRAINING_TYPE_MAPPINGS.keys(), key=len, reverse=True)
    
    for key in sorted_keys:
        # Use word boundaries to avoid partial matches
        # Look for the key as a complete word/phrase
        if f"_{key}_" in filename_lower or filename_lower.startswith(f"{key}_") or filename_lower.endswith(f"_{key}"):
            return TRAINING_TYPE_MAPPINGS[key]
    
    return None

def extract_date_from_filename(filename: str) -> Optional[date]:
    """Extract date from filename (format: YYYYMMDD)"""
    # Look for 8-digit date pattern
    date_pattern = r'(\d{8})'
    match = re.search(date_pattern, filename)
    
    if match:
        date_str = match.group(1)
        try:
            return datetime.strptime(date_str, '%Y%m%d').date()
        except ValueError:
            pass
    
    return None

def extract_quarter_info_from_filename(filename: str) -> Optional[tuple[int, int, date]]:
    """Extract quarter information from legal brief filename format
    Returns: (year, quarter_number, submission_date) or None
    Handles:
      - '...First Quarter_24July2023...'
      - '...Second Quarter_20210623...'
      - '...Q3_24July2023...'
      - '...20210623...'
      - '...03012022...'
      - '...14 Aug 2024...'
      - '...17Jan25...' (DDMONYY format)
    """
    import re
    from datetime import datetime, date

    # 1. Try to extract explicit quarter (First/Second/Third/Fourth) and a date (YYYYMMDD, MMDDYYYY, DDMmmYYYY, DDMmmYY, or DD Mmm YYYY)
    quarter_word_match = re.search(r'(First|Second|Third|Fourth)\s+Quarter', filename, re.IGNORECASE)
    date_match = re.search(r'(\d{8})', filename)
    # DDMmmYYYY (e.g., 24July2023)
    alt_date_match = re.search(r'(\d{1,2})([A-Za-z]+)(\d{4})', filename)
    # DDMmmYY (e.g., 17Jan25)
    short_date_match = re.search(r'(\d{1,2})([A-Za-z]+)(\d{2})', filename)
    # DD Mmm YYYY (e.g., 14 Aug 2024)
    spaced_date_match = re.search(r'(\d{1,2})[\s\-_]([A-Za-z]{3,9})[\s\-_](\d{4})', filename)

    quarter_mapping = {'first': 1, 'second': 2, 'third': 3, 'fourth': 4}

    def try_parse_8digit_date(date_str):
        # Try YYYYMMDD first
        try:
            d = datetime.strptime(date_str, '%Y%m%d').date()
            return d
        except ValueError:
            pass
        # Try MMDDYYYY
        try:
            d = datetime.strptime(date_str, '%m%d%Y').date()
            return d
        except ValueError:
            pass
        return None

    if quarter_word_match and date_match:
        quarter_word = quarter_word_match.group(1).lower()
        quarter_num = quarter_mapping.get(quarter_word)
        date_str = date_match.group(1)
        submission_date = try_parse_8digit_date(date_str)
        if submission_date:
            year = submission_date.year
            return (year, quarter_num, submission_date)

    # 2. Try to extract quarter from Q1/Q2/Q3/Q4 and a date
    qnum_match = re.search(r'Q([1-4])', filename, re.IGNORECASE)
    if qnum_match and date_match:
        quarter_num = int(qnum_match.group(1))
        date_str = date_match.group(1)
        submission_date = try_parse_8digit_date(date_str)
        if submission_date:
            year = submission_date.year
            return (year, quarter_num, submission_date)

    # 3. Try to extract quarter from First/Second/Third/Fourth Quarter and alt date (24July2023)
    if quarter_word_match and alt_date_match:
        quarter_word = quarter_word_match.group(1).lower()
        quarter_num = quarter_mapping.get(quarter_word)
        day = int(alt_date_match.group(1))
        month_name = alt_date_match.group(2)
        year = int(alt_date_match.group(3))
        try:
            month_num = datetime.strptime(month_name, '%B').month
        except ValueError:
            try:
                month_num = datetime.strptime(month_name, '%b').month
            except ValueError:
                return None
        submission_date = date(year, month_num, day)
        return (year, quarter_num, submission_date)

    # 3.5. Try to extract quarter from First/Second/Third/Fourth Quarter and short date (17Jan25)
    if quarter_word_match and short_date_match:
        quarter_word = quarter_word_match.group(1).lower()
        quarter_num = quarter_mapping.get(quarter_word)
        day = int(short_date_match.group(1))
        month_name = short_date_match.group(2)
        year_short = int(short_date_match.group(3))
        # Convert 2-digit year to 4-digit year (assuming 20xx for years 00-99)
        year = 2000 + year_short if year_short < 100 else year_short
        try:
            month_num = datetime.strptime(month_name, '%B').month
        except ValueError:
            try:
                month_num = datetime.strptime(month_name, '%b').month
            except ValueError:
                return None
        submission_date = date(year, month_num, day)
        return (year, quarter_num, submission_date)

    # 4. Try to extract quarter from Q1/Q2/Q3/Q4 and alt date
    if qnum_match and alt_date_match:
        quarter_num = int(qnum_match.group(1))
        day = int(alt_date_match.group(1))
        month_name = alt_date_match.group(2)
        year = int(alt_date_match.group(3))
        try:
            month_num = datetime.strptime(month_name, '%B').month
        except ValueError:
            try:
                month_num = datetime.strptime(month_name, '%b').month
            except ValueError:
                return None
        submission_date = date(year, month_num, day)
        return (year, quarter_num, submission_date)

    # 4.5. Try to extract quarter from Q1/Q2/Q3/Q4 and short date (17Jan25)
    if qnum_match and short_date_match:
        quarter_num = int(qnum_match.group(1))
        day = int(short_date_match.group(1))
        month_name = short_date_match.group(2)
        year_short = int(short_date_match.group(3))
        # Convert 2-digit year to 4-digit year (assuming 20xx for years 00-99)
        year = 2000 + year_short if year_short < 100 else year_short
        try:
            month_num = datetime.strptime(month_name, '%B').month
        except ValueError:
            try:
                month_num = datetime.strptime(month_name, '%b').month
            except ValueError:
                return None
        submission_date = date(year, month_num, day)
        return (year, quarter_num, submission_date)

    # 5. Try to extract quarter from First/Second/Third/Fourth Quarter and spaced date (14 Aug 2024)
    if quarter_word_match and spaced_date_match:
        quarter_word = quarter_word_match.group(1).lower()
        quarter_num = quarter_mapping.get(quarter_word)
        day = int(spaced_date_match.group(1))
        month_name = spaced_date_match.group(2)
        year = int(spaced_date_match.group(3))
        try:
            month_num = datetime.strptime(month_name, '%B').month
        except ValueError:
            try:
                month_num = datetime.strptime(month_name, '%b').month
            except ValueError:
                return None
        submission_date = date(year, month_num, day)
        return (year, quarter_num, submission_date)

    # 6. Try to extract quarter from Q1/Q2/Q3/Q4 and spaced date
    if qnum_match and spaced_date_match:
        quarter_num = int(qnum_match.group(1))
        day = int(spaced_date_match.group(1))
        month_name = spaced_date_match.group(2)
        year = int(spaced_date_match.group(3))
        try:
            month_num = datetime.strptime(month_name, '%B').month
        except ValueError:
            try:
                month_num = datetime.strptime(month_name, '%b').month
            except ValueError:
                return None
        submission_date = date(year, month_num, day)
        return (year, quarter_num, submission_date)

    # 7. If only date (YYYYMMDD or MMDDYYYY) is found, infer quarter from month
    if date_match:
        date_str = date_match.group(1)
        submission_date = try_parse_8digit_date(date_str)
        if submission_date:
            year = submission_date.year
            month = submission_date.month
            quarter_num = (month - 1) // 3 + 1
            return (year, quarter_num, submission_date)

    # 8. If only alt date is found, infer quarter from month
    if alt_date_match:
        day = int(alt_date_match.group(1))
        month_name = alt_date_match.group(2)
        year = int(alt_date_match.group(3))
        try:
            month_num = datetime.strptime(month_name, '%B').month
        except ValueError:
            try:
                month_num = datetime.strptime(month_name, '%b').month
            except ValueError:
                return None
        submission_date = date(year, month_num, day)
        quarter_num = (month_num - 1) // 3 + 1
        return (year, quarter_num, submission_date)

    # 8.5. If only short date is found, infer quarter from month
    if short_date_match:
        day = int(short_date_match.group(1))
        month_name = short_date_match.group(2)
        year_short = int(short_date_match.group(3))
        # Convert 2-digit year to 4-digit year (assuming 20xx for years 00-99)
        year = 2000 + year_short if year_short < 100 else year_short
        try:
            month_num = datetime.strptime(month_name, '%B').month
        except ValueError:
            try:
                month_num = datetime.strptime(month_name, '%b').month
            except ValueError:
                return None
        submission_date = date(year, month_num, day)
        quarter_num = (month_num - 1) // 3 + 1
        return (year, quarter_num, submission_date)

    # 9. If only spaced date is found, infer quarter from month
    if spaced_date_match:
        day = int(spaced_date_match.group(1))
        month_name = spaced_date_match.group(2)
        year = int(spaced_date_match.group(3))
        try:
            month_num = datetime.strptime(month_name, '%B').month
        except ValueError:
            try:
                month_num = datetime.strptime(month_name, '%b').month
            except ValueError:
                return None
        submission_date = date(year, month_num, day)
        quarter_num = (month_num - 1) // 3 + 1
        return (year, quarter_num, submission_date)

    return None

def get_quarter_end_date(year: int, quarter: int) -> date:
    """Get the last day of the specified quarter"""
    quarter_end_months = {1: 3, 2: 6, 3: 9, 4: 12}
    month = quarter_end_months.get(quarter, 12)
    
    # Get the last day of the month
    if month == 12:
        next_month = date(year + 1, 1, 1)
    else:
        next_month = date(year, month + 1, 1)
    
    return next_month - timedelta(days=1)

def extract_operator_from_filename(filename: str, team_members: List[TeamRoster]) -> Optional[str]:
    """Recursively search the filename for operator names (full name, last name, or initial+last)."""
    # Normalize filename: lowercase, replace _ and - with spaces, remove extension and bracketed suffixes
    name_part = filename.lower()
    name_part = re.sub(r'\.(pdf|doc|docx|txt)$', '', name_part)
    name_part = re.sub(r'\[.*?\]', '', name_part)  # Remove [1], [2], etc.
    name_part = name_part.replace('_', ' ').replace('-', ' ')
    name_part = re.sub(r'\s+', ' ', name_part)

    matches = []
    last_name_matches = []
    initials_last_matches = []

    for member in team_members:
        op_name = member.name.lower()
        op_name_nospace = op_name.replace(' ', '')
        op_last = op_name.split()[-1]
        op_first = op_name.split()[0]
        op_initial_last = f"{op_first[0]}{op_last}".lower()
        
        # Create "last first" version of the name
        op_name_last_first = f"{op_last} {op_first}".lower()
        op_name_last_first_nospace = op_name_last_first.replace(' ', '')

        # Check for nickname matches and create expanded name variations
        expanded_names = [op_name, op_name_nospace, op_name_last_first, op_name_last_first_nospace]
        
        # Add nickname variations if the first name has a nickname mapping
        if op_first in NICKNAME_MAPPINGS:
            nickname = NICKNAME_MAPPINGS[op_first]
            nickname_name = f"{nickname} {op_last}".lower()
            nickname_name_nospace = nickname_name.replace(' ', '')
            nickname_last_first = f"{op_last} {nickname}".lower()
            nickname_last_first_nospace = nickname_last_first.replace(' ', '')
            expanded_names.extend([nickname_name, nickname_name_nospace, nickname_last_first, nickname_last_first_nospace])
        
        # Also check if the first name is a nickname for another name
        for nickname, full_name in NICKNAME_MAPPINGS.items():
            if op_first == full_name:
                nickname_name = f"{nickname} {op_last}".lower()
                nickname_name_nospace = nickname_name.replace(' ', '')
                nickname_last_first = f"{op_last} {nickname}".lower()
                nickname_last_first_nospace = nickname_last_first.replace(' ', '')
                expanded_names.extend([nickname_name, nickname_name_nospace, nickname_last_first, nickname_last_first_nospace])
        
        # Check for initials mappings
        for initials, full_name in INITIALS_MAPPINGS.items():
            # Check if the initials mapping matches this operator (full name or first name)
            if (full_name.lower() == op_name or 
                full_name.lower() == op_first or 
                full_name.lower() in op_name):
                # Add the initials as a potential match
                expanded_names.append(initials.lower())
                expanded_names.append(initials.lower().replace(' ', ''))

        # 1. Full name match (first last or last first, with or without spaces, including nicknames)
        for expanded_name in expanded_names:
            if expanded_name in name_part or expanded_name in name_part.replace(' ', ''):
                matches.append(member.name)
                break
        else:
            # 2. Last name match
            if op_last in name_part:
                last_name_matches.append((member.name, op_first[0], op_first))
            # 3. Initial+last (e.g., SMeow)
            if op_initial_last in name_part.replace(' ', ''):
                initials_last_matches.append(member.name)

    # Prefer full name match
    if len(matches) == 1:
        return matches[0]
    elif len(matches) > 1:
        # Ambiguous full name match
        return None
    # If only one initial+last match, use it
    if len(initials_last_matches) == 1:
        return initials_last_matches[0]
    elif len(initials_last_matches) > 1:
        return None
    # If only one last name match, use it
    if len(last_name_matches) == 1:
        return last_name_matches[0][0]
    elif len(last_name_matches) > 1:
        # Try to disambiguate with first name or first initial
        for name, initial, first_name in last_name_matches:
            # Check for first initial + last name pattern
            if f"{initial}{name.split()[-1].lower()}" in name_part.replace(' ', ''):
                return name
            # Check for first name + last name pattern (in either order)
            if f"{first_name.lower()}{name.split()[-1].lower()}" in name_part.replace(' ', ''):
                return name
            # Check for last name + first name pattern
            if f"{name.split()[-1].lower()}{first_name.lower()}" in name_part.replace(' ', ''):
                return name
        # Still ambiguous
        return None
    return None

@router.post("/import", response_model=RedTeamTrainingImportResponse)
async def import_red_team_training(
    files: List[UploadFile] = File(...),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Import Red Team training records from uploaded files"""
    
    # Get all team members for operator matching
    team_members = db.query(TeamRoster).filter(TeamRoster.active == True).all()
    
    imported_records = []
    errors = []
    skipped = []
    
    for file in files:
        try:
            filename = file.filename
            
            # Extract training type
            training_type = extract_training_type(filename)
            if not training_type:
                errors.append(f"Could not determine training type from filename: {filename}")
                continue
            
            # Special handling for Red Team Legal Brief
            if training_type == "Red Team Legal Brief":
                quarter_info = extract_quarter_info_from_filename(filename)
                if not quarter_info:
                    errors.append(f"Could not extract quarter information from legal brief filename: {filename}")
                    continue
                
                year, quarter, submission_date = quarter_info
                due_date = get_quarter_end_date(year, quarter)
                expiration_date = get_quarter_end_date(year, quarter)
                training_name = f"{year} Q{quarter}"
            else:
                # Extract date for other training types
                submission_date = extract_date_from_filename(filename)
                if not submission_date:
                    errors.append(f"Could not extract date from filename: {filename}")
                    continue
                
                # Calculate due date and expiration date (December 31st of submission year)
                year = submission_date.year
                due_date = date(year, 12, 31)
                expiration_date = date(year, 12, 31)
                training_name = f"{year} Agreement"
            
            # Extract operator
            operator_name = extract_operator_from_filename(filename, team_members)
            if not operator_name:
                errors.append(f"Could not match operator from filename: {filename}")
                continue
            
            # Calculate due date and expiration date (December 31st of submission year)
            year = submission_date.year
            due_date = date(year, 12, 31)
            expiration_date = date(year, 12, 31)
            
            # Save the uploaded file to the appropriate operator's directory
            file_url = save_uploaded_file(file, operator_name, "red_team")
            
            # Create training record
            training_data = {
                "operator_name": operator_name,
                "training_name": training_name,
                "training_type": training_type,
                "due_date": due_date,
                "expiration_date": expiration_date,
                "date_submitted": submission_date,
                "file_url": file_url
            }
            
            # Check if record already exists
            existing = db.query(RedTeamTraining).filter(
                RedTeamTraining.operator_name == operator_name,
                RedTeamTraining.training_type == training_type,
                RedTeamTraining.date_submitted == submission_date
            ).first()
            
            if existing:
                # Track skipped duplicates for user notification
                skipped.append(f"Record already exists for {operator_name} - {training_type} on {submission_date}")
                continue
            
            # Create new record
            db_training = RedTeamTraining(**training_data)
            db.add(db_training)
            imported_records.append(db_training)
            
        except Exception as e:
            errors.append(f"Error processing {file.filename}: {str(e)}")
    
    try:
        db.commit()
        # Refresh all imported records to get their IDs
        for record in imported_records:
            db.refresh(record)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    
    # Return results
    return {
        "imported": len(imported_records),
        "errors": errors,
        "skipped": skipped,
        "records": imported_records
    }

@router.get("", response_model=list[RedTeamTrainingResponse])
def get_red_team_training(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    training = db.query(RedTeamTraining).offset(skip).limit(limit).all()
    return training

@router.post("", response_model=RedTeamTrainingResponse)
def create_red_team_training(
    training: RedTeamTrainingCreate,
    db: Session = Depends(get_db)
):
    db_training = RedTeamTraining(**training.model_dump())
    db.add(db_training)
    db.commit()
    db.refresh(db_training)
    return db_training

@router.get("/{training_id}", response_model=RedTeamTrainingResponse)
def get_red_team_training_by_id(
    training_id: int,
    db: Session = Depends(get_db)
):
    training = db.query(RedTeamTraining).filter(RedTeamTraining.id == training_id).first()
    if not training:
        raise HTTPException(status_code=404, detail="Training not found")
    return training

@router.put("/{training_id}", response_model=RedTeamTrainingResponse)
def update_red_team_training(
    training_id: int,
    training: RedTeamTrainingUpdate,
    db: Session = Depends(get_db)
):
    db_training = db.query(RedTeamTraining).filter(RedTeamTraining.id == training_id).first()
    if not db_training:
        raise HTTPException(status_code=404, detail="Training not found")
    
    for key, value in training.model_dump(exclude_unset=True).items():
        setattr(db_training, key, value)
    
    db.commit()
    db.refresh(db_training)
    return db_training

@router.delete("/{training_id}")
def delete_red_team_training(
    training_id: int,
    db: Session = Depends(get_db)
):
    training = db.query(RedTeamTraining).filter(RedTeamTraining.id == training_id).first()
    if not training:
        raise HTTPException(status_code=404, detail="Training not found")
    
    db.delete(training)
    db.commit()
    return {"message": "Training deleted successfully"} 