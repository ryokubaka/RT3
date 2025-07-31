from enum import Enum

class OperatorLevel(str, Enum):
    team_member = "Team Member"
    apprentice = "Apprentice"
    journeyman = "Journeyman"
    master = "Master"

class ComplianceStatus(str, Enum):
    compliant = "Compliant"
    non_compliant = "Non-Compliant"

class UserRole(str, Enum):
    ADMIN = "ADMIN"
    OPERATOR = "OPERATOR"
    PLANNER = "PLANNER"
    USER = "USER"  # Legacy value for compatibility 