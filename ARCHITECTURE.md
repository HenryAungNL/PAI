# PAI Architecture

This document explains how PAI is assembled, the main request/flow paths, and the
reasoning behind notable decisions. For setup instructions see [`README.md`](./README.md).

---

## 1. System overview

```
┌───────────────────────────────────────────────────────────────────────────┐
│                                 Browser                                    │
│   React SPA (TypeScript)  ── fetch('/api/v1/…', credentials: 'include')    │
└───────────────▲───────────────────────────────────────────┬───────────────┘
                │ HTML/JS/CSS (hashed assets)                │ JSON + cookies
                │                                            │
        ┌───────┴────────┐                        ┌──────────▼───────────┐
        │ nginx (SPA)    │  /api, /media, /static │ Django + DRF         │
        │ :80 → :8080    │ ─────────────────────► │ Gunicorn + WhiteNoise│
        │ SPA fallback   │                        │ :8000                │
        └────────────────┘                        └──────────┬───────────┘
                                                             │
                                       ┌─────────────────────┼─────────────────────┐
                                       │                     │                     │
                                 ┌─────▼─────┐        ┌──────▼──────┐       ┌──────▼──────┐
                                 │ SQLite    │        │ Media store │       │ Stripe API  │
                                 │ /app/data │        │ /app/data   │       │ (Checkout + │
                                 │           │        │ /media      │       │  webhooks)  │
                                 └───────────┘        └─────────────┘       └─────────────┘
```

**Single-origin by design.** The SPA and the API are always presented from one
origin — the Vite dev server proxies `/api` in development, and nginx proxies it
in Docker. This keeps `HttpOnly` cookie auth straightforward and avoids CORS
surprises in production.

---

## 2. Guiding principles

1. **Server-authoritative.** Prices, permissions, progress and access are decided
   by the API, never trusted from the client.
2. **One way to do each thing.** Shared utilities (pagination, error envelope,
   throttling, testing helpers) live in `apps.core`; every app follows the same
   serializer/service/handler patterns.
3. **Denormalise for reads, recompute on the way in.** Ratings, review counts and
   enrolment counts are stored on `Course` and updated by services, keeping the
   catalogue fast.
4. **Guard the UX, enforce on the server.** React route guards tidy navigation;
   DRF permissions are the actual boundary.
5. **Test the risky parts.** Ownership, payments, webhooks and auth flows have the
   densest coverage.

---

## 3. Backend

### 3.1 Project layout

```
backend/
├── config/                 # settings.py, urls.py, wsgi.py, asgi.py
├── apps/
│   ├── core/               # cross-cutting: pagination, exceptions, throttling,
│   │                       # health check, schema extension, test helpers,
│   │                       # seed_demo_data management command
│   ├── accounts/           # User, JWT auth classes, roles, password reset
│   ├── courses/            # Category, Course, CourseSection, Lesson, authoring
│   ├── learning/           # Enrollment, LessonProgress, Bookmark, access rules
│   ├── payments/           # Order, Payment, Refund, WebhookEvent, Stripe services
│   ├── reviews/            # Review + moderation, rating recomputation
│   ├── certificates/       # Certificate issuance + public verification
│   ├── audit/              # AuditLog + logging helper
│   └── analytics/          # aggregates, PlatformSettings, public site config
└── docker/entrypoint.sh
```

Each app owns its models, serializers, views, URLs and tests. Cross-app
relationships use string references (e.g. `"courses.Course"`) to avoid import
cycles, and service functions coordinate multi-model changes inside transactions.

### 3.2 Request lifecycle

1. **Middleware** — security, WhiteNoise (static files), CORS, session, CSRF,
   auth, messages, clickjacking.
2. **URL routing** — everything is namespaced under `/api/v1/`; the schema/docs
   live at `/api/schema/` and `/api/docs/`; `/health` is unauthenticated.
3. **Authentication** — a custom `CookieJWTAuthentication` reads the `Bearer`
   access token; the refresh token is an `HttpOnly` cookie scoped to
   `/api/v1/auth`.
