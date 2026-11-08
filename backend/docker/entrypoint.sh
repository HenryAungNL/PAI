#!/usr/bin/env bash
# PAI backend entrypoint: run migrations and collect static assets, then exec
# the container command (gunicorn in production, runserver in dev).
set -e

python manage.py migrate --noinput

if [ "${COLLECTSTATIC:-1}" = "1" ]; then
  python manage.py collectstatic --noinput >/dev/null 2>&1 || true
fi

exec "$@"
