# backend/app/database.py
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import os
from .models import Base

# Create data directory if it doesn't exist
os.makedirs("/app/data", exist_ok=True)

# Use a file-based SQLite database
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./data/rt3.db")

# For SQLite, add the check_same_thread parameter
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create the tables. In production, consider using migrations.
Base.metadata.create_all(bind=engine)
