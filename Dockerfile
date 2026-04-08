# ── Build stage ──────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src/ ./src/
RUN npm run build

# ── Runtime stage ─────────────────────────────────────────────────────────────
FROM node:22-alpine AS runtime

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist

ENV NODE_ENV=production

ENTRYPOINT ["node", "dist/index.js"]

# ── Bundle stage — produces insee-mcp.mcpb ────────────────────────────────────
# Usage: docker build --target bundle --output . .
# Requires: icon.png in the project root (optional but recommended)
FROM runtime AS bundle

RUN apk add --no-cache zip

WORKDIR /bundle

# Copy compiled code and production deps from runtime
RUN cp -r /app/dist . && cp -r /app/node_modules .

# Copy static assets
COPY manifest.json ./
COPY Dockerfile ./
COPY icon.png ./

RUN zip -r /insee-mcp.mcpb . \
      --exclude "*.map" \
      --exclude "node_modules/.cache/*"

# Export only the archive so `--output .` drops it at the project root
FROM scratch AS export
COPY --from=bundle /insee-mcp.mcpb /insee-mcp.mcpb
