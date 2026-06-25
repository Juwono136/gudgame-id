# Feature Index

Last updated: 2026-06-25

| Feature | User-facing routes | API/services | Key components | Recommended tests |
| --- | --- | --- | --- | --- |
| Public sport hubs | `/sports/[sportSlug]`, rules, players, teams, gear, tournaments | `lib/wiki/public*`, `lib/tournaments/service.ts`, `app/api/public/sports/*` | `components/sports/*`, `components/wiki/*` | Server component render tests for empty/populated sport; API tests for pagination/filtering. |
| Wiki entities | Public entity pages, `/admin/wiki-entities*` | `lib/wiki/*`, `lib/wiki/gear/*`, `lib/wiki/scrapers/*`, `app/api/admin/wiki-entities*` | `components/admin/wiki/*`, `components/wiki/*` | CRUD API tests, validation tests, media upload tests, scraper security tests. |
| Tournaments | Public tournament detail, dashboard/host/admin tournament pages | `lib/tournaments/*`, `app/api/tournaments*`, `app/api/host/tournaments*`, `app/api/admin/tournaments*` | `components/tournaments/*`, `components/dashboard/host/*`, `components/admin/tournaments/*` | Create/edit status tests, registration flow tests, bracket/reclub service tests. |
| Reclub sessions | Tournament detail/workspace, host reclub create | `lib/tournaments/reclub/*`, reclub route handlers | `components/tournaments/reclub*`, `components/tournaments/reclub/*`, `components/dashboard/host/workspace/*` | Match lifecycle tests, team switching tests, live score tests, stats sync tests. |
| Official registrations | Public registration pages, host workspace | `lib/tournaments/registration/*`, payment services | `components/tournaments/official-*`, registration clients | End-to-end registration, payment pending/paid/expired, confirm/decline paths. |
| Payments | Player payment pages, host payments, admin payment settings | `lib/tournaments/payments/*`, `lib/payments/*`, `app/api/payments*`, webhook | `components/payments/*`, `components/dashboard/host/host-payments-page.tsx` | Webhook idempotency, invoice creation, payment status polling, fee settings. |
| Host payouts | `/dashboard/host/payments` | `lib/payments/host-payout/*`, `app/api/host/payout*`, cron | `components/dashboard/host/host-payout-*` | Bank validation, primary bank changes, scheduled disbursement job, webhook status updates. |
| Auth/session | Auth pages, proxy-protected pages | `lib/auth/*`, `lib/roles/*`, `app/api/auth/[...all]`, account APIs | `components/auth/*`, layout/user menu | Login/register/reset/change-password, inactive user, role redirect, proxy session-context. |
| Dashboard shell | `/dashboard*` | account/player APIs, session context | `components/dashboard/*`, `providers/app-providers.tsx` | Navigation visibility by role, mobile nav, profile completion state. |
| Admin | `/admin*` | `lib/admin/*`, admin APIs | `components/admin/*` | Role guard tests, user management CRUD, sports reorder, dashboard stats. |
| Notifications | Dashboard/global bell | `lib/notifications/*`, `app/api/notifications*` | `components/notifications/notification-bell.tsx` | List/unread/mark-read API tests, notification creation side effects. |
| Account settings/profile | `/dashboard/settings`, complete profile | `lib/account/*`, `app/api/account/settings*` | `components/settings/*`, `components/dashboard/complete-profile-form.tsx` | Profile validation, player equipment, password change, photo upload. |
| Login security | Auth API and login page | `app/api/auth/[...all]/route.ts`, `lib/security/auth-lockout.ts`, `lib/api/guard-request.ts` | `components/auth/login-form.tsx` | Origin guard, lockout, failed-attempt recording, reset after success. |
| Admin sports and sport context | `/admin/sports`, admin sport selector | `lib/sports/*`, `app/api/admin/sports*`, `app/api/admin/sport-context` | `components/admin/sports/*`, `components/admin/layout/admin-sport-selector.tsx` | Sport CRUD, display order reorder, selected sport context. |
| Admin wiki scrape hosts | `/admin/wiki-entities*` | `lib/wiki/scrape-hosts/service.ts`, `app/api/admin/wiki-scrape-hosts*` | `components/admin/wiki/scrape-hosts-manager.tsx` | Host allowlist CRUD, sport-scoped host filtering, scraper URL blocking. |
| Player competition history | `/dashboard/matches`, `/dashboard/tournaments` | `lib/account/player-competition/*`, player match/tournament APIs | `components/dashboard/player/competition/*` | Pagination, match detail, tournament result formatting. |
| Maps/venue | Tournament forms/details | `lib/maps/*`, `app/api/maps/*` | venue form components, `venue-maps-preview` | API parameter validation, Google failure fallback, embed URL safety. |
| Media/storage | Profile photos, tournament covers, wiki media, `/api/media/[...path]` | `lib/storage/*`, `lib/media/client.ts`, upload helpers | upload fields/previews | Upload/delete lifecycle, media proxy authorization, object replacement cleanup. |
| Health/cron | `/api/health`, `/api/cron/host-payouts` | `lib/health`, `lib/cron`, payout job | none | Secret validation, DB/Redis/storage ping behavior, cron idempotency. |

## Needs Verification

- Complete feature ownership for contributor dashboard.
- Whether public news/community pages are placeholders or connected to future data.
- Whether every payment route is active in production.
