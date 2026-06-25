# Route Map

Last updated: 2026-06-25

## Router

The project uses Next.js App Router. Special files observed:

| File | Purpose |
| --- | --- |
| `app/layout.tsx` | Root server layout, metadata, fonts, `AppProviders`; forced dynamic. |
| `app/template.tsx` | App template. Needs verification. |
| `app/loading.tsx` | Global loading UI. |
| `app/not-found.tsx` | Global 404. |
| `app/dashboard/layout.tsx` | Dashboard shell. |
| `app/dashboard/host/layout.tsx` | Host dashboard shell. |
| `app/dashboard/settings/layout.tsx` | Settings sub-layout. |
| `app/admin/layout.tsx` | Admin shell. |
| `app/dashboard/contributor/layout.tsx` | Contributor shell. |

## Route Constants And Redirects

| Constant/source | Behavior |
| --- | --- |
| `lib/constants/routes.ts` | Central auth/dashboard/admin/public route constants. |
| `LEGACY_HOST_DASHBOARD_PATHS` | `/dashboard/contributor` and `/admin/contributor` are treated as legacy paths and redirected by `proxy.ts` to `/dashboard/host`. |
| `adminRoutes.contentApproval` | Defines `/admin/content-approval`; no matching `app/admin/content-approval/page.tsx` was observed. Needs verification before linking to it. |

## Public Pages

| Route | File | Notes |
| --- | --- | --- |
| `/` | `app/page.tsx` | Landing/home. |
| `/about` | `app/about/page.tsx` | Static/content page. |
| `/community` | `app/community/page.tsx` | Community page. |
| `/news` | `app/news/page.tsx` | News page. |
| `/players` | `app/players/page.tsx` | Player directory entry. |
| `/sports/[sportSlug]` | `app/sports/[sportSlug]/page.tsx` | Sport hub. |
| `/sports/[sportSlug]/rules` | `app/sports/[sportSlug]/rules/page.tsx` | Sport rules. |
| `/sports/[sportSlug]/players` | `app/sports/[sportSlug]/players/page.tsx` | Sport player listing. |
| `/sports/[sportSlug]/players/[slug]` | `app/sports/[sportSlug]/players/[slug]/page.tsx` | Player wiki detail. |
| `/sports/[sportSlug]/teams` | `app/sports/[sportSlug]/teams/page.tsx` | Team listing. |
| `/sports/[sportSlug]/teams/[slug]` | `app/sports/[sportSlug]/teams/[slug]/page.tsx` | Team detail. |
| `/sports/[sportSlug]/gear` | `app/sports/[sportSlug]/gear/page.tsx` | Gear catalog. |
| `/sports/[sportSlug]/gear/[slug]` | `app/sports/[sportSlug]/gear/[slug]/page.tsx` | Gear detail. |
| `/sports/[sportSlug]/tournaments` | `app/sports/[sportSlug]/tournaments/page.tsx` | Public tournaments. |
| `/sports/[sportSlug]/tournaments/[slug]` | `app/sports/[sportSlug]/tournaments/[slug]/page.tsx` | Tournament detail/router. |

## Auth Pages

| Route | File |
| --- | --- |
| `/login` | `app/login/page.tsx` |
| `/register` | `app/register/page.tsx` |
| `/forgot-password` | `app/forgot-password/page.tsx` |
| `/auth/forgot-password/sent` | `app/auth/forgot-password/sent/page.tsx` |
| `/auth/check-email` | `app/auth/check-email/page.tsx` |
| `/auth/verify-email` | `app/auth/verify-email/page.tsx` |
| `/auth/reset-password` | `app/auth/reset-password/page.tsx` |
| `/auth/change-password` | `app/auth/change-password/page.tsx` |

## Tournament Registration Pages

| Route | File |
| --- | --- |
| `/sports/[sportSlug]/tournaments/[slug]/register` | `app/sports/[sportSlug]/tournaments/[slug]/register/page.tsx` |
| `/sports/[sportSlug]/tournaments/[slug]/register/checkout` | `app/sports/[sportSlug]/tournaments/[slug]/register/checkout/page.tsx` |
| `/sports/[sportSlug]/tournaments/[slug]/register/confirm` | `app/sports/[sportSlug]/tournaments/[slug]/register/confirm/page.tsx` |
| `/sports/[sportSlug]/tournaments/[slug]/register/success` | `app/sports/[sportSlug]/tournaments/[slug]/register/success/page.tsx` |

