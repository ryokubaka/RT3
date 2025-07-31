import logging
import ssl
import os
from typing import Optional, Dict, Any
from ldap3 import Server, Connection, ALL, NTLM, SIMPLE, SUBTREE, Tls
from ldap3.core.exceptions import LDAPException
from sqlalchemy.orm import Session
from .config import (
    LDAP_ENABLED, LDAP_HOST, LDAP_PORT, LDAP_BIND_DN, LDAP_BIND_PASSWORD,
    LDAP_BASE_DN, LDAP_USER_FILTER, LDAP_ATTRIBUTES, LDAP_ENCRYPTION,
    LDAP_ACTIVE_DIRECTORY, LDAP_LABEL, LDAP_CA_CERT_FILE, LDAP_VERIFY_SSL,
    LDAP_TLS_VERSION
)
from .models import TeamRoster

logger = logging.getLogger(__name__)

class LDAPAuthenticator:
    def __init__(self):
        self.enabled = LDAP_ENABLED
        if not self.enabled:
            logger.info("LDAP authentication is disabled")
            return
            
        self.host = LDAP_HOST
        self.port = LDAP_PORT
        self.bind_dn = LDAP_BIND_DN
        self.bind_password = LDAP_BIND_PASSWORD
        self.base_dn = LDAP_BASE_DN
        self.user_filter = LDAP_USER_FILTER
        self.attributes = LDAP_ATTRIBUTES
        self.encryption = LDAP_ENCRYPTION
        self.active_directory = LDAP_ACTIVE_DIRECTORY
        self.ca_cert_file = LDAP_CA_CERT_FILE
        self.verify_ssl = LDAP_VERIFY_SSL
        self.tls_version = LDAP_TLS_VERSION
        
        if not all([self.host, self.bind_dn, self.bind_password, self.base_dn]):
            logger.warning("LDAP configuration incomplete, LDAP authentication will be disabled")
            self.enabled = False
            return
            
        logger.info(f"LDAP authentication enabled for {self.host}:{self.port}")

    def _create_tls_config(self) -> Optional[Tls]:
        """Create TLS configuration with CA certificate if provided"""
        try:
            if self.encryption in ["simple_tls", "start_tls"]:
                tls_config = Tls()
                
                # Set TLS version
                if self.tls_version == "1.0":
                    tls_config.minimum_version = ssl.TLSVersion.TLSv1
                elif self.tls_version == "1.1":
                    tls_config.minimum_version = ssl.TLSVersion.TLSv1_1
                elif self.tls_version == "1.2":
                    tls_config.minimum_version = ssl.TLSVersion.TLSv1_2
                elif self.tls_version == "1.3":
                    tls_config.minimum_version = ssl.TLSVersion.TLSv1_3
                
                # Configure CA certificate if provided
                if self.ca_cert_file and self.verify_ssl:
                    if os.path.exists(self.ca_cert_file):
                        tls_config.ca_certs_file = self.ca_cert_file
                        logger.info(f"Using CA certificate: {self.ca_cert_file}")
                    else:
                        logger.warning(f"CA certificate file not found: {self.ca_cert_file}")
                
                # Configure SSL verification
                if not self.verify_ssl:
                    tls_config.validate = ssl.CERT_NONE
                    logger.warning("SSL certificate validation is disabled")
                else:
                    tls_config.validate = ssl.CERT_REQUIRED
                    logger.info("SSL certificate validation is enabled")
                
                return tls_config
            return None
        except Exception as e:
            logger.error(f"Error creating TLS configuration: {e}")
            return None

    def _get_server(self) -> Server:
        """Create LDAP server connection"""
        use_ssl = self.encryption in ["simple_tls", "start_tls"]
        tls_config = self._create_tls_config()
        
        return Server(
            self.host, 
            port=self.port, 
            use_ssl=use_ssl, 
            get_info=ALL,
            tls=tls_config
        )

    def _get_bind_connection(self) -> Optional[Connection]:
        """Create connection with service account bind"""
        try:
            server = self._get_server()
            conn = Connection(
                server,
                user=self.bind_dn,
                password=self.bind_password,
                authentication=SIMPLE,
                auto_bind=True
            )
            
            if self.encryption == "start_tls":
                conn.start_tls()
                
            return conn
        except LDAPException as e:
            logger.error(f"Failed to bind to LDAP server: {e}")
            return None

    def authenticate_user(self, username: str, password: str) -> Optional[Dict[str, Any]]:
        """Authenticate user against LDAP and return user info"""
        if not self.enabled:
            return None
            
        try:
            # First, bind with service account to search for user
            conn = self._get_bind_connection()
            if not conn:
                logger.error("Failed to establish LDAP bind connection")
                return None

            # Search for user
            search_filter = f"(&({self.attributes['username']}={username}){self.user_filter})"
            conn.search(
                search_base=self.base_dn,
                search_filter=search_filter,
                search_scope=SUBTREE,
                attributes=list(self.attributes.values())
            )

            if not conn.entries:
                logger.warning(f"User {username} not found in LDAP")
                return None

            user_dn = conn.entries[0].entry_dn
            entry = conn.entries[0]

            # Now try to bind as the user to verify credentials
            user_conn = Connection(
                self._get_server(),
                user=user_dn,
                password=password,
                authentication=SIMPLE,
                auto_bind=True
            )

            if self.encryption == "start_tls":
                user_conn.start_tls()

            if not user_conn.bound:
                logger.warning(f"Failed to authenticate user {username} with LDAP")
                return None

            # Extract user attributes using getattr
            user_info = {
                "username": getattr(entry, self.attributes["username"], [username])[0] if getattr(entry, self.attributes["username"], None) else username,
                "name": getattr(entry, self.attributes["name"], [username])[0] if getattr(entry, self.attributes["name"], None) else username,
                "email": getattr(entry, self.attributes["email"], [""])[0] if getattr(entry, self.attributes["email"], None) else "",
                "display_name": getattr(entry, self.attributes["display_name"], [""])[0] if getattr(entry, self.attributes["display_name"], None) else "",
                "given_name": getattr(entry, self.attributes["given_name"], [""])[0] if getattr(entry, self.attributes["given_name"], None) else "",
                "surname": getattr(entry, self.attributes["surname"], [""])[0] if getattr(entry, self.attributes["surname"], None) else "",
                "dn": user_dn
            }

            logger.info(f"Successfully authenticated user {username} via LDAP")
            return user_info

        except LDAPException as e:
            logger.error(f"LDAP authentication error for user {username}: {e}")
            return None
        except Exception as e:
            logger.error(f"Unexpected error during LDAP authentication for user {username}: {e}")
            return None

    def get_or_create_user(self, db: Session, ldap_user_info: Dict[str, Any]) -> Optional[TeamRoster]:
        """Get existing user or create new user from LDAP info"""
        try:
            # Import here to avoid circular import
            from .auth import get_password_hash
            
            # Try to find existing user by username or email
            existing_user = db.query(TeamRoster).filter(
                (TeamRoster.operator_handle == ldap_user_info["username"]) |
                (TeamRoster.email == ldap_user_info["email"])
            ).first()

            if existing_user:
                # Update user info from LDAP if needed
                if not existing_user.email and ldap_user_info["email"]:
                    existing_user.email = ldap_user_info["email"]
                if not existing_user.name and ldap_user_info["display_name"]:
                    existing_user.name = ldap_user_info["display_name"]
                db.commit()
                db.refresh(existing_user)
                logger.info(f"Found existing user {ldap_user_info['username']}")
                return existing_user

            # Create new user
            display_name = ldap_user_info["display_name"] or ldap_user_info["name"]
            if not display_name and (ldap_user_info["given_name"] or ldap_user_info["surname"]):
                display_name = f"{ldap_user_info['given_name'] or ''} {ldap_user_info['surname'] or ''}".strip()

            new_user = TeamRoster(
                name=display_name or ldap_user_info["username"],
                operator_handle=ldap_user_info["username"],
                email=ldap_user_info["email"],
                team_role="OPERATOR",  # Default role for LDAP users
                onboarding_date=db.query(db.func.current_date()).scalar(),
                active=True,
                # Generate a random password for LDAP users (they won't use it)
                hashed_password=get_password_hash("ldap_user_" + ldap_user_info["username"])
            )

            db.add(new_user)
            db.commit()
            db.refresh(new_user)
            
            logger.info(f"Created new user {ldap_user_info['username']} from LDAP")
            return new_user

        except Exception as e:
            logger.error(f"Error creating/getting user from LDAP info: {e}")
            db.rollback()
            return None

# Global LDAP authenticator instance
ldap_auth = LDAPAuthenticator() 