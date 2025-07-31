# backend/app/routes/team_roster.py
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, Body, UploadFile, File
from fastapi.responses import RedirectResponse
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from ..auth import admin_required, get_current_user, verify_password, get_password_hash, create_access_token, ACCESS_TOKEN_EXPIRE_MINUTES, authenticate_user
from ..database import SessionLocal
from ..models import TeamRoster, Image
from ..schemas import TeamRosterResponse, TeamRosterUpdate, TeamRosterBase, Token
from ..ldap_auth import ldap_auth
import os
import uuid
from pathlib import Path
from datetime import timedelta, datetime, date
from ..config import UPLOAD_DIR
import csv
from io import StringIO
from pydantic import BaseModel

router = APIRouter()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

class LdapToggleRequest(BaseModel):
    enabled: bool

@router.get("/ldap/status")
async def get_ldap_status():
    """Get LDAP authentication status"""
    return {
        "enabled": ldap_auth.enabled,
        "host": ldap_auth.host if ldap_auth.enabled else None,
        "port": ldap_auth.port if ldap_auth.enabled else None,
        "label": ldap_auth.attributes.get("label", "LDAP") if ldap_auth.enabled else None,
        "encryption": ldap_auth.encryption if ldap_auth.enabled else None,
        "active_directory": ldap_auth.active_directory if ldap_auth.enabled else None
    }

@router.post("/ldap/toggle")
async def toggle_ldap_status(
    body: LdapToggleRequest
):
    """Dynamically toggle LDAP authentication (no auth required)"""
    try:
        enabled = body.enabled
        # Update the environment variable
        os.environ["LDAP_ENABLED"] = str(enabled).lower()
        
        # Reinitialize the LDAP authenticator
        ldap_auth.enabled = enabled
        
        return {
            "success": True,
            "enabled": enabled,
            "message": f"LDAP authentication {'enabled' if enabled else 'disabled'}"
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to toggle LDAP status: {str(e)}"
        )

