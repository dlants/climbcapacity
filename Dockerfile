# Client build stage
FROM node:20-slim

WORKDIR /app

COPY packages/iso/package.json packages/iso/yarn.lock ./packages/iso/
RUN yarn workspace @climbcapacity/iso install

COPY packages/backend/package.json packages/backend/yarn.lock ./packages/backend/
RUN yarn workspace @climbcapacity/backend install

COPY packages/frontend/package.json packages/frontend/yarn.lock ./packages/frontend/
RUN yarn workspace @climbcapacity/frontend install

COPY packages/iso/ ./packages/iso/

COPY packages/backend/ ./packages/backend
RUN yarn workspace @climbcapacity/backend build

COPY packages/frontend/ ./packages/frontend
RUN yarn workspace @climbcapacity/frontend build

WORKDIR /app

# Set environment variables
ENV NODE_ENV=production

# Expose port
EXPOSE 3000

# Start the server
CMD ["node", "backend/dist/backend/app.js"]
