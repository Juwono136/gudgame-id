# Architecture

Last updated: 2026-06-25

## High-Level Shape

The app uses Next.js App Router with a server-first architecture. Pages and layouts under `app/` call server-side domain services from `lib/` where practical. Client-heavy screens use components plus hooks in `hooks/` that call JSON route handlers under `app/api`.

```text
Browser
  -> App Router pages/layouts
  -> Client components + React Query hooks
  -> app/api route handlers
  -> lib domain services
  -> Drizzle/Postgres, Redis, storage, Xendit/Iluma, email
```

## Core Layers

| Layer | Main files | Notes |
| --- | --- | --- |
| Routing | `app/**/page.tsx`, `app/**/layout.tsx`, `app/api/**/route.ts` | App Router only; root layout is dynamic to avoid build-time DB access. |
| Auth gate | `proxy.ts`, `lib/auth/*`, `lib/roles/*` | Proxy protects pages, fetches `/api/account/session-context`, redirects auth pages and legacy host paths. |
| API surface | `app/api/**/route.ts`, `lib/api/*` | Route handlers usually wrap service calls with `jsonSuccess` / `jsonError`. |
| Services | `lib/**/service.ts`, feature subfolders | Domain logic belongs here, not in UI. |
| Persistence | `db/client.ts`, `db/schema.ts`, `db/schema/*` | Global cached Drizzle client; schemas split by domain. |
| UI | `components/**`, `providers/**`, `hooks/**`, `stores/**` | Feature folders plus local UI primitives. |
| Integrations | `lib/payments`, `lib/storage`, `lib/email`, `lib/maps`, `lib/firebase` | External service boundaries. |

## Server/Client Boundaries

| Boundary | Pattern |
| --- | --- |
| Root app | `app/layout.tsx` is server, wraps client `AppProviders`. |
| Global providers | `providers/app-providers.tsx` is client and nests theme, React Query, confirm dialog, dashboard layout client, toaster. |
| Protected pages | `proxy.ts` handles coarse redirects; page/API code still uses role/session guards. |
| Client data | Hooks in `hooks/` call API routes, typically for dashboards, mutations, notifications, and live tournament state. |
| Server data | Public pages and admin pages often call `lib/*` services directly from server components. |

## Auth And Roles

Better Auth is configured in `lib/auth/server.ts` with Drizzle tables (`user`, `session`, `account`, `verification`), email verification, password reset, Firebase Google plugin, Redis secondary storage, and session hooks for inactive accounts / last login.

Roles are separate from Better Auth's user row through `db/schema/roles.ts` and helpers in `lib/roles/*`. Route access is enforced in:

| File | Responsibility |
| --- | --- |
| `proxy.ts` | Page-level redirects and role path checks. |
| `app/api/auth/[...all]/route.ts` | Better Auth handler wrapper with origin/rate guards, login lockout tracking, and security headers. |
| `app/api/account/session-context/route.ts` | Proxy/session context source; returns roles, dashboard links, permissions, profile completeness, provider status, inactive/stale session flags. |
| `lib/auth/role-guard.ts` | Server/API guard helpers. |
| `lib/admin/session.ts` | Admin-specific session context. |
| `lib/roles/route-access.ts` | Path-to-role authorization rules. |
| `lib/security/headers.ts` | CSP and security headers applied by proxy and auth API wrapper. |
| `lib/security/auth-lockout.ts` | Login lockout state for email sign-in attempts. |

`lib/constants/routes.ts` defines route groups. `LEGACY_HOST_DASHBOARD_PATHS` currently redirects `/dashboard/contributor` and `/admin/contributor` to `/dashboard/host`, even though physical legacy pages still exist in `app/`.

## Configuration

| File | Purpose |
| --- | --- |
| `lib/config/env.server.ts` | Server env validation. |
| `lib/config/env.client.ts` | Client-safe env. |
| `lib/config/site.ts` | Site and brand config. |
| `lib/config/xendit-env.ts` | Payment provider config. |
| `next.config.ts` | Next config. Needs verification. |
| `drizzle.config.ts` | Drizzle migration config. Needs verification. |

## Architectural Risks

| Risk | Why it matters |
| --- | --- |
| `proxy.ts` calls `/api/account/session-context` | Auth redirects depend on route handler availability and cookie forwarding. |
| `app/api/auth/[...all]/route.ts` wraps Better Auth | Changes can bypass origin checks, auth lockout, or security headers. |
| `lib/constants/routes.ts` | Route constants include deprecated/legacy paths and an `/admin/content-approval` constant without an observed page. |
| Payment and payout code spans several providers | Xendit, XenPlatform, Iluma, DB status updates, and notifications must stay consistent. |
| Root layout is `dynamic = "force-dynamic"` | Avoids build DB access but affects caching expectations. |
| Mixed server/client feature surfaces | Moving logic across boundaries can break cookies, auth, or environment access. |
| Many existing lint warnings | React hooks and unused code warnings may hide future regressions. |
