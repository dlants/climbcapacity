# Build stage
FROM node:20-slim AS builder

ARG SKIP_TESTS=true

WORKDIR /app

# Enable Corepack and use the correct Yarn version
RUN corepack enable

# Copy workspace configuration
COPY package.json yarn.lock ./
COPY packages/ ./packages/

# Install dependencies but skip Playwright browser downloads
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
RUN yarn install --immutable

# Copy source code
COPY packages/ ./packages/

# Build the application
RUN yarn build

# Production stage
FROM node:20-slim AS production

WORKDIR /app

# Enable Corepack and use the correct Yarn version
RUN corepack enable

# Copy workspace configuration and only necessary package.json files
COPY package.json yarn.lock ./
COPY packages/backend/package.json ./packages/backend/
COPY packages/iso/package.json ./packages/iso/

# Install only production dependencies for backend and iso
RUN yarn workspaces focus @climbcapacity/backend --production

# Copy built assets and runtime dependencies from builder stage
COPY --from=builder /app/packages/backend/dist ./packages/backend/dist
COPY --from=builder /app/packages/frontend/dist ./packages/frontend/dist
COPY --from=builder /app/packages/iso ./packages/iso

# Set environment variables
ENV NODE_ENV=production

# Expose port
EXPOSE 3000

# Start the server
CMD ["yarn", "node", "packages/backend/dist/backend/app.js"]