## Dashboard Pages

| Route | File | Primary audience |
| --- | --- | --- |
| `/dashboard` | `app/dashboard/page.tsx` | Player/general |
| `/dashboard/complete-profile` | `app/dashboard/complete-profile/page.tsx` | Profile completion |
| `/dashboard/settings` | `app/dashboard/settings/page.tsx` | Account/player settings |
| `/dashboard/payments` | `app/dashboard/payments/page.tsx` | Player payments |
| `/dashboard/payments/receipt/[paymentId]` | `app/dashboard/payments/receipt/[paymentId]/page.tsx` | Payment receipt |
| `/dashboard/matches` | `app/dashboard/matches/page.tsx` | Player matches |
| `/dashboard/tournaments` | `app/dashboard/tournaments/page.tsx` | Player/host tournaments |
| `/dashboard/tournaments/new` | `app/dashboard/tournaments/new/page.tsx` | Tournament creation |
| `/dashboard/tournaments/[id]` | `app/dashboard/tournaments/[id]/page.tsx` | Tournament workspace |
| `/dashboard/tournaments/[id]/edit` | `app/dashboard/tournaments/[id]/edit/page.tsx` | Tournament edit |
| `/dashboard/host` | `app/dashboard/host/page.tsx` | Host home |
| `/dashboard/host/tournaments` | `app/dashboard/host/tournaments/page.tsx` | Host tournament hub |
| `/dashboard/host/tournaments/new` | `app/dashboard/host/tournaments/new/page.tsx` | Host tournament create |
| `/dashboard/host/tournaments/new/reclub` | `app/dashboard/host/tournaments/new/reclub/page.tsx` | Reclub creation |
| `/dashboard/host/tournaments/[id]` | `app/dashboard/host/tournaments/[id]/page.tsx` | Host workspace |
| `/dashboard/host/tournaments/[id]/edit` | `app/dashboard/host/tournaments/[id]/edit/page.tsx` | Host edit |
| `/dashboard/host/payments` | `app/dashboard/host/payments/page.tsx` | Host payments/payouts |
| `/dashboard/contributor` | `app/dashboard/contributor/page.tsx` | Contributor area |

Note: `/dashboard/contributor` has physical files but is also listed as a legacy redirect to `/dashboard/host` in `lib/constants/routes.ts` and `proxy.ts`.

## Admin Pages

| Route | File |
| --- | --- |
| `/admin` | `app/admin/page.tsx` |
| `/admin/users` | `app/admin/users/page.tsx` |
| `/admin/sports` | `app/admin/sports/page.tsx` |
| `/admin/contributor` | `app/admin/contributor/page.tsx` |
| `/admin/settings/payments` | `app/admin/settings/payments/page.tsx` |
| `/admin/wiki-entities` | `app/admin/wiki-entities/page.tsx` |
| `/admin/wiki-entities/new` | `app/admin/wiki-entities/new/page.tsx` |
| `/admin/wiki-entities/[id]/edit` | `app/admin/wiki-entities/[id]/edit/page.tsx` |
| `/admin/wiki-entities/tournaments/[id]/edit` | `app/admin/wiki-entities/tournaments/[id]/edit/page.tsx` |

Note: `/admin/contributor` has a physical page but is treated as a legacy redirect to `/dashboard/host` by `proxy.ts`.

## Pages With Direct Database Access

Most DB access is service-layered through `lib/`, but these pages directly call `getDb()`:

| Page | Notes |
| --- | --- |
| `app/dashboard/host/page.tsx` | Reads user data for host dashboard. |
| `app/dashboard/complete-profile/page.tsx` | Reads user profile data for completion flow. |
| `app/auth/change-password/page.tsx` | Reads user state for forced password-change flow. |

## Route Handlers

Route handlers are documented in `50_API_MAP.md`.

## Server Actions

No explicit `"use server"` server action files were found during this mapping pass. Mutations appear to be handled mainly through `app/api/**/route.ts` route handlers and service functions in `lib/`.

## Needs Verification

- Whether all loading pages are custom skeletons or placeholders.
- Exact role requirements for each dashboard/admin route beyond proxy path group behavior.
- Re-run server action search if new mutations are added outside route handlers.
