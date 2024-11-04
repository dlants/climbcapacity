# Client build stage
FROM node:20-slim

WORKDIR /app/backend
COPY backend/package.json backend/yarn.lock ./
RUN yarn install


WORKDIR /app/client
COPY client/package.json client/yarn.lock ./
RUN yarn install

WORKDIR /app/iso
COPY iso/package.json ./
COPY iso/ ./

WORKDIR /app/backend
COPY backend/ ./
RUN yarn build

WORKDIR /app/client
COPY client/ ./
RUN yarn build

WORKDIR /app

# Set environment variables
ENV NODE_ENV=production

# Expose port
EXPOSE 3000

# Start the server
CMD ["node", "backend/dist/backend/app.js"]
