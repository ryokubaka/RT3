from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import and_, extract, func
from typing import List, Dict, Any
from datetime import datetime, date, timedelta
import calendar
from ..dependencies import get_db, get_current_user_dependency as get_current_user
from ..models import TeamRoster, RedTeamTraining

router = APIRouter(prefix="/reports", tags=["reports"])

@router.get("/annual-red-team-training", summary="Generate Annual Red Team Training Report")
def get_annual_red_team_training_report(
    db: Session = Depends(get_db),
    user: TeamRoster = Depends(get_current_user)
):
    """
    Generate Annual Red Team Training Report.
    
    This report shows all operators and their current status for each required training type.
    Each operator must have at least 1 record for each calendar year for each training type.
    """
    
    # Get all active operators
    operators = db.query(TeamRoster).filter(TeamRoster.active == True).order_by(TeamRoster.name).all()
    
    # Per-year required training types
    required_training_types_by_year = {
        2021: [
            "Red Team Member Non-Disclosure Agreement",
            "Red Team Code of Ethics Agreement",
            "Red Team Methodology and Mission Risk Agreement",
            "Red Team Data Handling Agreement",
            "Red Team Code of Conduct Agreement"
        ],
        2022: [
            "Red Team Member Non-Disclosure Agreement",
            "Red Team Code of Ethics Agreement",
            "Red Team Methodology and Mission Risk Agreement",
            "Red Team Data Handling Agreement",
            "Red Team Code of Conduct Agreement"
        ],
        2023: [
            "Red Team Member Non-Disclosure Agreement",
            "Red Team Code of Ethics Agreement",
            "Red Team Methodology and Mission Risk Agreement",
            "Red Team Data Handling Agreement",
            "Red Team Code of Conduct Agreement"
        ]
    }
    # Default for 2024+
    default_required_training_types = [
        "Red Team Member Non-Disclosure Agreement",
        "Red Team Mission Risk Agreement", 
        "Red Team Data Protection Agreement",
        "Red Team Code of Conduct Agreement"
    ]
    
    # Get current year
    current_year = datetime.now().year
    
    # Get all red team training records
    all_training_types = set()
    for types in required_training_types_by_year.values():
        all_training_types.update(types)
    all_training_types.update(default_required_training_types)
    training_records = db.query(RedTeamTraining).filter(
        RedTeamTraining.training_type.in_(all_training_types)
    ).all()
    
    # Create a lookup for training records by operator and year
    training_lookup = {}
    for record in training_records:
        if record.date_submitted:
            year = record.date_submitted.year
            key = (record.operator_name, year, record.training_type)
            training_lookup[key] = record
    
    # Get all unique years from training records and add current year
    years = set()
    for record in training_records:
        if record.date_submitted:
            years.add(record.date_submitted.year)
    years.add(current_year)
    years = sorted(years, reverse=True)  # Most recent first
    
    # Generate report data organized by year first, then by training type
    report_data = []
    per_year_required_types = {}
    
    for year in years:
        # Pick required types for this year
        required_types = required_training_types_by_year.get(year, default_required_training_types)
        per_year_required_types[year] = required_types
        
        year_data = {
            "year": year,
            "required_training_types": required_types,
            "training_types": {}
        }
        
        # Initialize training types structure
        for training_type in required_types:
            year_data["training_types"][training_type] = {
                "operators": {}
            }
        
        for operator in operators:
            # Check if operator was onboarded during this year
            if operator.onboarding_date:
                onboarding_year = operator.onboarding_date.year
                if year < onboarding_year:
                    # Operator wasn't on the team during this year
                    for training_type in required_types:
                        year_data["training_types"][training_type]["operators"][operator.name] = {
                            "operator_handle": operator.operator_handle,
                            "status": "Not Applicable",
                            "reason": f"Onboarded {operator.onboarding_date.strftime('%m/%d/%Y')}",
                            "date_submitted": None,
                            "file_url": None
                        }
                    continue
            
            for training_type in required_types:
                key = (operator.name, year, training_type)
                record = training_lookup.get(key)
                
                if record:
                    year_data["training_types"][training_type]["operators"][operator.name] = {
                        "operator_handle": operator.operator_handle,
                        "status": "Completed",
                        "date_submitted": record.date_submitted,
                        "file_url": record.file_url
                    }
                else:
                    year_data["training_types"][training_type]["operators"][operator.name] = {
                        "operator_handle": operator.operator_handle,
                        "status": "Missing",
                        "date_submitted": None,
                        "file_url": None
                    }
        
        report_data.append(year_data)
    
    # Calculate summary statistics for current year only
    current_year_required_records = 0
    current_year_completed_records = 0
    current_year_not_applicable = 0
    for year_data in report_data:
        if year_data["year"] == current_year:
            for training_type_data in year_data["training_types"].values():
                for operator_data in training_type_data["operators"].values():
                    if operator_data["status"] == "Not Applicable":
                        current_year_not_applicable += 1
                    else:
                        current_year_required_records += 1
                        if operator_data["status"] == "Completed":
                            current_year_completed_records += 1
    current_year_compliance_rate = (current_year_completed_records / current_year_required_records * 100) if current_year_required_records > 0 else 0
    return {
        "report_type": "Annual Red Team Training",
        "generated_at": datetime.now().isoformat(),
        "current_year": current_year,
        "required_training_types": default_required_training_types,
        "per_year_required_training_types": per_year_required_types,
        "summary": {
            "total_operators": len(report_data),
            "current_year_required_records": current_year_required_records,
            "current_year_completed_records": current_year_completed_records,
            "current_year_not_applicable": current_year_not_applicable,
            "current_year_compliance_rate": round(current_year_compliance_rate, 1)
        },
        "data": report_data,
        "years": years
    }

