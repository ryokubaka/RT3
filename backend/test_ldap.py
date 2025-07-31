#!/usr/bin/env python3
"""
LDAP Configuration Test Script for RT3

This script tests LDAP connectivity and configuration without requiring
the full RT3 application to be running.

Usage:
    python test_ldap.py
"""

import os
import sys
from pathlib import Path

# Add the app directory to the Python path
sys.path.insert(0, str(Path(__file__).parent / "app"))

try:
    from app.config import (
        LDAP_ENABLED, LDAP_HOST, LDAP_PORT, LDAP_BIND_DN, LDAP_BIND_PASSWORD,
        LDAP_BASE_DN, LDAP_USER_FILTER, LDAP_ATTRIBUTES, LDAP_ENCRYPTION,
        LDAP_ACTIVE_DIRECTORY, LDAP_LABEL, LDAP_CA_CERT_FILE, LDAP_VERIFY_SSL,
        LDAP_TLS_VERSION
    )
    from app.ldap_auth import LDAPAuthenticator
except ImportError as e:
    print(f"Error importing modules: {e}")
    print("Make sure you're running this script from the backend directory")
    sys.exit(1)

def test_ldap_config():
    """Test LDAP configuration"""
    print("=== LDAP Configuration Test ===\n")
    
    print("Configuration Values:")
    print(f"  LDAP_ENABLED: {LDAP_ENABLED}")
    print(f"  LDAP_HOST: {LDAP_HOST}")
    print(f"  LDAP_PORT: {LDAP_PORT}")
    print(f"  LDAP_BIND_DN: {LDAP_BIND_DN}")
    print(f"  LDAP_BIND_PASSWORD: {'*' * len(LDAP_BIND_PASSWORD) if LDAP_BIND_PASSWORD else 'Not set'}")
    print(f"  LDAP_BASE_DN: {LDAP_BASE_DN}")
    print(f"  LDAP_USER_FILTER: {LDAP_USER_FILTER or 'None'}")
    print(f"  LDAP_ENCRYPTION: {LDAP_ENCRYPTION}")
    print(f"  LDAP_ACTIVE_DIRECTORY: {LDAP_ACTIVE_DIRECTORY}")
    print(f"  LDAP_LABEL: {LDAP_LABEL}")
    print()
    
    print("SSL Certificate Configuration:")
    print(f"  LDAP_CA_CERT_FILE: {LDAP_CA_CERT_FILE or 'Not set'}")
    print(f"  LDAP_VERIFY_SSL: {LDAP_VERIFY_SSL}")
    print(f"  LDAP_TLS_VERSION: {LDAP_TLS_VERSION}")
    print()
    
    print("Attribute Mapping:")
    for key, value in LDAP_ATTRIBUTES.items():
        print(f"  {key}: {value}")
    print()
    
    # Check if required fields are set
    required_fields = [LDAP_HOST, LDAP_BIND_DN, LDAP_BIND_PASSWORD, LDAP_BASE_DN]
    missing_fields = [field for field in required_fields if not field]
    
    if missing_fields:
        print("❌ Configuration Issues:")
        if not LDAP_HOST:
            print("  - LDAP_HOST is not set")
        if not LDAP_BIND_DN:
            print("  - LDAP_BIND_DN is not set")
        if not LDAP_BIND_PASSWORD:
            print("  - LDAP_BIND_PASSWORD is not set")
        if not LDAP_BASE_DN:
            print("  - LDAP_BASE_DN is not set")
        print()
        return False
    
    # Check SSL certificate configuration
    if LDAP_ENCRYPTION in ["simple_tls", "start_tls"] and LDAP_VERIFY_SSL:
        if not LDAP_CA_CERT_FILE:
            print("⚠️  SSL Certificate Warning:")
            print("  - LDAPS is enabled with SSL verification, but no CA certificate is specified")
            print("  - This may cause connection failures if the LDAP server uses a self-signed certificate")
            print("  - Consider setting LDAP_CA_CERT_FILE or LDAP_VERIFY_SSL=false for testing")
            print()
        elif not os.path.exists(LDAP_CA_CERT_FILE):
            print("❌ SSL Certificate Error:")
            print(f"  - CA certificate file not found: {LDAP_CA_CERT_FILE}")
            print("  - Please verify the file path and ensure the certificate exists")
            print()
            return False
        else:
            print("✅ CA certificate file found and configured")
            print()
    
    print("✅ Configuration looks good!")
    print()
    return True

