# Decisions

Last updated: 2026-06-25

This file records architecture decisions inferred from code. Marked items should be verified with project owners before being treated as formal ADRs.

| Decision | Status | Evidence | Consequence |
| --- | --- | --- | --- |
| Use Next.js App Router | Inferred | `app/` pages/layouts/routes | New routes should follow App Router conventions. |
| Keep root layout dynamic | Inferred | `app/layout.tsx` exports `dynamic = "force-dynamic"` | Avoids build-time DB access; limits static optimization. |
| Use Better Auth for auth/session | Inferred | `lib/auth/server.ts`, `app/api/auth/[...all]` | Auth changes should go through Better Auth config and helpers. |
| Store roles separately from Better Auth | Inferred | `db/schema/roles.ts`, `lib/roles/*` | Role checks require role assignment sync, not just user row. |
| Enforce page access in proxy | Inferred | `proxy.ts` | Route access changes need proxy and role route map review. |
| Use Drizzle/Postgres for primary persistence | Inferred | `db/client.ts`, `db/schema/*` | DB changes require schema and migrations. |
| Use React Query for client state | Inferred | `providers/query-provider.tsx`, `hooks/*` | Client mutation changes should handle query invalidation. |
| Keep domain logic in `lib/` services | Inferred | Many route handlers delegate to `lib/*` | Avoid putting business logic directly in components/routes. |
| Use common JSON API envelope | Inferred | `lib/api/response.ts` | API clients expect `{ success, data }` or error JSON. |
| Use Xendit/XenPlatform for payments | Inferred | `lib/payments/xendit*`, `lib/payments/xenplatform/*` | Payment changes must consider provider IDs/webhooks. |
| Use RTK for terminal commands | Explicit global instruction | `/home/juwono/.codex/RTK.md` | Prefix shell commands with `rtk`; do not create local `RTK.md`. |

## Open Decisions / Needs Verification

| Topic | Question |
| --- | --- |
| Static vs dynamic rendering | Are any public pages intended to regain static caching later? |
| Payment provider split | Which flows use legacy Xendit client vs XenPlatform split APIs in production? |
| Contributor role | Is contributor dashboard a distinct long-term role or transitional path? |
| Legacy tables | Are `playerProfiles` and `equipments` still active? |
| Webhook security | What exact signature/secret validation is required per callback? |
