# syntax=docker/dockerfile:1
# --- PAI backend -----------------------------------------------------------
FROM python:3.13-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

# System dependencies (kept minimal — Pillow wheels are available for slim).
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies first for better layer caching.
COPY requirements.txt .
RUN pip install -r requirements.txt

# Copy the application.
COPY . .

# Entrypoint that runs migrations then starts the server.
COPY docker/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

# Persistent data (SQLite database + media) lives on a volume.
RUN mkdir -p /app/data/media /app/data/staticfiles \
    && useradd --create-home --uid 10001 pai \
    && chown -R pai:pai /app
USER pai

ENV PAI_DATA_DIR=/app/data \
    DJANGO_SETTINGS_MODULE=config.settings

EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD curl -fsS http://localhost:8000/health || exit 1

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
# Note: SQLite is a single-writer database. Run exactly ONE backend replica;
# this default WSGI configuration uses a small number of workers accordingly.
CMD ["gunicorn", "config.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "3", "--threads", "4", "--timeout", "60", "--access-logfile", "-"]
