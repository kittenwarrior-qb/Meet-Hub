FROM node:20-alpine AS build

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the app
RUN npm run build

# Production stage - lightweight static file server
FROM caddy:alpine

# Copy built files
COPY --from=build /app/dist /srv

# Caddyfile for SPA routing
COPY Caddyfile /etc/caddy/Caddyfile

EXPOSE 80
