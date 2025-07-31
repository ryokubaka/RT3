# LDAP Authentication Configuration for RT3

RT3 now supports LDAP authentication as an alternative to local username/password authentication. When LDAP is enabled, users can authenticate using their LDAP credentials, and the system will automatically create local user accounts for LDAP users on their first successful login.

## Configuration

### Environment Variables

The RT3 application uses a `.env` file in the root directory for configuration. Create or edit this file with the following LDAP configuration:

```bash
# LDAP Authentication Configuration
# Set LDAP_ENABLED=true to enable LDAP authentication
LDAP_ENABLED=false

# LDAP Server Configuration
LDAP_HOST=rms-dc01.domain.com
LDAP_PORT=636
LDAP_BIND_DN=CN=svc-bind-gitlab,OU=Bind,DC=domain,DC=com
LDAP_BIND_PASSWORD=your_bind_password_here
LDAP_BASE_DN=DC=domain,DC=com

# LDAP User Filter (optional - leave empty to allow all users)
# Example: (memberOf=CN=Operators,CN=Users,DC=domain,DC=com)
LDAP_USER_FILTER=

# LDAP Encryption
# Options: simple_tls, start_tls, none
LDAP_ENCRYPTION=simple_tls

# LDAP Active Directory (set to true for AD, false for generic LDAP)
LDAP_ACTIVE_DIRECTORY=true

# LDAP Display Label
LDAP_LABEL=LDAP

# LDAP Attribute Mapping
LDAP_ATTR_USERNAME=sAMAccountName
LDAP_ATTR_NAME=sAMAccountName
LDAP_ATTR_EMAIL=mail
LDAP_ATTR_DISPLAY_NAME=displayName
LDAP_ATTR_GIVEN_NAME=givenName
LDAP_ATTR_SURNAME=sn

# LDAP SSL Certificate Configuration
# Path to CA certificate file (required for LDAPS with self-signed certificates)
LDAP_CA_CERT_FILE=/app/certs/ca-cert.pem

# SSL Certificate Verification (set to false to disable verification - not recommended for production)
LDAP_VERIFY_SSL=true

# TLS Version (1.0, 1.1, 1.2, 1.3)
LDAP_TLS_VERSION=1.2

# DNS Configuration (for LDAP server resolution)
# Set custom DNS servers if your LDAP server is not resolvable via default DNS
CUSTOM_DNS=8.8.8.8
CUSTOM_DNS_SECONDARY=8.8.4.4
```

### Example Configuration

Here's an example configuration based on your provided GitLab LDAP config:

```bash
LDAP_ENABLED=true
LDAP_HOST=rms-dc01.domain.com
LDAP_PORT=636
LDAP_BIND_DN=CN=svc-bind-gitlab,OU=Bind,DC=domain,DC=com
LDAP_BIND_PASSWORD=<your_bind_password>
LDAP_BASE_DN=DC=domain,DC=com
LDAP_USER_FILTER=(memberOf=CN=Operators,CN=Users,DC=domain,DC=com)
LDAP_ENCRYPTION=simple_tls
LDAP_ACTIVE_DIRECTORY=true
LDAP_LABEL=LDAP

# SSL Certificate Configuration
LDAP_CA_CERT_FILE=/app/certs/ca-cert.pem
LDAP_VERIFY_SSL=true
LDAP_TLS_VERSION=1.2

# DNS Configuration
CUSTOM_DNS=10.0.0.1
CUSTOM_DNS_SECONDARY=10.0.0.2
```

## DNS Configuration

### For LDAP Server Resolution

If your LDAP server is not resolvable via the default DNS servers, you can configure custom DNS servers:

1. **Set your domain's DNS servers in the .env file:**
   ```bash
   CUSTOM_DNS=10.0.0.1
   CUSTOM_DNS_SECONDARY=10.0.0.2
   ```

2. **Common DNS server examples:**
   - **Google DNS**: `8.8.8.8`, `8.8.4.4`
   - **Cloudflare DNS**: `1.1.1.1`, `1.0.0.1`
   - **Your domain's DNS**: Use your organization's DNS servers

3. **Test DNS resolution:**
   ```bash
   docker compose exec backend python test_dns.py
   ```

## SSL Certificate Configuration

### For LDAPS Connections

When using LDAPS (port 636), you may need to configure SSL certificates:

1. **Place your CA certificate in the backend container:**
   ```bash
   # Copy your CA certificate to the backend container
   docker cp /path/to/your/ca-cert.pem rt3-backend:/app/certs/ca-cert.pem
   ```

2. **Configure the certificate path in your .env file:**
   ```bash
   # Add this line to your .env file
   LDAP_CA_CERT_FILE=/app/certs/ca-cert.pem
   ```

3. **Alternative: Disable SSL verification (development only):**
   ```bash
   LDAP_VERIFY_SSL=false
   ```

### Certificate File Formats

The system supports PEM format certificates. If you have a different format:

- **DER format:** Convert to PEM: `openssl x509 -inform DER -in cert.der -out cert.pem`
- **P7B format:** Convert to PEM: `openssl pkcs7 -print_certs -in cert.p7b -out cert.pem`

