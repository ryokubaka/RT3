import os
from pathlib import Path
from typing import Optional

# Get the directory where this config file is located
BASE_DIR = Path(__file__).resolve().parent.parent

# Base directory for file uploads
UPLOAD_DIR = str(BASE_DIR / "uploads")

# Create uploads directory if it doesn't exist
os.makedirs(UPLOAD_DIR, exist_ok=True)

# LDAP Configuration
LDAP_ENABLED = os.getenv("LDAP_ENABLED", "false").lower() == "true"
LDAP_HOST = os.getenv("LDAP_HOST", "")
LDAP_PORT = int(os.getenv("LDAP_PORT", "636"))
LDAP_BIND_DN = os.getenv("LDAP_BIND_DN", "")
LDAP_BIND_PASSWORD = os.getenv("LDAP_BIND_PASSWORD", "")
LDAP_BASE_DN = os.getenv("LDAP_BASE_DN", "")
LDAP_USER_FILTER = os.getenv("LDAP_USER_FILTER", "")
LDAP_ATTRIBUTES = {
    "username": os.getenv("LDAP_ATTR_USERNAME", "sAMAccountName"),
    "name": os.getenv("LDAP_ATTR_NAME", "sAMAccountName"),
    "email": os.getenv("LDAP_ATTR_EMAIL", "mail"),
    "display_name": os.getenv("LDAP_ATTR_DISPLAY_NAME", "displayName"),
    "given_name": os.getenv("LDAP_ATTR_GIVEN_NAME", "givenName"),
    "surname": os.getenv("LDAP_ATTR_SURNAME", "sn"),
}
LDAP_ENCRYPTION = os.getenv("LDAP_ENCRYPTION", "simple_tls")  # simple_tls, start_tls, or none
LDAP_ACTIVE_DIRECTORY = os.getenv("LDAP_ACTIVE_DIRECTORY", "true").lower() == "true"
LDAP_LABEL = os.getenv("LDAP_LABEL", "LDAP")

# LDAP SSL Certificate Configuration
LDAP_CA_CERT_FILE = os.getenv("LDAP_CA_CERT_FILE", "")
LDAP_VERIFY_SSL = os.getenv("LDAP_VERIFY_SSL", "true").lower() == "true"
LDAP_TLS_VERSION = os.getenv("LDAP_TLS_VERSION", "1.2")  # 1.0, 1.1, 1.2, 1.3 
