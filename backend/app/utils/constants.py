# Document type constants
DOCUMENT_TYPE_RED_TEAM = "red_team"
DOCUMENT_TYPE_CERTIFICATION = "certification"
DOCUMENT_TYPE_VENDOR = "vendor" 
DOCUMENT_TYPE_SKILL_LEVEL = "skill_level"

# List of valid document types
VALID_DOCUMENT_TYPES = [
    DOCUMENT_TYPE_RED_TEAM,
    DOCUMENT_TYPE_CERTIFICATION,
    DOCUMENT_TYPE_VENDOR,
    DOCUMENT_TYPE_SKILL_LEVEL
]

# URL field mapping by document type
DOCUMENT_URL_FIELD_MAP = {
    DOCUMENT_TYPE_RED_TEAM: "file_url",
    DOCUMENT_TYPE_CERTIFICATION: "file_url",
    DOCUMENT_TYPE_VENDOR: "file_url",
    DOCUMENT_TYPE_SKILL_LEVEL: "signed_memo_url"
}

# API route paths
API_PREFIX = "/api"
TRAINING_PREFIX = "/training"
DOCUMENT_PATH = "/document"
RED_TEAM_PATH = "/red-team"
CERTIFICATIONS_PATH = "/certs"
VENDOR_PATH = "/vendor"
SKILL_LEVEL_PATH = "/skill-level" 