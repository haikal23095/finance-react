# --- STAGE 1: Build ---
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source and build
COPY . .
RUN npm run build

# --- STAGE 2: Run ---
FROM node:20-alpine

WORKDIR /app

# Copy built assets and server files
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/server.ts ./
COPY --from=builder /app/tsconfig.json ./

# Install dependencies needed for production
RUN npm install --only=production
RUN npm install -g tsx

# Cloud Run mendengarkan pada port 8080 secara default
ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

# Jalankan server
CMD ["npx", "tsx", "server.ts"]