4. **Throttling** — DRF anon/user throttles plus a tighter `auth` scope on
   login/register/password-reset endpoints.
5. **Permission classes** — e.g. `IsPlatformAdmin`, instructor-ownership checks,
   and enrolled-only gates on learning endpoints.
6. **View + serializer** — thin views delegating to serializers and services.
7. **Exception handler** — any `APIError` (or DRF exception) becomes a uniform
   body: `{ "error": { "code", "message", "details" } }`.

### 3.3 Data model (key entities)

```
User (accounts)
 ├─ role: student | instructor | admin
 ├─ is_approved      (gate for the public instructor directory)
 └─ is_suspended / suspension_reason

Category 1──* Course 1──* CourseSection 1──* Lesson
                 ▲
                 │ instructor (FK → User)
                 │ status: draft | pending | published | rejected | archived
                 └─ denormalised: average_rating, review_count, enrollment_count

Enrollment (learning)               Order (payments)
 ├─ student → User                   ├─ student → User
 ├─ course  → Course                 ├─ course  → Course (nullable)
 ├─ progress_percent                 ├─ status: pending|paid|failed|expired|
 └─ completed_at                     │          refunded|partially_refunded
      ▲                              ├─ amount_cents, refunded_amount_cents
      │                              └─ 1──* Payment, 1──* Refund
 LessonProgress ─ lesson → Lesson    WebhookEvent ─ idempotency ledger
 Bookmark      ─ course → Course

Review ─ course → Course, student → User
 ├─ rating 1..5, moderation_status: visible|hidden, is_reported, is_demo
 └─ recompute_course_rating() keeps Course aggregates in sync

Certificate ─ enrollment → Enrollment   (unique verifiable `code`)
AuditLog   ─ actor → User               (append-only admin action trail)
PlatformSettings                        (singleton: branding, links, toggles)
```

### 3.4 Access rules (highlights)

- **Learning endpoints** (`/my/...`) require an enrolment, or ownership for
  instructors/admins. A non-enrolled viewer can only reach *preview* lessons.
- **Instructor authoring** is scoped to courses they own; `submit` moves a course
  to `pending` for moderation.
- **Moderation** (`approve`/`reject`/`archive`/`restore`) is admin-only, and
  rejection notes are surfaced back to the instructor.
- **Refunds** are admin-only; revenue is reported as gross, refunded and net, and
  status moves to `refunded` or `partially_refunded`.
- The dedicated `learning/access.py` module centralises "can this user view the
  full course?" so the rule lives in one place.

### 3.5 Payments flow

1. Client calls `POST /payments/checkout/` with a `course_id`.
2. The server looks up the **current** price (never trusting the client), creates
   a `pending` `Order`, and opens a Stripe Checkout Session.
3. Stripe redirects back to `/payment/success?order=…&session_id=…`; the SPA polls
   the order status endpoint.
4. The order is marked `paid` and enrolment granted when **either**:
   - the signature-verified webhook is received, **or**
   - the buyer returns and the server re-verifies the session with Stripe.

Every webhook event id is recorded in `WebhookEvent`, so retries are idempotent
and out-of-order duplicates are ignored. Free courses use
`POST /payments/enroll-free/`, which enrols immediately without Stripe.

---

## 4. Frontend

### 4.1 Layout & routing

`src/App.tsx` declares the routing tree with React Router's data router:

- **PublicLayout** — marketing and catalogue pages, with navbar/footer.
- **Auth pages** — login, register, forgot/reset password (own split layout).
- **DashboardLayout** — student/instructor workspace; the sidebar adapts to role.
- **AdminLayout** — the custom admin dashboard with live badges.
- **Standalone** — payment result pages, the course player, the printable certificate.

`ProtectedRoute` requires a session; `RoleRoute` restricts a subtree to specific
roles. Guards are UX-only — the API re-checks everything.

### 4.2 Data layer

