# ── Stage 1: build React app ──────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

# Copy only package.json first for better layer caching.
# We use npm install (not npm ci) because package-lock.json
# may not always be committed to the repo.
COPY package.json ./

# Copy lock file only if it exists (conditional via wildcard)
COPY package*.json ./

RUN npm install --silent

# Copy source and build
COPY . .

# VITE_API_URL is injected at build time via --build-arg
ARG VITE_API_URL=http://localhost:8000
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

# ── Stage 2: serve with Nginx ─────────────────────────────────────────────
FROM nginx:alpine AS runtime

# Remove default nginx site
RUN rm -rf /usr/share/nginx/html/*

# Copy built React app
COPY --from=builder /app/dist /usr/share/nginx/html

# Custom nginx config for React Router (SPA)
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
