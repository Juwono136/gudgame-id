# Data Flow

Last updated: 2026-06-25

## Default Request Flow

```text
Page request
  -> proxy.ts security/auth/role redirects
  -> App Router page/layout
  -> server service in lib/*
  -> db/client.ts getDb()
  -> Drizzle schema table
  -> render server + client components
```

Client interactions generally use:

```text
Client component
  -> hook in hooks/*
  -> fetch app/api/* route handler
  -> guard/parse/validate request
  -> lib service
  -> DB/external integration
  -> jsonSuccess/jsonError
  -> React Query cache update/invalidation
```

## Auth/Session Flow

| Step | File | Notes |
| --- | --- | --- |
| Cookie check | `proxy.ts` | Uses Better Auth `getSessionCookie`. |
| Session context | `/api/account/session-context` | Returns authenticated state, roles, inactive/must-change-password flags. |
| Redirect logic | `proxy.ts`, `lib/roles/route-access.ts` | Handles protected pages, auth pages, role paths, legacy host paths. |
| Server session | `lib/auth/session.ts` | `getServerSession`, `requireSession`, sign-out helper. |
| API role guard | `lib/auth/role-guard.ts` | Use in protected route handlers. |
| Auth API security | `app/api/auth/[...all]/route.ts` | Wraps Better Auth GET/POST with security headers, API origin guard, email sign-in lockout checks, failed-login recording, and clear-on-success. |
| Security headers | `proxy.ts`, `lib/security/headers.ts` | Proxy applies headers to pages and API pass-through; auth route wrapper applies them to Better Auth responses. |

Legacy contributor paths (`/dashboard/contributor`, `/admin/contributor`) redirect to `/dashboard/host` before page rendering.

## API Response Flow

| Helper | File | Responsibility |
| --- | --- | --- |
| `jsonSuccess` | `lib/api/response.ts` | `{ success: true, data }`. |
| `jsonError` | `lib/api/response.ts` | Converts operational errors into JSON response and logs server errors. |
| `parseRequestJson` | `lib/api/parse-request-json.ts` | Request parsing. |
| `guardRequest` | `lib/api/guard-request.ts` | Shared request guard utilities. |
| `extractApiError` | `lib/api/extract-api-error.ts` | Client-side error extraction. |

## Database Flow

`db/client.ts` resolves `DATABASE_URL`, creates a `postgres` client, and stores Drizzle and SQL client instances on `globalThis` to avoid reconnect churn. `db/schema.ts` re-exports domain schemas from `db/schema/*`.

Direct `getDb()` usage is common in `lib/**` services. Some route handlers also access DB directly for quick lookups or transition checks, including tournament create/manage, host tournament create/update/delete, gear/player search, account completion/password flows, registration status/payment status, admin sport context, admin sports list, and selected registration handlers. A few pages also call `getDb()` directly (`app/dashboard/host/page.tsx`, `app/dashboard/complete-profile/page.tsx`, `app/auth/change-password/page.tsx`).

Needs verification: transaction coverage in high-risk write flows such as payment confirmation, bracket assignment, and payout disbursement.

## Payment Flow

| Flow | Files | Summary |
| --- | --- | --- |
| Player checkout | `lib/tournaments/payments/checkout-payment.ts`, `checkout-methods.ts`, `app/api/tournaments/registrations/[id]/pay` | Creates/starts payment for a registration. |
| Xendit webhook | `app/api/webhooks/xendit/route.ts`, `lib/payments/xenplatform/split-webhook.ts`, payout webhook helpers | Receives provider callbacks and updates payment/payout state. |
| Invoice document | `lib/tournaments/payments/payment-invoice.ts`, `app/api/payments/transactions/[paymentId]/invoice` | Generates or fetches invoice/receipt views. |
| Host payout | `lib/payments/host-payout/*`, `app/api/cron/host-payouts`, `app/api/host/payout*` | Validates bank accounts and processes disbursements. |

## Tournament Flow

| Flow | Files |
| --- | --- |
| Public list/detail | `lib/tournaments/service.ts`, public pages and APIs |
| Create/edit | `lib/tournaments/service.ts`, `lib/tournaments/workspace/service.ts`, dashboard/admin/host APIs |
| Registration | `lib/tournaments/registration/service.ts`, registration route handlers |
| Bracket | `lib/tournaments/brackets/*`, bracket route handlers |
| Reclub | `lib/tournaments/reclub/*`, lobby/match/team route handlers |
| Stats sync | `lib/tournaments/stats/*`, player competition schemas |

## Wiki Flow

| Flow | Files |
| --- | --- |
| Public read | `lib/wiki/public.ts`, `public-players.ts`, `public-gear.ts` |
| Admin CRUD | `lib/wiki/service.ts`, `lib/wiki/admin-entity-access.ts`, admin wiki route handlers |
| Rich text/media | `lib/wiki/sanitize-rich-text.ts`, `lib/wiki/upload-media.ts`, storage helpers |
| Gear specs | `lib/wiki/gear/*`, `lib/wiki/field-definitions.ts` |
| Scraping | `lib/wiki/scrapers/*`, scrape host service and admin scrape APIs |

## Client Cache Flow

React Query is configured by `providers/query-provider.tsx`. Hooks in `hooks/` own query keys and mutations for user-facing state. Route handlers remain the stable boundary for client mutations.

## Needs Verification

- Exact query keys and cache invalidation behavior per hook.
- Whether any route handler bypasses `jsonSuccess/jsonError`.
- Whether webhooks validate signatures for every provider callback.