def test_ldap_connection():
    """Test LDAP connection"""
    print("=== LDAP Connection Test ===\n")
    
    if not LDAP_ENABLED:
        print("❌ LDAP is disabled. Set LDAP_ENABLED=true to enable.")
        return False
    
    try:
        authenticator = LDAPAuthenticator()
        
        if not authenticator.enabled:
            print("❌ LDAP authenticator is not enabled due to configuration issues.")
            return False
        
        print(f"Testing connection to {LDAP_HOST}:{LDAP_PORT}...")
        
        # Test bind connection
        conn = authenticator._get_bind_connection()
        if conn:
            print("✅ Successfully connected to LDAP server")
            print(f"✅ Successfully bound as service account: {LDAP_BIND_DN}")
            
            # Test a simple search
            try:
                conn.search(
                    search_base=LDAP_BASE_DN,
                    search_filter="(objectClass=*)",
                    search_scope=1,  # SUBTREE
                    attributes=["objectClass"],
                    size_limit=1
                )
                print("✅ Successfully performed test search")
            except Exception as e:
                print(f"⚠️  Search test failed: {e}")
            
            return True
        else:
            print("❌ Failed to connect to LDAP server")
            print("  This could be due to:")
            print("  - Network connectivity issues")
            print("  - Incorrect hostname or port")
            print("  - SSL certificate verification failure")
            print("  - Incorrect bind credentials")
            return False
            
    except Exception as e:
        print(f"❌ Connection test failed: {e}")
        if "Can't contact LDAP server (-1)" in str(e):
            print("  This error typically indicates SSL certificate verification failure.")
            print("  Solutions:")
            print("  1. Provide the correct CA certificate via LDAP_CA_CERT_FILE")
            print("  2. Set LDAP_VERIFY_SSL=false for testing (not recommended for production)")
            print("  3. Verify the LDAP server is accessible and the port is correct")
        return False

def test_user_search():
    """Test user search functionality"""
    print("\n=== User Search Test ===\n")
    
    if not LDAP_ENABLED:
        print("❌ LDAP is disabled. Set LDAP_ENABLED=true to enable.")
        return False
    
    try:
        authenticator = LDAPAuthenticator()
        
        if not authenticator.enabled:
            print("❌ LDAP authenticator is not enabled.")
            return False
        
        # Test with a sample username
        test_username = input("Enter a test username to search for (or press Enter to skip): ").strip()
        
        if not test_username:
            print("Skipping user search test.")
            return True
        
        print(f"Searching for user: {test_username}")
        
        # This will only test the search, not authentication
        conn = authenticator._get_bind_connection()
        if conn:
            search_filter = f"(&({authenticator.attributes['username']}={test_username}){authenticator.user_filter})"
            print(f"Using search filter: {search_filter}")
            
            # Get all the attribute names we want to retrieve
            attr_names = list(authenticator.attributes.values())
            print(f"Requesting attributes: {attr_names}")
            
            conn.search(
                search_base=authenticator.base_dn,
                search_filter=search_filter,
                search_scope=2,  # SUBTREE
                attributes=attr_names
            )
            
            if conn.entries:
                print(f"✅ Found user: {test_username}")
                print(f"  DN: {conn.entries[0].entry_dn}")
                
                # Display attributes with better error handling
                print("  Attributes:")
                try:
                    entry_attrs = conn.entries[0].entry_attributes
                    print(f"    Debug: entry_attrs type = {type(entry_attrs)}")
                    
                    if hasattr(entry_attrs, 'items'):
                        # Handle dictionary-like attributes
                        for attr_name, attr_values in entry_attrs.items():
                            if attr_values:
                                if isinstance(attr_values, list):
                                    for i, value in enumerate(attr_values):
                                        if i == 0:
                                            print(f"    {attr_name}: {value}")
                                        else:
                                            print(f"      {value}")
                                else:
                                    print(f"    {attr_name}: {attr_values}")
                    elif isinstance(entry_attrs, list):
                        # Handle list-like attributes (attribute names only)
                        print("    Attributes returned as list (names only):")
                        for attr_name in entry_attrs:
                            print(f"      {attr_name}")
                        
                        # Try to get the actual values using the entry object
                        print("    Actual attribute values:")
                        for attr_name in attr_names:
                            if hasattr(conn.entries[0], attr_name):
                                value = getattr(conn.entries[0], attr_name)
                                if value:
                                    print(f"      {attr_name}: {value}")
                    else:
                        # Handle other formats
                        print(f"    Raw attributes: {entry_attrs}")
                        
                except Exception as attr_error:
                    print(f"    ⚠️  Could not display attributes: {attr_error}")
                    print(f"    Raw entry data: {conn.entries[0]}")
            else:
                print(f"❌ User not found: {test_username}")
                print("  This could be due to:")
                print("  - User doesn't exist in LDAP")
                print("  - User filter is too restrictive")
                print("  - Username attribute mapping is incorrect")
            
            return True
        else:
            print("❌ Failed to establish LDAP connection")
            return False
            
    except Exception as e:
        print(f"❌ User search test failed: {e}")
        import traceback
        print(f"Full error details:")
        traceback.print_exc()
        return False

def main():
    """Main test function"""
    print("RT3 LDAP Configuration and Connection Test")
    print("=" * 50)
    print()
    
    # Test configuration
    config_ok = test_ldap_config()
    
    if not config_ok:
        print("Configuration test failed. Please fix the issues above.")
        return
    
    # Test connection
    connection_ok = test_ldap_connection()
    
    if connection_ok:
        # Test user search
        test_user_search()
    
    print("\n" + "=" * 50)
    if config_ok and connection_ok:
        print("✅ All tests passed! LDAP should work with RT3.")
    else:
        print("❌ Some tests failed. Please check the configuration and try again.")
    
    print("\nFor more information, see LDAP_CONFIGURATION.md")

if __name__ == "__main__":
    main() 