@router.get("/quarterly-legal-briefings", summary="Generate Quarterly Legal Briefings Report")
def get_quarterly_legal_briefings_report(
    db: Session = Depends(get_db),
    user: TeamRoster = Depends(get_current_user)
):
    """
    Generate Quarterly Legal Briefings Report.
    
    This report shows all operators and their current status for quarterly legal briefings.
    Each operator must have at least 1 record of "Red Team Legal Brief" for each quarter.
    Training names are in format "<YEAR> Q<#>".
    
    The report takes into account operator onboarding dates.
    """
    
    # Get all active operators
    operators = db.query(TeamRoster).filter(TeamRoster.active == True).order_by(TeamRoster.name).all()
    
    # Get all legal briefing records
    legal_briefings = db.query(RedTeamTraining).filter(
        RedTeamTraining.training_type == "Red Team Legal Brief"
    ).all()
    
    # Create a lookup for legal briefings by operator and quarter
    briefing_lookup = {}
    for record in legal_briefings:
        if record.training_name:
            key = (record.operator_name, record.training_name)
            briefing_lookup[key] = record
    
    # Get all unique years from training names
    years = set()
    for record in legal_briefings:
        if record.training_name:
            try:
                # Extract year from "YYYY Q#" format
                year = int(record.training_name.split()[0])
                years.add(year)
            except (ValueError, IndexError):
                continue
    
    # Add current year if no records exist
    current_year = datetime.now().year
    years.add(current_year)
    
    # Sort years in descending order
    years = sorted(years, reverse=True)
    
    # Generate report data
    report_data = []
    
    for year in years:
        year_data = {
            "year": year,
            "quarters": {
                "Q1": {"name": f"{year} Q1", "operators": {}},
                "Q2": {"name": f"{year} Q2", "operators": {}},
                "Q3": {"name": f"{year} Q3", "operators": {}},
                "Q4": {"name": f"{year} Q4", "operators": {}}
            }
        }
        
        for operator in operators:
            # Check if operator was onboarded before each quarter
            onboarding_date = operator.onboarding_date
            for quarter in ["Q1", "Q2", "Q3", "Q4"]:
                quarter_name = f"{year} {quarter}"
                # Determine quarter start and end dates
                quarter_start_month = (int(quarter[1]) - 1) * 3 + 1
                quarter_start_date = date(year, quarter_start_month, 1)
                if quarter == "Q4":
                    quarter_end_date = date(year, 12, 31)
                else:
                    next_quarter_start_month = quarter_start_month + 3
                    quarter_end_date = date(year, next_quarter_start_month, 1) - timedelta(days=1)
                key = (operator.name, quarter_name)
                record = briefing_lookup.get(key)
                # If operator joined after this quarter, Not Applicable
                if onboarding_date and onboarding_date > quarter_end_date:
                    year_data["quarters"][quarter]["operators"][operator.name] = {
                        "operator_handle": operator.operator_handle,
                        "status": "Not Applicable",
                        "reason": f"Onboarded {onboarding_date.strftime('%m/%d/%Y')}",
                        "date_submitted": None,
                        "file_url": None
                    }
                # If operator joined during this quarter, Not Applicable UNLESS they have a record
                elif onboarding_date and quarter_start_date <= onboarding_date <= quarter_end_date:
                    if record:
                        year_data["quarters"][quarter]["operators"][operator.name] = {
                            "operator_handle": operator.operator_handle,
                            "status": "Completed",
                            "date_submitted": record.date_submitted,
                            "file_url": record.file_url
                        }
                    else:
                        year_data["quarters"][quarter]["operators"][operator.name] = {
                            "operator_handle": operator.operator_handle,
                            "status": "Not Applicable",
                            "reason": f"Onboarded {onboarding_date.strftime('%m/%d/%Y')}",
                            "date_submitted": None,
                            "file_url": None
                        }
                # Otherwise, normal logic
                else:
                    if record:
                        year_data["quarters"][quarter]["operators"][operator.name] = {
                            "operator_handle": operator.operator_handle,
                            "status": "Completed",
                            "date_submitted": record.date_submitted,
                            "file_url": record.file_url
                        }
                    else:
                        year_data["quarters"][quarter]["operators"][operator.name] = {
                            "operator_handle": operator.operator_handle,
                            "status": "Missing",
                            "date_submitted": None,
                            "file_url": None
                        }
        
        report_data.append(year_data)
    
    # Calculate summary statistics
    total_operators = len(operators)
    total_required_records = 0
    total_completed_records = 0
    total_not_applicable = 0
    
    for year_data in report_data:
        for quarter_data in year_data["quarters"].values():
            for operator_data in quarter_data["operators"].values():
                if operator_data["status"] == "Not Applicable":
                    total_not_applicable += 1
                else:
                    total_required_records += 1
                    if operator_data["status"] == "Completed":
                        total_completed_records += 1
    
    compliance_rate = (total_completed_records / total_required_records * 100) if total_required_records > 0 else 0
    
    return {
        "report_type": "Quarterly Legal Briefings",
        "generated_at": datetime.now().isoformat(),
        "summary": {
            "total_operators": total_operators,
            "total_required_records": total_required_records,
            "total_completed_records": total_completed_records,
            "total_not_applicable": total_not_applicable,
            "compliance_rate": round(compliance_rate, 1)
        },
        "data": report_data,
        "years": years
    } 