@router.get("", response_model=List[TeamRosterResponse])
def read_team_roster(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    roster = db.query(TeamRoster).order_by(TeamRoster.name.asc()).all()
    return roster

@router.get("/active-count", response_model=dict)
def get_active_members_count(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    count = db.query(TeamRoster).filter(TeamRoster.active == True).count()
    return {"count": count}

@router.post("", response_model=TeamRosterResponse)
async def create_team_member(
    member: TeamRosterBase,
    db: Session = Depends(get_db),
    current_user: dict = Depends(admin_required)
):
    if not member.password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password is required for new team members"
        )
    
    # Hash the password
    hashed_password = get_password_hash(member.password)
    
    # Create the team roster entry
    entry_data = member.model_dump(exclude={'password'})
    entry = TeamRoster(
        **entry_data,
        hashed_password=hashed_password
    )
    
    db.add(entry)
    try:
        db.commit()
        db.refresh(entry)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    return entry

@router.put("/{id}", response_model=TeamRosterResponse)
async def update_team_member(
    id: int,
    member: TeamRosterUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(admin_required)
):
    if "ADMIN" not in current_user.team_role.upper():
        raise HTTPException(status_code=403, detail="Only admins can update team members")
    
    db_member = db.query(TeamRoster).filter(TeamRoster.id == id).first()
    if not db_member:
        raise HTTPException(status_code=404, detail="Team member not found")
    
    # Check if operator handle already exists (excluding current member)
    if member.operator_handle:
        existing_member = db.query(TeamRoster).filter(
            TeamRoster.operator_handle == member.operator_handle,
            TeamRoster.id != id
        ).first()
        if existing_member:
            raise HTTPException(status_code=400, detail="Operator handle already exists")
    
    # Check if email already exists (excluding current member)
    if member.email:
        existing_email = db.query(TeamRoster).filter(
            TeamRoster.email == member.email,
            TeamRoster.id != id
        ).first()
        if existing_email:
            raise HTTPException(status_code=400, detail="Email already exists")
    
    # Update member fields
    update_data = member.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if field == "password" and value:
            setattr(db_member, "hashed_password", get_password_hash(value))
        else:
            setattr(db_member, field, value)
    
    try:
        db.commit()
        db.refresh(db_member)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    return db_member

@router.delete("/{id}")
def delete_team_roster(
    id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(admin_required)
):
    entry = db.query(TeamRoster).filter(TeamRoster.id == id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Team member not found")
    
    try:
        db.delete(entry)
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    return {"message": "Team member deleted successfully"}

@router.get("/by-name/{name}", response_model=TeamRosterResponse)
def get_roster_by_name(
    name: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get team roster entry by operator name"""
    entry = db.query(TeamRoster).filter(TeamRoster.name == name).first()
    if not entry:
        raise HTTPException(status_code=404, detail=f"Team member '{name}' not found")
    return entry

@router.post("/login", response_model=Token)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    # Use the unified authentication function that handles both local and LDAP
    user = authenticate_user(db, form_data.username, form_data.password)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username/email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={
            "sub": user.operator_handle,
            "role": user.team_role,
            "name": user.name,
        },
        expires_delta=access_token_expires
    )
    
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/create")
async def create_team_member(
    name: str = Body(...),
    operator_handle: str = Body(...),
    password: str = Body(...),
    email: str = Body(...),
    team_role: str = Body(...),
    db: Session = Depends(get_db)
):
    # Check if operator_handle or email already exists
    existing_user = db.query(TeamRoster).filter(
        (TeamRoster.operator_handle == operator_handle) | (TeamRoster.email == email)
    ).first()
    
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Operator handle or email already registered"
        )
    
    # Create new team member
    hashed_password = get_password_hash(password)
    new_member = TeamRoster(
        name=name,
        operator_handle=operator_handle,
        hashed_password=hashed_password,
        email=email,
        team_role=team_role,
        onboarding_date=datetime.utcnow().date(),
        active=True
    )
    
    db.add(new_member)
    db.commit()
    db.refresh(new_member)
    
    return {"message": "Team member created successfully", "id": new_member.id}

@router.put("/me/password")
async def change_me_password(
    password_data: dict = Body(...),
    db: Session = Depends(get_db),
    current_user: TeamRoster = Depends(get_current_user)
):
    try:
        print(f"Received password change request: {password_data}")
        current_password = password_data.get("current_password")
        new_password = password_data.get("new_password")
        
        if not current_password or not new_password:
            print(f"Missing password fields. Current: {bool(current_password)}, New: {bool(new_password)}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Current password and new password are required"
            )
        
        print(f"Verifying current password for user {current_user.operator_handle}")
        # Verify current password
        if not verify_password(current_password, current_user.hashed_password):
            print("Current password verification failed")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Current password is incorrect"
            )
        
        print("Current password verified, updating to new password")
        # Get a fresh copy of the user from the database
        user = db.query(TeamRoster).filter(TeamRoster.id == current_user.id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Update password
        user.hashed_password = get_password_hash(new_password)
        try:
            db.commit()
            db.refresh(user)
            print("Password updated successfully")
        except Exception as e:
            print(f"Database error during password update: {str(e)}")
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to update password: {str(e)}"
            )
        
        return {
            "id": user.id,
            "name": user.name,
            "operator_handle": user.operator_handle,
            "team_role": user.team_role,
            "role": user.team_role,
            "email": user.email,
            "avatar_id": user.avatar_id,
            "active": user.active
        }
    except Exception as e:
        print(f"Unexpected error in password change: {str(e)}")
        raise

@router.put("/{member_id}/password")
async def change_member_password(
    member_id: int,
    current_password: str = Body(...),
    new_password: str = Body(...),
    db: Session = Depends(get_db),
    current_user: TeamRoster = Depends(get_current_user)
):
    # Verify current user is admin or the member themselves
    if current_user.id != member_id and "ADMIN" not in current_user.team_role:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    member = db.query(TeamRoster).filter(TeamRoster.id == member_id).first()
    if not member:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Team member not found"
        )
    
    # If not admin, verify current password
    if current_user.id == member_id and not verify_password(current_password, member.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Current password is incorrect"
        )
    
    # Update password
    member.hashed_password = get_password_hash(new_password)
    db.commit()
    
    return {"message": "Password updated successfully"}

@router.get("/me")
async def get_current_user_info(
    db: Session = Depends(get_db),
    current_user: TeamRoster = Depends(get_current_user)
):
    # Load the avatar relationship
    avatar = None
    if current_user.avatar_id:
        avatar = db.query(Image).filter(Image.id == current_user.avatar_id).first()
    
    return {
        "id": current_user.id,
        "name": current_user.name,
        "operator_handle": current_user.operator_handle,
        "team_role": current_user.team_role,
        "role": current_user.team_role,
        "email": current_user.email,
        "avatar_id": current_user.avatar_id,
        "avatar": avatar,
        "active": current_user.active
    }

@router.post("/me/avatar/upload")
async def upload_avatar(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: TeamRoster = Depends(get_current_user)
):
    # Create user's upload directory if it doesn't exist
    user_upload_dir = Path(UPLOAD_DIR) / str(current_user.operator_handle)
    user_upload_dir.mkdir(parents=True, exist_ok=True)
    
    # Generate unique filename
    file_extension = os.path.splitext(file.filename)[1]
    unique_filename = f"{uuid.uuid4()}{file_extension}"
    file_path = user_upload_dir / unique_filename
    
    # Save the file
    try:
        with open(file_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")
    
    # Create image record in database with relative path
    relative_path = f"uploads/{current_user.operator_handle}/{unique_filename}"
    image = Image(
        filename=unique_filename,
        file_path=relative_path,
        content_type=file.content_type,
        image_type="avatar",
        uploaded_by=current_user.id
    )
    db.add(image)
    db.commit()
    db.refresh(image)
    
    # Update user's avatar
    user = db.query(TeamRoster).filter(TeamRoster.id == current_user.id).first()
    user.avatar_id = image.id
    db.commit()
    
    return {
        "id": image.id,
        "direct_url": f"/uploads/{current_user.operator_handle}/{unique_filename}",
        "filename": unique_filename
    }

@router.put("/me/avatar")
async def update_avatar(
    image_data: dict = Body(...),
    db: Session = Depends(get_db),
    current_user: TeamRoster = Depends(get_current_user)
):
    # Get the image
    image = db.query(Image).filter(Image.id == image_data["image_id"]).first()
    if not image:
        raise HTTPException(status_code=404, detail="Image not found")
    
    # Delete old avatar if it exists
    if current_user.avatar and current_user.avatar.id != image.id:
        try:
            # Delete the old file
            os.remove(current_user.avatar.file_path)
            # Delete the old image record
            db.delete(current_user.avatar)
            db.commit()
        except Exception as e:
            print(f"Error deleting old avatar: {str(e)}")
            # Continue even if deletion fails
    
    # Update user's avatar
    current_user.avatar_id = image.id
    db.commit()
    
    return {
        "id": current_user.id,
        "name": current_user.name,
        "operator_handle": current_user.operator_handle,
        "team_role": current_user.team_role,
        "role": current_user.team_role,
        "email": current_user.email,
        "avatar_id": current_user.avatar_id,
        "active": current_user.active
    }

@router.delete("/me/avatar")
async def delete_avatar(
    db: Session = Depends(get_db),
    current_user: TeamRoster = Depends(get_current_user)
):
    if not current_user.avatar:
        raise HTTPException(status_code=404, detail="No avatar found")
    
    try:
        # Delete the file
        file_path = Path(UPLOAD_DIR) / str(current_user.operator_handle) / current_user.avatar.filename
        if file_path.exists():
            os.remove(file_path)
        
        # Delete the image record
        db.delete(current_user.avatar)
        
        # Clear the user's avatar_id
        current_user.avatar_id = None
        db.commit()
    except Exception as e:
        print(f"Error deleting avatar: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to delete avatar")
    
    return {
        "id": current_user.id,
        "name": current_user.name,
        "operator_handle": current_user.operator_handle,
        "team_role": current_user.team_role,
        "role": current_user.team_role,
        "email": current_user.email,
        "avatar_id": current_user.avatar_id,
        "active": current_user.active
    }

@router.put("/me/email")
async def update_email(
    email_data: dict = Body(...),
    db: Session = Depends(get_db),
    current_user: TeamRoster = Depends(get_current_user)
):
    new_email = email_data.get("email")
    if not new_email:
        raise HTTPException(status_code=400, detail="Email is required")
    
    # Check if email is already taken
    existing_user = db.query(TeamRoster).filter(
        TeamRoster.email == new_email,
        TeamRoster.id != current_user.id
    ).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already in use")
    
    current_user.email = new_email
    db.commit()
    
    return {
        "id": current_user.id,
        "name": current_user.name,
        "operator_handle": current_user.operator_handle,
        "team_role": current_user.team_role,
        "role": current_user.team_role,
        "email": current_user.email,
        "avatar_id": current_user.avatar_id,
        "active": current_user.active
    }

@router.post("/import", response_model=List[TeamRosterResponse])
async def import_team_roster(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: dict = Depends(admin_required)
):
    """
    Import team roster entries from a CSV file.
    The CSV should have the following columns:
    - name
    - operator_handle
    - email
    - team_role (can be a single role or comma-separated list of roles)
    - onboarding_date (MM/DD/YYYY)
    - operator_level
    - compliance_8570
    - legal_document_status
    - active
    """
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="File must be a CSV file")
    
    try:
        contents = await file.read()
        
        # Try different encodings to handle various CSV file formats
        encodings_to_try = ['utf-8', 'utf-8-sig', 'cp1252', 'latin-1', 'iso-8859-1']
        csv_data = None
        
        for encoding in encodings_to_try:
            try:
                csv_data = StringIO(contents.decode(encoding))
                break
            except UnicodeDecodeError:
                continue
        
        if csv_data is None:
            raise HTTPException(
                status_code=400, 
                detail="Unable to decode CSV file. Please ensure the file is saved with UTF-8, Windows-1252, or Latin-1 encoding."
            )
        
        csv_reader = csv.DictReader(csv_data)
        
        imported_members = []
        role_mapping = {
            'planners': 'Planner',
            'planner': 'Planner',
            'operators': 'Operator',
            'operator': 'Operator',
            'developers': 'Developer',
            'developer': 'Developer',
            'infrastructure': 'Infrastructure',
            'branch chief': 'Branch Chief',
            'team members': 'Team Member',
            'team member': 'Team Member',
            'team': 'Team Member',
            'admin': 'ADMIN',
            'administrator': 'ADMIN',
            'admins': 'ADMIN'
        }
        
        compliance_mapping = {
            'compliant': 'Compliant',
            'non-compliant': 'Non-Compliant',
            'non compliant': 'Non-Compliant',
            'not compliant': 'Non-Compliant'
        }
        
        def process_team_roles(roles_str):
            """Process comma-separated roles and return standardized role string"""
            if not roles_str:
                return ''
            
            # Split by comma and clean up each role
            roles = [role.strip().lower() for role in roles_str.split(',')]
            
            # Map each role and remove duplicates
            mapped_roles = set()
            for role in roles:
                if role in role_mapping:
                    mapped_roles.add(role_mapping[role])
                else:
                    # If role not found in mapping, keep original (capitalized)
                    mapped_roles.add(role.upper())
            
            # Join roles with comma and space
            return ', '.join(sorted(mapped_roles))
        
        for row in csv_reader:
            # Process team roles (can be single or comma-separated)
            team_role = process_team_roles(row.get('team_role', ''))
            
            # Map compliance statuses
            compliance_8570 = row.get('compliance_8570', '').strip().lower()
            if compliance_8570 in compliance_mapping:
                compliance_8570 = compliance_mapping[compliance_8570]
            else:
                compliance_8570 = 'Non-Compliant'  # Default value
                
            legal_status = row.get('legal_document_status', '').strip().lower()
            if legal_status in compliance_mapping:
                legal_status = compliance_mapping[legal_status]
            else:
                legal_status = 'Non-Compliant'  # Default value
            
            # Parse onboarding date
            onboarding_date_str = row.get('onboarding_date', '').strip()
            try:
                # Try parsing MM/DD/YYYY format
                month, day, year = map(int, onboarding_date_str.split('/'))
                onboarding_date = date(year, month, day)
            except (ValueError, AttributeError):
                # If parsing fails, use today's date
                onboarding_date = date.today()
            
            # Create team member data
            member_data = {
                'name': row.get('name', '').strip(),
                'operator_handle': row.get('operator_handle', '').strip(),
                'email': row.get('email', '').strip(),
                'team_role': team_role,
                'onboarding_date': onboarding_date,
                'operator_level': row.get('operator_level', 'Team Member').strip(),
                'compliance_8570': compliance_8570,
                'legal_document_status': legal_status,
                'active': row.get('active', 'true').strip().lower() == 'true' or row.get('active', 'true').strip().lower() == 'yes'
            }
            
            # Validate required fields
            if not all([member_data['name'], member_data['operator_handle'], member_data['email'], member_data['team_role']]):
                continue
            
            # Check if member already exists
            existing_member = db.query(TeamRoster).filter(
                (TeamRoster.operator_handle == member_data['operator_handle']) |
                (TeamRoster.email == member_data['email'])
            ).first()
            
            if existing_member:
                continue
            
            # Hash the default password
            hashed_password = get_password_hash('temp')
            
            # Create new team member with hashed password
            entry = TeamRoster(
                **member_data,
                hashed_password=hashed_password
            )
            db.add(entry)
            imported_members.append(entry)
        
        try:
            db.commit()
            for member in imported_members:
                db.refresh(member)
            return imported_members
        except Exception as e:
            db.rollback()
            raise HTTPException(status_code=400, detail=f"Error importing team members: {str(e)}")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing CSV file: {str(e)}")