## How It Works

### Authentication Flow

1. **Local Authentication First**: The system first attempts to authenticate users using the local database
2. **LDAP Fallback**: If local authentication fails and LDAP is enabled, the system attempts LDAP authentication
3. **User Creation**: If LDAP authentication succeeds and the user doesn't exist locally, a new user account is automatically created
4. **Token Generation**: Upon successful authentication, a JWT token is generated and returned

### User Account Management

- **Existing Users**: LDAP users who already have local accounts will be able to log in immediately
- **New Users**: First-time LDAP users will have accounts automatically created with:
  - Username: LDAP username (sAMAccountName)
  - Name: Display name from LDAP (or username if not available)
  - Email: Email address from LDAP (if available)
  - Role: Default "OPERATOR" role
  - Status: Active

### Attribute Mapping

The system maps LDAP attributes to RT3 user fields:

| RT3 Field | LDAP Attribute | Default |
|-----------|----------------|---------|
| Username | sAMAccountName | sAMAccountName |
| Name | displayName | sAMAccountName |
| Email | mail | (empty) |
| Display Name | displayName | (empty) |
| Given Name | givenName | (empty) |
| Surname | sn | (empty) |

## Security Considerations

### Service Account

- Use a dedicated service account for LDAP bind operations
- Ensure the service account has minimal required permissions
- Regularly rotate the service account password

### Network Security

- Use LDAPS (port 636) or StartTLS for encrypted connections
- Ensure firewall rules allow LDAP traffic between RT3 and the LDAP server
- Consider using VPN or private network for LDAP communication

### SSL Certificate Security

- Always use proper CA certificates for production environments
- Never disable SSL verification in production
- Keep CA certificates up to date
- Use strong TLS versions (1.2 or 1.3)

### User Filtering

- Use `LDAP_USER_FILTER` to restrict which LDAP users can access RT3
- Example: `(memberOf=CN=Operators,CN=Users,DC=domain,DC=com)`
- This ensures only users in specific groups can authenticate

## Troubleshooting

### Common Issues

1. **Connection Failed**
   - Verify LDAP server hostname and port
   - Check network connectivity
   - Ensure firewall allows LDAP traffic

2. **Bind Failed**
   - Verify bind DN and password
   - Check service account permissions
   - Ensure bind DN format is correct

3. **User Not Found**
   - Verify user exists in LDAP
   - Check `LDAP_USER_FILTER` configuration
   - Ensure user is in the correct OU/group

4. **Authentication Failed**
   - Verify user credentials
   - Check if user account is locked/disabled in AD
   - Ensure user has permission to bind to LDAP

5. **SSL Certificate Errors**
   - **"Can't contact LDAP server (-1)"**: Usually indicates SSL certificate verification failure
   - **Solution**: Provide the correct CA certificate or disable SSL verification (development only)
   - **"SSL certificate verify failed"**: The CA certificate is incorrect or missing
   - **Solution**: Verify the CA certificate path and format

6. **DNS Resolution Errors**
   - **"Name or service not known"**: LDAP server hostname cannot be resolved
   - **Solution**: Configure custom DNS servers via CUSTOM_DNS environment variable
   - **"No route to host"**: Network connectivity issue
   - **Solution**: Check firewall rules and network connectivity

### Testing and Diagnostics

#### DNS Resolution Test
```bash
# Test DNS resolution for LDAP server
docker compose exec backend python test_dns.py

# Test specific hostname
docker compose exec backend python test_dns.py your-ldap-server.com
```

#### LDAP Connection Test
```bash
# Test LDAP configuration and connectivity
docker compose exec backend python test_ldap.py
```

### Logging

LDAP authentication events are logged with the following levels:
- **INFO**: Successful authentication, user creation, SSL configuration
- **WARNING**: User not found, authentication failed, certificate issues
- **ERROR**: Connection errors, bind failures, SSL errors

Check the application logs for detailed error messages:

```bash
docker compose logs backend
```

## Migration from Local to LDAP

### Gradual Migration

1. **Enable LDAP**: Set `LDAP_ENABLED=true` while keeping local authentication
2. **Test**: Verify LDAP users can authenticate
3. **Migrate Users**: Gradually migrate local users to LDAP
4. **Disable Local**: Once all users are migrated, you can disable local authentication (requires code modification)

### User Data Preservation

- Existing local user data is preserved
- LDAP users get new accounts with default settings
- Admins can update user roles and settings after LDAP login

## Disabling LDAP

To disable LDAP authentication:

1. Set `LDAP_ENABLED=false` in your `.env` file
2. Restart the application: `docker compose restart backend`

The system will fall back to local authentication only.

## Environment File Management

The RT3 application automatically loads environment variables from the `.env` file in the root directory. This file is used by Docker Compose to configure the backend service.

**Important Notes:**
- The `.env` file should not be committed to version control (it's already in `.gitignore`)
- Use `env.example` as a template for creating your `.env` file
- All LDAP configuration variables are loaded from this file
- Changes to the `.env` file require restarting the containers to take effect 