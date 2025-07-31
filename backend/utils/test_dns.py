#!/usr/bin/env python3
"""
DNS Resolution Test Script for RT3

This script tests DNS resolution for LDAP server hostnames to help troubleshoot
connection issues.

Usage:
    python test_dns.py [hostname]
"""

import socket
import sys
import os
from pathlib import Path

# Add the app directory to the Python path
sys.path.insert(0, str(Path(__file__).parent / "app"))

try:
    from app.config import LDAP_HOST, LDAP_ENABLED
except ImportError as e:
    print(f"Error importing modules: {e}")
    print("Make sure you're running this script from the backend directory")
    sys.exit(1)

def test_dns_resolution(hostname):
    """Test DNS resolution for a given hostname"""
    print(f"Testing DNS resolution for: {hostname}")
    print("-" * 50)
    
    try:
        # Test forward lookup (hostname to IP)
        print(f"Forward lookup ({hostname} -> IP):")
        try:
            ip_addresses = socket.gethostbyname_ex(hostname)
            print(f"  ✅ Success: {hostname} resolves to:")
            for ip in ip_addresses[2]:
                print(f"    - {ip}")
        except socket.gaierror as e:
            print(f"  ❌ Failed: {e}")
            return False
        
        # Test reverse lookup (IP to hostname)
        print(f"\nReverse lookup (IP -> hostname):")
        try:
            for ip in ip_addresses[2]:
                try:
                    reverse_hostname = socket.gethostbyaddr(ip)[0]
                    print(f"  ✅ {ip} -> {reverse_hostname}")
                except socket.herror as e:
                    print(f"  ⚠️  {ip} -> No reverse DNS (this is often normal)")
        except Exception as e:
            print(f"  ❌ Reverse lookup failed: {e}")
        
        # Test port connectivity
        print(f"\nPort connectivity test:")
        try:
            from app.config import LDAP_PORT
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(5)
            result = sock.connect_ex((hostname, LDAP_PORT))
            sock.close()
            
            if result == 0:
                print(f"  ✅ Port {LDAP_PORT} is reachable")
            else:
                print(f"  ❌ Port {LDAP_PORT} is not reachable (error code: {result})")
                print("    This could be due to:")
                print("    - Firewall blocking the connection")
                print("    - LDAP server not running on this port")
                print("    - Network connectivity issues")
        except Exception as e:
            print(f"  ❌ Port test failed: {e}")
        
        return True
        
    except Exception as e:
        print(f"❌ DNS test failed: {e}")
        return False

def show_dns_config():
    """Show current DNS configuration"""
    print("Current DNS Configuration:")
    print("-" * 30)
    
    # Read /etc/resolv.conf
    try:
        with open('/etc/resolv.conf', 'r') as f:
            resolv_conf = f.read()
        print("Contents of /etc/resolv.conf:")
        print(resolv_conf)
    except Exception as e:
        print(f"Could not read /etc/resolv.conf: {e}")
    
    print()
    
    # Show environment DNS variables
    custom_dns = os.getenv('CUSTOM_DNS', 'Not set')
    custom_dns_secondary = os.getenv('CUSTOM_DNS_SECONDARY', 'Not set')
    print(f"CUSTOM_DNS: {custom_dns}")
    print(f"CUSTOM_DNS_SECONDARY: {custom_dns_secondary}")

def main():
    """Main test function"""
    print("RT3 DNS Resolution Test")
    print("=" * 30)
    print()
    
    # Show DNS configuration
    show_dns_config()
    
    # Test LDAP hostname if LDAP is enabled
    if LDAP_ENABLED and LDAP_HOST:
        print(f"\nTesting LDAP server hostname: {LDAP_HOST}")
        success = test_dns_resolution(LDAP_HOST)
        
        if not success:
            print("\n❌ DNS resolution failed for LDAP server!")
            print("Solutions:")
            print("1. Set CUSTOM_DNS in your .env file to point to your domain's DNS server")
            print("2. Verify the LDAP server hostname is correct")
            print("3. Check network connectivity to the LDAP server")
            print("4. Ensure the LDAP server is accessible from the container network")
        else:
            print("\n✅ DNS resolution successful for LDAP server!")
    else:
        print("LDAP is not enabled or LDAP_HOST is not configured.")
    
    # Test additional hostname if provided
    if len(sys.argv) > 1:
        additional_hostname = sys.argv[1]
        print(f"\nTesting additional hostname: {additional_hostname}")
        test_dns_resolution(additional_hostname)
    
    print("\nFor more information, see LDAP_CONFIGURATION.md")

if __name__ == "__main__":
    main()