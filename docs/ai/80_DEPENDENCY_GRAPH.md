# Dependency Graph

Last updated: 2026-06-25

## Top-Level Graph

```text
app pages/layouts
  -> components/*
  -> lib/* services/config/auth
  -> db/*

client components
  -> hooks/*
  -> app/api/*
  -> lib/* services

lib services
  -> db/client + db/schema
  -> external providers: Redis, Xendit, Iluma, Firebase, S3 storage, SMTP, Google Maps
```

## Domain Dependencies

| Domain | Depends on |
| --- | --- |
| Auth | `db/schema/auth`, Better Auth, Redis secondary storage, email, Firebase Google, roles. |
| Roles/admin | Auth session, role assignment table, route constants, admin services. |
| Wiki | Sports, storage/media, validation, scraper allowlist/fetch/parser, admin access. |
| Tournaments | Sports, wiki gear, registration, payments, brackets, Reclub, stats, notifications, maps, storage. |
| Payments | Xendit/XenPlatform clients, Iluma, DB payment tables, registration services, email/notifications. |
| Host payouts | Host bank accounts, tournament payments, Xendit payouts, cron, notifications/email. |
| Player dashboard | Auth/session, player competition, registrations, payments, profile completion. |
| Public pages | Wiki public services, tournament public services, sport config. |

## Shared High-Risk Files

| File | Why high risk |
| --- | --- |
| `proxy.ts` | Central page auth/role redirect behavior and security headers. |
| `app/layout.tsx` | Global provider entry, metadata, dynamic rendering policy. |
| `providers/app-providers.tsx` | Global client provider order. |
| `db/client.ts` | Database connection lifecycle. |
| `db/schema.ts` | Exports all schema modules plus legacy tables. |
| `lib/auth/server.ts` | Better Auth config, email verification, password reset, hooks. |
| `app/api/auth/[...all]/route.ts` | Better Auth adapter wrapper, origin guard, login lockout, security headers. |
| `lib/auth/session.ts` | Server session helper used across protected flows. |
| `lib/auth/account-status.ts` | Inactive/must-change-password status used by session/proxy/auth hooks. |
| `lib/auth/redis-secondary-storage.ts` | Better Auth rate-limit/secondary storage boundary. |
| `lib/auth/role-guard.ts` | API/page role guard helpers. |
| `lib/constants/routes.ts` | Auth/dashboard/admin route constants, protected path groups, legacy host redirects. |
| `lib/roles/route-access.ts` | Role-to-route mapping used by proxy. |
| `lib/roles/dashboard-links.ts` | Session context dashboard links and admin-access visibility. |
| `lib/security/headers.ts` | Global security header/CSP builder. |
| `lib/security/auth-lockout.ts` | Email sign-in lockout state. |
| `lib/api/response.ts` | Standard JSON envelope and error logging. |
| `lib/api/guard-request.ts` | Origin/tier request guard used by auth and likely mutating APIs. |
| `lib/tournaments/registration/service.ts` | Registration, payment, confirmation flow. |
| `lib/tournaments/payments/checkout-payment.ts` | Payment creation and registration payment state. |
| `lib/tournaments/brackets/generate.ts` | Bracket creation and seeding. |
| `lib/tournaments/brackets/assign.ts` | Bracket slot assignment. |
| `lib/tournaments/reclub/matches.ts` | Reclub match lifecycle. |
| `lib/tournaments/reclub/live-score.ts` | Live score updates. |
| `lib/payments/xendit/client.ts` | Provider request boundary. |
| `lib/payments/xenplatform/split-webhook.ts` | Split payment webhook state transition. |
| `lib/payments/host-payout/disbursement/job.ts` | Scheduled payout processor. |
| `lib/payments/host-payout/disbursement/processor.ts` | Payout processor internals. |
| `lib/wiki/service.ts` | Admin wiki CRUD. |
| `lib/wiki/scrapers/security.ts` | Scrape URL allowlist/security gate. |
| `lib/wiki/scrape-hosts/service.ts` | Admin-managed scraper host allowlist. |
| `lib/storage/object-lifecycle.ts` | Object cleanup on replacement/deletion. |

## External Dependencies

| Dependency | Used for |
| --- | --- |
| Better Auth | Auth/session/account flows. |
| Drizzle ORM + postgres | Database access. |
| Redis/ioredis | Cache and Better Auth secondary storage. |
| Xendit/XenPlatform | Payments, invoices, payouts, split rules. |
| Iluma | Indonesian bank validation. |
| Firebase/Firebase Admin | Google identity token verification/plugin. |
| Nodemailer | Transactional emails. |
| S3-compatible storage | Media/profile/wiki/tournament assets. |
| Google Maps/Places | Venue search and embed URLs. |
| React Query | Client cache and mutation state. |
| Zustand | Auth UI store. |

## Change Risk Guide

| Change area | Risk level | Notes |
| --- | --- | --- |
| Copy/static page content | Low | Still check route rendering. |
| UI-only component display | Medium | Client/server boundary and role visibility may matter. |
| Hooks/query keys | Medium | Can break dashboard cache invalidation. |
| Auth/proxy/roles | High | Can lock users out or expose admin/host pages. |
| Payment/webhook/payout | High | Money movement and idempotency risk. |
| DB schema/migration | High | Requires migration and data compatibility review. |
| Tournament scoring/brackets | High | Race conditions and history/stat sync. |

## Needs Verification

- Exact dependency direction for every admin and dashboard page.
- Which services are safe for edge/runtime versus Node-only.
