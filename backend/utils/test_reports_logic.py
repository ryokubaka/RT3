#!/usr/bin/env python3
"""
Test script for Reports logic
This script tests the report generation logic with sample data
"""

from datetime import datetime, date
from typing import List, Dict, Any

def test_annual_report_logic():
    """Test the annual report logic with sample data"""
    
    # Sample operators
    operators = [
        {"name": "John Doe", "operator_handle": "jdoe", "onboarding_date": date(2023, 1, 15)},
        {"name": "Jane Smith", "operator_handle": "jsmith", "onboarding_date": date(2024, 7, 11)},
        {"name": "Bob Wilson", "operator_handle": "bwilson", "onboarding_date": None}
    ]
    
    # Sample training records
    training_records = [
        {"operator_name": "John Doe", "training_type": "Red Team Member Non-Disclosure Agreement", "date_submitted": date(2024, 1, 15)},
        {"operator_name": "John Doe", "training_type": "Red Team Mission Risk Agreement", "date_submitted": date(2024, 2, 20)},
        {"operator_name": "John Doe", "training_type": "Red Team Data Protection Agreement", "date_submitted": date(2024, 3, 10)},
        {"operator_name": "John Doe", "training_type": "Red Team Code of Conduct Agreement", "date_submitted": date(2024, 4, 5)},
        {"operator_name": "Jane Smith", "training_type": "Red Team Non-Disclosure Agreement", "date_submitted": date(2024, 8, 1)},
        # Jane Smith missing other training types
    ]
    
    # Required training types
    required_training_types = [
        "Red Team Member Non-Disclosure Agreement",
        "Red Team Mission Risk Agreement", 
        "Red Team Data Protection Agreement",
        "Red Team Code of Conduct Agreement"
    ]
    
    # Current year
    current_year = 2024
    
    # Create lookup for training records
    training_lookup = {}
    for record in training_records:
        if record["date_submitted"]:
            year = record["date_submitted"].year
            key = (record["operator_name"], year, record["training_type"])
            training_lookup[key] = record
    
    # Generate report data
    report_data = []
    
    for operator in operators:
        operator_data = {
            "operator_name": operator["name"],
            "operator_handle": operator["operator_handle"],
            "onboarding_date": operator["onboarding_date"],
            "years": {}
        }
        
        # Check each year from 2024 to current year
        for year in range(2024, current_year + 1):
            year_data = {
                "year": year,
                "training_status": {}
            }
            
            for training_type in required_training_types:
                key = (operator["name"], year, training_type)
                record = training_lookup.get(key)
                
                if record:
                    year_data["training_status"][training_type] = {
                        "status": "Completed",
                        "date_submitted": record["date_submitted"],
                        "file_url": None
                    }
                else:
                    year_data["training_status"][training_type] = {
                        "status": "Missing",
                        "date_submitted": None,
                        "file_url": None
                    }
            
            operator_data["years"][year] = year_data
        
        report_data.append(operator_data)
    
    # Calculate summary statistics
    total_operators = len(report_data)
    total_required_records = 0
    total_completed_records = 0
    
    for operator in report_data:
        for year_data in operator["years"].values():
            for status in year_data["training_status"].values():
                total_required_records += 1
                if status["status"] == "Completed":
                    total_completed_records += 1
    
    compliance_rate = (total_completed_records / total_required_records * 100) if total_required_records > 0 else 0
    
    print("=== ANNUAL REPORT TEST ===")
    print(f"Total Operators: {total_operators}")
    print(f"Total Required Records: {total_required_records}")
    print(f"Total Completed Records: {total_completed_records}")
    print(f"Compliance Rate: {compliance_rate:.1f}%")
    print()
    
    for operator in report_data:
        print(f"Operator: {operator['operator_name']} ({operator['operator_handle']})")
        if operator['onboarding_date']:
            print(f"Onboarding Date: {operator['onboarding_date']}")
        
        for year, year_data in operator['years'].items():
            print(f"  {year}:")
            for training_type, status in year_data['training_status'].items():
                print(f"    {training_type}: {status['status']}")
                if status['date_submitted']:
                    print(f"      Date: {status['date_submitted']}")
        print()

