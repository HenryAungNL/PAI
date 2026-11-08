# PAI — a modern Learning Management System

PAI is a full-stack, production-shaped LMS: a **Django + Django REST Framework**
API with **Stripe** payments and a **React + TypeScript** single-page app, served
together with Docker Compose.

It ships a complete learning workflow — browse a catalogue, enrol (free or paid),
learn through a course player with progress tracking, earn verifiable
certificates, review courses, and author/moderate content from purpose-built
dashboards for **students**, **instructors** and **platform admins** (all in
React — the stock Django admin is intentionally *not* the product UI).

---

## Table of contents

- [Feature highlights](#feature-highlights)
- [Tech stack](#tech-stack)
- [Quick start (Docker)](#quick-start-docker)
- [Local development](#local-development)
- [Demo accounts](#demo-accounts)
- [Project structure](#project-structure)
- [How it fits together](#how-it-fits-together)
- [API overview](#api-overview)
- [Testing & quality](#testing--quality)
- [Environment variables](#environment-variables)
- [Payments (Stripe)](#payments-stripe)
- [Deploying to production](#deploying-to-production)

---

## Feature highlights

**Public site**
- Marketing home page with live platform stats (courses, instructors, learners, rating)
- Catalogue with search, category/difficulty/price/rating filters and sorting
- Course detail pages with curriculum, objectives, reviews and instructor bio
- Category and instructor directories, certificate verification, about/contact, legal pages
- Real Unsplash photography; remote images are lazy-loaded with graceful fallbacks

**Accounts & security**
- Custom email-based user model with `student` / `instructor` / `admin` roles
- JWT auth: short-lived access token held **in JS memory**, rotating refresh token in an
  `HttpOnly` cookie (never `localStorage`), with token blacklisting on rotation
- Registration, login/logout, password reset, profile + password management
- Per-role route guards in the SPA *and* independent authorization on the API

**Learning**
- Free and paid enrolment; server-authoritative pricing
- Course player (YouTube/Vimeo embeds + written lessons), lesson completion and progress
- Bookmarks, purchase history, completion certificates with unique verifiable codes

**Instructor workspace**
- Course authoring (details, thumbnail upload, sections & lessons, submit for review)
- Analytics: enrolments, revenue (gross/refunded/net), ratings, per-course breakdowns

**Admin workspace (custom React dashboard)**
- Platform stats, enrolment and revenue trends
- User management (roles, suspension, instructor approval)
- Course moderation (approve/reject/archive/restore, feature)
- Category, enrolment, order and refund management
- Review moderation and an append-only audit log
- Platform settings (identity, contact, social/legal links, feature toggles)

**Payments**
- Stripe Checkout with signed webhook verification and idempotent event handling
- No course access is granted until the payment is verified (webhook *or* authenticated re-verification)
- Admin-issued full and partial refunds with revenue accounting

---

## Tech stack

| Layer      | Technology |
|------------|------------|
| Backend    | Python 3.13, Django 5.2, Django REST Framework 3.16 |
| Auth       | `djangorestframework-simplejwt`, HttpOnly refresh cookie rotation |
| Database   | SQLite (single-writer; see [production notes](#deploying-to-production)) |
| API docs   | `drf-spectacular` (OpenAPI 3 + Swagger UI) |
| Payments   | `stripe` Python SDK (Checkout + webhooks) |
| Server     | Gunicorn + WhiteNoise |
| Frontend   | React 18, TypeScript 5.7, Vite 5 |
| Routing    | React Router 6 (data router) |
| Data       | TanStack Query 5 |
| Forms      | React Hook Form + Zod |
| Styling    | Tailwind CSS 3, shadcn-style primitives, Lucide icons, Sonner toasts |
| Testing    | Django `TestCase`, Vitest + Testing Library |
| Packaging  | Docker multi-stage builds + Docker Compose |

---

## Quick start (Docker)

> Requires Docker with the Compose plugin. Nothing else needs to be installed.

```bash
# 1. Build and start the API (:8000, internal) and the SPA (:8080).
docker compose up --build

# 2. In a second terminal, load the demo catalogue, users and reviews.
#    (Idempotent — safe to run more than once.)
docker compose exec backend python manage.py seed_demo_data
```

Open **http://localhost:8080** and sign in with a [demo account](#demo-accounts).

Useful commands:

```bash
docker compose logs -f backend      # follow API logs
docker compose exec backend python manage.py createsuperuser
docker compose exec backend python manage.py migrate
docker compose down                 # stop (data volume is kept)
docker compose down -v              # stop and delete the database volume
```

Everything runs with sensible defaults; copy `.env.example` to `.env` to override
secrets, hosts or Stripe keys (see [Environment variables](#environment-variables)).

---

## Local development

Run the backend and frontend as separate processes for fast iteration.

### Backend

```bash
cd backend
python -m venv .venv
# Windows:  .venv\Scripts\activate
# macOS/Linux:  source .venv/bin/activate
pip install -r requirements.txt

cp .env.example .env               # optional; defaults work for local dev
python manage.py migrate
python manage.py seed_demo_data    # or: createsuperuser
python manage.py runserver         # http://localhost:8000
```

- API base: `http://localhost:8000/api/v1/`
- Swagger UI: `http://localhost:8000/api/docs/`
- OpenAPI schema: `http://localhost:8000/api/schema/`
- Health: `http://localhost:8000/health`

### Frontend

```bash
cd frontend
npm install
cp .env.example .env.local          # optional
npm run dev                         # http://localhost:5173
```

The Vite dev server proxies `/api`, `/media` and `/health` to
`http://localhost:8000` (override with `VITE_PROXY_TARGET`), so the browser talks
to a single origin and cookie auth behaves exactly as in production.

---

## Demo accounts

`seed_demo_data` creates the following accounts (password: **`PaiDemo!2024`**):

| Role       | Email                     | Notes |
|------------|---------------------------|-------|
| Admin      | `admin@pai.demo`          | Full platform administration |
| Instructor | `amara.okafor@pai.demo`   | Owns several published courses |
| Student    | `student@pai.demo`        | Has active enrolments and a certificate |

The seed also adds 6 categories, 5 instructors, 9 courses (one left **pending**
for the moderation demo) and demo reviews. All content is clearly fictional and
demo reviews are flagged `is_demo`.

---

## Project structure

```
PAI/
├── backend/                     # Django project
│   ├── apps/
│   │   ├── core/                # pagination, exceptions, throttling, health, seed command
│   │   ├── accounts/            # custom User, JWT auth, roles, password reset
│   │   ├── courses/             # Category, Course, Section, Lesson + authoring API
│   │   ├── learning/            # Enrollment, LessonProgress, Bookmarks, access rules
│   │   ├── payments/            # Order, Refund, Stripe Checkout + webhook services
│   │   ├── reviews/             # enrolled-only reviews + moderation
│   │   ├── certificates/        # completion verification + public certificate lookup
│   │   ├── audit/              # append-only admin action log
│   │   └── analytics/           # public/instructor/admin aggregates + platform settings
│   ├── config/                  # settings, urls, wsgi/asgi
│   ├── docker/entrypoint.sh     # migrate + collectstatic, then exec
│   ├── data/                    # SQLite DB + media (volume mount in Docker)
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/                    # React SPA
│   ├── src/
│   │   ├── components/          # ui primitives, common, courses, layout
│   │   ├── features/auth/       # AuthContext (session bootstrap, login/logout)
│   │   ├── hooks/useApi.ts      # every data hook & mutation
│   │   ├── lib/                 # api client, query client, utils, navigation
│   │   ├── pages/               # public, auth, payments, student, instructor, admin
│   │   ├── styles/              # Tailwind entry + design tokens
│   │   ├── test/                # Vitest setup
│   │   ├── App.tsx              # route table
│   │   └── main.tsx             # providers
│   ├── nginx.conf               # SPA fallback + reverse proxy
│   └── Dockerfile               # node build → nginx runtime
├── docker-compose.yml
├── .env.example
└── CHECKLIST.md
```

---

## How it fits together

- **One origin.** In Docker, nginx serves the SPA and proxies `/api`, `/media`,
  `/static` and `/health` to the backend. In dev, Vite does the same. Either way
  the browser never makes a cross-origin request, which keeps cookie auth simple.
- **Tokens.** The access token lives only in memory; the refresh token is an
  `HttpOnly` cookie scoped to `/api/v1/auth`, rotated and blacklisted on use. A
  401 triggers one transparent refresh-and-retry.
- **Authorization is layered.** React guards shape navigation for the user's role,
  but every endpoint re-checks permissions server-side.
- **Denormalised aggregates.** Course rating/review/enrolment counts are stored and
  recomputed by services/signals, so catalogue queries stay cheap.

See [`ARCHITECTURE.md`](./ARCHITECTURE.md) for the data model, request flows and design decisions.

---

## API overview

Base path: `/api/v1/`. Authentication uses `Authorization: Bearer <access>` plus
the refresh cookie.

| Area            | Representative endpoints |
|-----------------|--------------------------|
| Auth            | `POST /auth/register/`, `POST /auth/login/`, `POST /auth/refresh/`, `POST /auth/logout/`, `POST /auth/password-reset/` |
| Catalogue       | `GET /courses/`, `GET /courses/{slug}/`, `GET /categories/`, `GET /instructors/` |
| Reviews         | `GET/POST /courses/{id}/my-review/`, `GET /courses/{id}/reviews/` |
| Learning        | `GET /my/enrollments/`, `GET /my/courses/{id}/player/`, `POST /my/lessons/{id}/complete/`, `GET /my/bookmarks/`, `GET /my/certificates/` |
| Payments        | `POST /payments/checkout/`, `POST /payments/enroll-free/`, `GET /my/orders/{id}/status/`, `POST /payments/webhook/` |
| Instructor      | `/instructor/courses/`, `/instructor/courses/{id}/sections/`, `/instructor/lessons/{id}/`, `POST .../submit/` |
| Admin           | `/admin/stats/`, `/admin/users/`, `/admin/courses/{id}/moderate/`, `/admin/orders/{id}/refund/`, `/admin/reviews/{id}/`, `/admin/settings/`, `/admin/audit-logs/` |
| Analytics       | `GET /analytics/public/`, `GET /analytics/instructor/` |

Responses are paginated (`page`, `page_size`) where it makes sense, and errors use a
consistent envelope:

```json
{ "error": { "code": "validation_error", "message": "…", "details": { } } }
```

Browse the full, always-current reference at `/api/docs/`.

---

## Testing & quality

```bash
# Backend — 98 tests (auth, permissions, ownership, payments, webhooks, certificates)
cd backend && .venv/Scripts/python manage.py test        # Windows
#            source .venv/bin/activate && python manage.py test

# Frontend — 44 tests (utils, API client, auth context, route guards, components)
cd frontend
npm test          # Vitest
npm run lint      # ESLint (zero warnings allowed)
npm run typecheck # tsc --noEmit
npm run build     # tsc -b && vite build
```

---

## Environment variables

### Backend (`backend/.env`, see `backend/.env.example`)

| Variable | Purpose | Default |
|----------|---------|---------|
| `DJANGO_SECRET_KEY` | Django signing key | insecure dev key |
| `DJANGO_DEBUG` | Debug mode | `True` |
| `DJANGO_ALLOWED_HOSTS` | Comma-separated hosts | `localhost,127.0.0.1,backend` |
| `DJANGO_CSRF_TRUSTED_ORIGINS` | Trusted origins for the Django admin | localhost:5173 |
| `PAI_DATA_DIR` | SQLite + media location | `backend/data` |
| `COOKIE_SECURE` / `COOKIE_SAMESITE` | Refresh-cookie flags | `False` / `Lax` |
| `CORS_ALLOWED_ORIGINS` | Browser origins allowed to call the API | localhost:5173 |
| `STRIPE_PUBLIC_KEY` / `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` | Stripe credentials | empty (payments disabled) |
| `SITE_URL` | Public SPA URL (Stripe redirects, email links) | `http://localhost:5173` |
| `MAX_UPLOAD_SIZE_MB` | Upload size ceiling | `10` |
| `EMAIL_BACKEND` | Email backend | console |

### Frontend (`frontend/.env.local`, see `frontend/.env.example`)

| Variable | Purpose | Default |
|----------|---------|---------|
| `VITE_API_BASE_URL` | REST API base URL | `/api/v1` |
| `VITE_PROXY_TARGET` | Dev-server proxy target | `http://localhost:8000` |

---

## Payments (Stripe)

Payments are optional — leave the Stripe keys blank and the app runs in a
"free courses only" mode (the checkout flow surfaces a friendly message).

To exercise paid enrolment in test mode:

1. Put your **test** keys in `.env`: `STRIPE_SECRET_KEY` (`sk_test_…`),
   `STRIPE_PUBLIC_KEY` (`pk_test_…`).
2. Forward webhooks to the backend and copy the signing secret into
   `STRIPE_WEBHOOK_SECRET`:

   ```bash
   stripe listen --forward-to localhost:8000/api/v1/payments/webhook/
   ```

The order only becomes `paid` (and access granted) after the backend verifies the
payment — via the signature-checked webhook or an authenticated Stripe
re-verification when the buyer returns. Webhook events are processed
idempotently, so duplicates are ignored.

---

## Deploying to production

The Compose stack is a complete, reproducible demo. Before a real deployment:

- Set `DJANGO_DEBUG=False`, a strong `DJANGO_SECRET_KEY`, correct
  `DJANGO_ALLOWED_HOSTS`, `SITE_URL`, `COOKIE_SECURE=True` and
  `DJANGO_CSRF_TRUSTED_ORIGINS` for your domain.
- Terminate TLS in front of nginx and forward `X-Forwarded-Proto`.
- **SQLite is single-writer:** run exactly **one** backend replica (the default
  Gunicorn config is sized for this). For horizontal scaling, switch to a
  client/server database such as PostgreSQL.
- Serve `/media` from durable object storage (e.g. S3), or keep the volume and
  proxy it as the included nginx config does.
- Mirror the Unsplash demo images into your own storage if you intend to keep
  them long-term.

---

## Licence & content notice

The application code is provided for demonstration purposes. Course content,
instructor identities and reviews created by `seed_demo_data` are fictional.
Photography is loaded from [Unsplash](https://unsplash.com) under the Unsplash
License and should be mirrored or replaced for production use.
