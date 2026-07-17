# Use the official Node.js alpine image for a lightweight footprint
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package descriptors
COPY package*.json ./

# Install packages
RUN npm ci

# Copy application source code
COPY tsconfig.json vite.config.ts server.ts db.ts vectorStore.ts index.html ./
COPY src/ ./src/

# Build both the React frontend and compile the Express/TS server
RUN npm run build

# Expose port 3000
EXPOSE 3000

# Set production environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Start server
CMD ["node", "dist/server.cjs"]