- `src/lib/api.ts` — a small typed `fetch` wrapper. It attaches the in-memory
  access token, sends cookies, and on a `401` performs a **single** shared
  refresh-and-retry. Errors become `ApiError` instances carrying `status`,
  `code` and `details`.
- `src/lib/queryClient.ts` — TanStack Query defaults: no retry on 4xx, two
  retries on 5xx/network, 30s `staleTime`, no refetch on focus.
- `src/hooks/useApi.ts` — every query and mutation, grouped by domain. Mutations
  invalidate the queries they affect, so the UI stays consistent without manual
  cache juggling.

### 4.3 Authentication

`AuthProvider` (`src/features/auth/AuthContext.tsx`):

- On boot, attempts a silent refresh; success loads `/users/me/`, failure resolves
  to `anonymous`.
- `login`/`register` store the access token in memory only and set the user.
- `logout` clears server state, the in-memory token and the query cache.
- The raw refresh token is **never** readable by JavaScript (`HttpOnly`), so it
  cannot be exfiltrated via XSS.

### 4.4 UI system

- Design tokens live in `src/styles/index.css` and `tailwind.config.ts`
  (white + orange: primary `#F97316`, deep `#EA580C`, surfaces `#FFFFFF`/`#FFF7ED`).
- `src/components/ui/` holds unstyled-behaviour primitives (button, input, modal,
  tabs, table, rating, pagination, states…).
- `src/components/common/` holds composed building blocks (PageHeader, StatCard,
  TrendChart) and `src/components/courses/` holds course-specific pieces.
- Forms use React Hook Form + Zod; feedback uses Sonner toasts.
- The course player converts YouTube/Vimeo URLs to embeddable ones and renders
  written lessons with preserved whitespace.
- The certificate page reuses a `.no-print` utility so "Print" yields a clean
  document.

---

## 5. Cross-cutting concerns

| Concern | Where | Notes |
|---------|-------|-------|
| Error envelope | `apps/core/exceptions.py` | Uniform `{error:{code,message,details}}` |
| Pagination | `apps/core/pagination.py` | `page`/`page_size` (default 12, max 100) |
| Throttling | `apps/core/throttling.py` | Anon/user + strict `auth` scope |
| Health | `apps/core/health.py` | `GET /health` for container probes |
| Audit | `apps/audit/` + `log_event()` | Append-only admin action trail |
| Settings | `apps/analytics/models.py` | Singleton, cached, editable from the admin UI |
| Config | env vars | See README; safe defaults for local dev |

---

## 6. Testing strategy

**Backend (Django `TestCase`, 98 tests).** Auth and password reset, role and
ownership permissions, course publishing/moderation, enrolment and progress,
free and paid checkout, signed webhook verification and idempotency, refunds,
certificates and public verification, review moderation, admin aggregates and
settings. A `TESTING` flag swaps in a fast password hasher and locmem cache/email.

**Frontend (Vitest + Testing Library, 44 tests).** Pure utilities and formatters,
the API client (token handling, error wrapping, 401 refresh-and-retry), the auth
context (bootstrap, login, logout), route guards, and representative components.

Run everything with the commands in the [README](./README.md#testing--quality).

---

## 7. Notable decisions & trade-offs

- **SQLite** keeps the demo self-contained and reproducible. It is single-writer,
  so the deployment guidance is one backend replica; the data layer is otherwise
  ORM-standard and swaps cleanly to PostgreSQL.
- **Access token in memory + refresh in `HttpOnly` cookie** removes the usual
  `localStorage` XSS exposure while keeping the SPA responsive.
- **A single refresh promise** is shared across concurrent 401s so a burst of
  requests triggers exactly one token rotation.
- **React dashboards over the Django admin** deliver the intended product
  experience; the stock Django admin remains available but is treated as a
  development/emergency tool only.
- **Denormalised course aggregates** trade a little write complexity for
  materially simpler and faster catalogue reads.
- **Unsplash imagery** keeps the demo visually rich; the README flags that these
  should be mirrored to owned storage for production.
