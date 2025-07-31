#!/bin/sh

# Check if certificates already exist
if [ ! -f /etc/nginx/certs/cert.pem ] || [ ! -f /etc/nginx/certs/key.pem ]; then
    echo "Generating self-signed SSL certificates for localhost..."
    
    # Create certificate directory if it doesn't exist
    mkdir -p /etc/nginx/certs
    
    # Generate private key
    openssl genrsa -out /etc/nginx/certs/key.pem 2048
    
    # Generate certificate signing request
    openssl req -new -key /etc/nginx/certs/key.pem -out /etc/nginx/certs/cert.csr -subj "/C=US/ST=State/L=City/O=Organization/OU=IT/CN=localhost"
    
    # Generate self-signed certificate
    openssl x509 -req -in /etc/nginx/certs/cert.csr -signkey /etc/nginx/certs/key.pem -out /etc/nginx/certs/cert.pem -days 365
    
    # Set proper permissions
    chmod 644 /etc/nginx/certs/cert.pem
    chmod 600 /etc/nginx/certs/key.pem
    
    # Clean up CSR file
    rm -f /etc/nginx/certs/cert.csr
    
    echo "Self-signed certificates generated successfully!"
    echo "Certificate: /etc/nginx/certs/cert.pem"
    echo "Private Key: /etc/nginx/certs/key.pem"
    echo "Note: These are self-signed certificates for development use only."
    echo "For production, replace with proper SSL certificates."
else
    echo "SSL certificates already exist, skipping generation."
fi 