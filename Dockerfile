# Use Node.js 18 Alpine for smaller image
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY client/package*.json ./client/

# Install dependencies
RUN npm ci
RUN cd client && npm ci

# Copy source code
COPY . .

# Build frontend
RUN cd client && npm run build

# Production stage
FROM node:18-alpine

WORKDIR /app

# Copy from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/client/dist ./client/dist
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/server.js ./
COPY --from=builder /app/blockchain ./blockchain
COPY --from=builder /app/routes ./routes
COPY --from=builder /app/validation ./validation
COPY --from=builder /app/tokenomics ./tokenomics
COPY --from=builder /app/utils ./utils
COPY --from=builder /app/network ./network
COPY --from=builder /app/database ./database

# Create data directories
RUN mkdir -p data database

# Expose port
EXPOSE 3000

# Health check


# Start application
CMD ["node", "server.js"]
