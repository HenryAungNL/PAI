# syntax=docker/dockerfile:1
# --- PAI frontend -----------------------------------------------------------

# --- Stage 1: build the static SPA ---
FROM node:20-alpine AS build

WORKDIR /app

# Install dependencies first so this layer is cached across source changes.
COPY package.json package-lock.json ./
RUN npm ci

# Build. Vite inlines VITE_* variables at build time; a relative API base keeps
# the browser on the same origin as nginx (which proxies /api to the backend).
COPY . .
ARG VITE_API_BASE_URL=/api/v1
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
RUN npm run build

# --- Stage 2: serve with nginx ---
FROM nginx:1.27-alpine AS runtime

# SPA routing + reverse proxy to the Django backend.
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

# Probe 127.0.0.1 explicitly: busybox wget resolves "localhost" to ::1 first,
# but nginx listens on IPv4 only, which yields a spurious "Connection refused".
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -q -O /dev/null http://127.0.0.1/healthz || exit 1

CMD ["nginx", "-g", "daemon off;"]