def test_quarterly_report_logic():
    """Test the quarterly report logic with sample data"""
    
    # Sample operators
    operators = [
        {"name": "John Doe", "operator_handle": "jdoe", "onboarding_date": date(2023, 1, 15)},
        {"name": "Jane Smith", "operator_handle": "jsmith", "onboarding_date": date(2024, 7, 11)},
        {"name": "Bob Wilson", "operator_handle": "bwilson", "onboarding_date": None}
    ]
    
    # Sample legal briefing records
    legal_briefings = [
        {"operator_name": "John Doe", "training_name": "2024 Q1"},
        {"operator_name": "John Doe", "training_name": "2024 Q2"},
        {"operator_name": "John Doe", "training_name": "2024 Q3"},
        {"operator_name": "John Doe", "training_name": "2024 Q4"},
        {"operator_name": "Jane Smith", "training_name": "2024 Q3"},
        {"operator_name": "Jane Smith", "training_name": "2024 Q4"},
        # Jane Smith missing Q1 and Q2 (not applicable due to onboarding date)
    ]
    
    # Create lookup for legal briefings
    briefing_lookup = {}
    for record in legal_briefings:
        if record["training_name"]:
            key = (record["operator_name"], record["training_name"])
            briefing_lookup[key] = record
    
    # Get all unique years from training names
    years = set()
    for record in legal_briefings:
        if record["training_name"]:
            try:
                year = int(record["training_name"].split()[0])
                years.add(year)
            except (ValueError, IndexError):
                continue
    
    # Add current year if no records exist
    current_year = 2024
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
            onboarding_date = operator["onboarding_date"]
            
            for quarter in ["Q1", "Q2", "Q3", "Q4"]:
                quarter_name = f"{year} {quarter}"
                
                # Determine quarter start date
                quarter_start_month = (int(quarter[1]) - 1) * 3 + 1
                quarter_start_date = date(year, quarter_start_month, 1)
                
                # Check if operator was onboarded before this quarter
                if onboarding_date and onboarding_date > quarter_start_date:
                    # Operator wasn't on the team during this quarter
                    year_data["quarters"][quarter]["operators"][operator["name"]] = {
                        "operator_handle": operator["operator_handle"],
                        "status": "Not Applicable",
                        "reason": f"Onboarded {onboarding_date.strftime('%m/%d/%Y')}",
                        "date_submitted": None,
                        "file_url": None
                    }
                else:
                    # Check if operator has completed this quarter's briefing
                    key = (operator["name"], quarter_name)
                    record = briefing_lookup.get(key)
                    
                    if record:
                        year_data["quarters"][quarter]["operators"][operator["name"]] = {
                            "operator_handle": operator["operator_handle"],
                            "status": "Completed",
                            "date_submitted": None,
                            "file_url": None
                        }
                    else:
                        year_data["quarters"][quarter]["operators"][operator["name"]] = {
                            "operator_handle": operator["operator_handle"],
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
    
    print("=== QUARTERLY REPORT TEST ===")
    print(f"Total Operators: {total_operators}")
    print(f"Total Required Records: {total_required_records}")
    print(f"Total Completed Records: {total_completed_records}")
    print(f"Total Not Applicable: {total_not_applicable}")
    print(f"Compliance Rate: {compliance_rate:.1f}%")
    print()
    
    for year_data in report_data:
        print(f"Year: {year_data['year']}")
        for quarter, quarter_data in year_data["quarters"].items():
            print(f"  {quarter_data['name']}:")
            for operator_name, operator_data in quarter_data["operators"].items():
                print(f"    {operator_name} ({operator_data['operator_handle']}): {operator_data['status']}")
                if operator_data.get('reason'):
                    print(f"      Reason: {operator_data['reason']}")
        print()

if __name__ == "__main__":
    test_annual_report_logic()
    test_quarterly_report_logic() 