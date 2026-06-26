# API Map

Last updated: 2026-06-25

## Conventions

| Convention | Notes |
| --- | --- |
| Location | Route handlers live under `app/api/**/route.ts`. |
| Response | Prefer `jsonSuccess` / `jsonError` from `lib/api/response.ts`. |
| Auth | Protected handlers should use `lib/auth/session.ts`, `lib/auth/role-guard.ts`, or admin/role service guards. |
| Validation | Zod schemas in `lib/validations/*` or feature-specific schema files. |
| Server actions | No explicit `"use server"` actions were found in this pass; mutations are primarily route-handler based. |

## API Groups

| Group | Routes | Methods observed | Domain |
| --- | --- | --- | --- |
| Auth | `/api/auth/[...all]` | GET, POST | Better Auth adapter route. |
| Account | `/api/account/*` | GET, POST, PATCH | Registration, settings, profile, password, session context, player data. |
| Admin | `/api/admin/*` | GET, POST, PATCH, DELETE | Admin dashboard, users, sports, tournaments, wiki entities, payment settings. |
| Public sport data | `/api/public/sports/[sportSlug]/*` | GET | Public tournaments, players, gear. |
| Tournament public/workspace | `/api/tournaments/*` | GET, POST, PATCH, DELETE | Tournament create/manage, registration, lobby, teams, matches, bracket, cover. |
| Host | `/api/host/*` | GET, POST, PATCH, DELETE | Host tournaments, payments, payout profile, bank accounts, disbursements. |
| Payments | `/api/payments/*` | GET | Payout channels, invoice document. |
| Webhooks | `/api/webhooks/xendit` | POST | Xendit/XenPlatform payment and payout callbacks. |
| Notifications | `/api/notifications*` | GET, PATCH | Notification list, unread count, mark read/all read. |
| Maps | `/api/maps/*` | GET | Google Places autocomplete/details and embed URL. |
| Media | `/api/media/[...path]` | GET | Media proxy. |
| Gear search | `/api/gear/search`, `/api/tournaments/gear-search` | GET | Gear lookup for public/forms. |
| Health/cron | `/api/health`, `/api/cron/host-payouts` | GET, POST | Health checks and payout job trigger. |

## High-Value Route Handlers

| Route | Purpose |
| --- | --- |
| `/api/auth/[...all]` | Better Auth GET/POST with origin guard, security headers, and email sign-in lockout side effects. |
| `/api/account/session-context` | Used by `proxy.ts`; critical for auth redirects and role gates. |
| `/api/account/change-password-required` | Forced password-change mutation for users with `mustChangePassword`. |
| `/api/account/complete-profile` | Profile completion write path; directly reads/writes user fields. |
| `/api/account/settings/player` | Player profile/equipment settings read/write. |
| `/api/webhooks/xendit` | Provider callback entrypoint; high risk for idempotency/security. |
| `/api/tournaments/registrations/[id]/pay` | Starts payment for a registration. |
| `/api/tournaments/registrations/[id]/confirm` | Player confirmation/decline path after registration/payment flow. |
| `/api/tournaments/registrations/[id]/payment-status` | Client polling for payment state. |
| `/api/tournaments/manage/[id]` | Tournament owner/admin update/delete path with paid-registration checks. |
| `/api/tournaments/manage/[id]/workspace` | Tournament workspace data for owner/manage UI. |
| `/api/tournaments/[sportSlug]/[slug]/bracket/*` | Bracket generation, assignment, scoring, live updates. |
| `/api/tournaments/[sportSlug]/[slug]/staff/*` | Official tournament scoring staff list/invite/remove for public bracket runtime access. |
| `/api/tournaments/[sportSlug]/[slug]/matches/*` | Reclub match lifecycle and scoring. |
| `/api/tournaments/[sportSlug]/[slug]/teams/*` | Reclub/registration team create, switch, update flows. |
| `/api/host/tournaments/[id]` | Host update/delete path with paid-registration checks. |
| `/api/host/tournaments/[id]/workspace` | Host workspace data. |
| `/api/host/payout/*` | Host payout setup, bank account management, disbursement views. |
| `/api/cron/host-payouts` | Scheduled payout processing; should be protected by cron secret. |
| `/api/admin/wiki-entities/scrape*` | Remote scraping; must preserve allowlist/security checks. |
| `/api/admin/wiki-scrape-hosts*` | Scraper allowlist CRUD. |
| `/api/admin/sport-context` | Admin active sport context mutation. |

## Route Inventory By Folder

| Folder | Representative handlers |
| --- | --- |
| `app/api/account` | register, settings, complete-profile, session-context, password flows, player payments/registrations/matches/gear. |
| `app/api/admin` | active-role, me, sport-context, dashboard stats, sports CRUD/reorder, users CRUD/stats, tournaments CRUD, wiki entity CRUD/search/import/scrape, wiki scrape host CRUD, payment settings, payment transactions. |
| `app/api/tournaments` | create/manage, cover upload/delete, players search, gear search, register/join/leave/lobby/participants, teams, matches, bracket, official scoring staff, registrations payment/confirmation. |
| `app/api/host` | host tournament CRUD/workspace/status/bracket, host payments, payout profile/banks/disbursements. |
| `app/api/public` | public sport-scoped tournaments, gear, players. |

## Direct Database Access In Route Handlers

Most route handlers delegate to services, but several call `getDb()` directly for checks/lookups. Keep these in mind when changing schema or access rules:

| Area | Representative routes |
| --- | --- |
| Account/auth | `/api/account/session-context`, `/api/account/register`, `/api/account/complete-profile`, `/api/account/change-password-required`, `/api/account/forgot-password`, `/api/account/settings/change-password`. |
| Tournament create/manage | `/api/tournaments/create`, `/api/tournaments/manage/[id]`, `/api/tournaments/registrations/[id]`, `/api/tournaments/registrations/[id]/payment-status`, `/api/tournaments/[sportSlug]/[slug]/register`. |
| Host/admin tournament | `/api/host/tournaments`, `/api/host/tournaments/[id]`, `/api/admin/tournaments/[id]`. |
| Search/context | `/api/tournaments/gear-search`, `/api/tournaments/players/search`, `/api/admin/sport-context`, `/api/admin/sports`. |

## Recommended API Tests

| Area | Tests |
| --- | --- |
| Auth/account | unauthenticated, inactive, must-change-password, role-denied responses. |
| Payments/webhooks | signature/secret validation, idempotency, status transitions, malformed payloads. |
| Tournament mutations | owner/role checks, invalid state transitions, race conditions. |
| Admin CRUD | permission denied, validation errors, deletion constraints. |
| Scraping | blocked host, timeout/fetch failure, parser output validation. |

## Needs Verification

- Exact auth guard used by each route handler.
- Whether every route returns the common JSON envelope.
- Provider webhook signature verification details.
