# --- Build stage ---
FROM node:18-alpine AS builder
WORKDIR /app

# copy package files and install (cache-friendly)
COPY package*.json ./
RUN npm ci --only=production

# copy source
COPY . .

# --- Final stage ---
FROM node:18-alpine
WORKDIR /app

# create non-root user (optional, safer)
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
COPY --from=builder /app /app

USER appuser
ENV NODE_ENV=production
ENV PORT=5001

EXPOSE 5001
CMD ["node", "server.js"]
