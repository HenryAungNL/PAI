# PAI Implementation Checklist

## Phase 1 — Foundation
- [x] Inspect repo / tooling (Python 3.13, Node 24, Docker available)
- [x] Backend skeleton (Django config, settings, urls)
- [x] Frontend skeleton (Vite + TS + Tailwind + Router + Query)
- [x] Docker files (backend, frontend, compose, env examples)

## Phase 2 — Backend
- [x] accounts (custom User, JWT auth in HttpOnly cookie, roles, password reset)
- [x] courses (Category, Course, CourseSection, Lesson, publishing workflow)
- [x] learning (Enrollment, LessonProgress, Bookmarks, progress calc)
- [x] payments (Order, Refund, Stripe Checkout + signed webhook, idempotency)
- [x] reviews (enrolled-only reviews, moderation)
- [x] certificates (completion verification, unique codes, public verify)
- [x] audit (admin action logging)
- [x] analytics (real aggregates for instructor/admin)
- [x] admin API endpoints (users, moderation, categories, orders, refunds, settings, audit)
- [x] OpenAPI docs (drf-spectacular)
- [x] Backend tests (98 passing: auth, permissions, ownership, payments, webhooks, certificates)

## Phase 3 — Frontend
- [x] Design tokens + shared UI components (white/orange, Inter, Lucide)
- [x] API client (typed, JWT access in memory, refresh cookie), TanStack Query setup
- [x] Public site: Home (hero, categories, featured courses, why, how, instructors, testimonials, CTA, footer), Explore, Course detail, Categories, Instructors, About, Contact
- [x] Auth pages: register, login, forgot/reset password
- [x] Student dashboard: overview, my learning, player, progress, bookmarks, certificates, orders, settings
- [x] Instructor dashboard: courses, course editor (details + curriculum), analytics
- [x] Admin dashboard: stats, users, course moderation, categories, enrollments, orders/refunds, reviews, audit, settings
- [x] Certificate public verification page + printable certificate
- [x] Payments: success (polling) + cancel pages
- [x] Route table wired (App.tsx) + providers (main.tsx)
- [x] Frontend tests (44 passing), typecheck, lint, production build

## Phase 4 — Data, Docker, Docs
- [x] seed_demo_data command (real Unsplash photography, demo users, courses, reviews)
- [x] Docker Compose (backend + frontend, SQLite persistence, healthchecks)
- [x] README + ARCHITECTURE + .env.example docs
- [x] Backend tests green (98) after serializer changes
- [x] Frontend lint / typecheck / build green
- [x] Customer-facing custom React admin dashboard (Django admin is dev-only)

## Verification summary
- Backend: `python manage.py test` → 98 tests, OK
- Frontend: `npm test` → 44 tests; `npm run lint` → 0 warnings; `npm run typecheck` → clean; `npm run build` → success
- Docker: `docker compose config` valid; `docker compose up --build` builds and starts both services; `/health` reachable
- Live smoke test via nginx (:8080): SPA root + deep links 200, `/health` ok, `/api/v1/courses/` count=8, admin login + `/api/v1/admin/stats/` ok; both containers report `healthy`
- Fixed frontend container healthcheck to probe `http://127.0.0.1/healthz` (busybox `wget` resolved `localhost` to IPv6 `::1`, but nginx listens on IPv4)
