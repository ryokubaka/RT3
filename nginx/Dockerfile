FROM nginx:alpine

# Install OpenSSL for certificate generation
RUN apk add --no-cache openssl

# Remove default configuration
RUN rm -rf /etc/nginx/conf.d/*

# Copy the Nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Create directory for SSL certificates
RUN mkdir -p /etc/nginx/certs

# Copy the certificate generation script
COPY generate-certs.sh /usr/local/bin/generate-certs.sh
RUN chmod +x /usr/local/bin/generate-certs.sh

# Expose ports
EXPOSE 80 443

# Start Nginx with certificate generation
CMD ["/bin/sh", "-c", "/usr/local/bin/generate-certs.sh && nginx -g 'daemon off;'"] 