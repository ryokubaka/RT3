from datetime import datetime, timedelta
from typing import Union
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from .database import SessionLocal
from .models import TeamRoster
from .enums import UserRole
from .ldap_auth import ldap_auth

# to get a string like this run:
# openssl rand -hex 32
SECRET_KEY = "09d25e094faa6ca2556c818166b7a9563b93f7099f6f0f4caa6cf63b88e8d3e7"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/team-roster/login")

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def create_access_token(data: dict, expires_delta: Union[timedelta, None] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    user = db.query(TeamRoster).filter(TeamRoster.operator_handle == username).first()
    if user is None:
        raise credentials_exception
    return user

async def get_current_active_user(current_user: TeamRoster = Depends(get_current_user)):
    if not current_user.active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user

def authenticate_user(db: Session, username: str, password: str):
    """
    Authenticate user using either local database or LDAP
    Returns the user object if authentication succeeds, False otherwise
    """
    # First try local authentication
    user = db.query(TeamRoster).filter(TeamRoster.operator_handle == username).first()
    if user and verify_password(password, user.hashed_password):
        return user
    
    # If local authentication fails and LDAP is enabled, try LDAP
    if ldap_auth.enabled:
        ldap_user_info = ldap_auth.authenticate_user(username, password)
        if ldap_user_info:
            # Get or create user from LDAP info
            user = ldap_auth.get_or_create_user(db, ldap_user_info)
            if user:
                return user
    
    return False

async def admin_required(current_user: TeamRoster = Depends(get_current_user)):
    if "ADMIN" not in current_user.team_role.upper():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    return current_user
