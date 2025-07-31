# frontend/Dockerfile
FROM node:20-alpine

WORKDIR /app

# Install yarn
RUN apk add --no-cache yarn

# Copy package files
COPY package.json ./

# Install dependencies
RUN yarn install --network-timeout 100000

# Set environment variables for development
ENV NODE_ENV=development
ENV FAST_REFRESH=true
ENV WDS_SOCKET_PORT=0

# Expose port
EXPOSE 3000

# Start the development server
CMD ["yarn", "start"]
