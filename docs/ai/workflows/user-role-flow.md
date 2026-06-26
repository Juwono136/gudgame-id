# User Role Flow

Last updated: 2026-06-26

## Purpose

This workflow documents the end-to-end access flow for the three stored application roles: `super_admin`, `host`, and `player`. It covers entry points, dashboard feature access, session handling, API/server interaction, database reads, navigation behavior, error handling, affected files, risks, and recommended tests.

Source of truth: code remains authoritative if this document drifts.

## Roles And Dashboard Access

| Role | Main entry point | Allowed dashboard areas | Dashboard feature access |
| --- | --- | --- | --- |
| `player` | `/dashboard` | Player dashboard, account settings, community tournament pages under `/dashboard/tournaments*` | Overview, tournaments created/joined, match log, player payments, settings, complete profile, public player page completion prompts, free Reclub creation from player flow. |
| `host` | `/dashboard/host` | Host dashboard, account settings, community tournament pages under `/dashboard/tournaments*` | Host overview, hosted tournaments list, official tournament creation, Reclub creation, tournament workspace/edit, host payments and payout setup, settings. |
| `super_admin` | `/admin` | Admin console, host dashboard, account settings, community tournament pages under `/dashboard/tournaments*` | Admin overview, user management, wiki entities, sports, payment settings, disabled future admin items, plus host workspace access for official tournament management and payout settings. |

Notes:

- `super_admin` can access the host dashboard through `canAccessHostDashboard` even without a stored `host` role.
- `super_admin` does not automatically pass `canAccessPlayerDashboard`; access to `/dashboard`, `/dashboard/matches`, and `/dashboard/payments` still requires `player`.
- `/dashboard/settings`, `/dashboard/complete-profile`, and `/dashboard/tournaments*` are treated as account-setting/community zones and allow any authenticated user with at least one role.
- `/dashboard/contributor*` and `/admin/contributor*` are legacy paths redirected to `/dashboard/host*`.
- Official tournament scoring staff are tournament-scoped delegates stored in tournament settings, not global app roles. They can manage official public bracket placement/scoring for that tournament only.

## Entry Point

| Flow | Entry point | Entry files |
| --- | --- | --- |
| Login/register into role-aware app | `/login`, `/register`, auth callbacks/reset pages | `app/login/page.tsx`, `app/register/page.tsx`, `components/auth/*`, `hooks/use-auth-mutations.ts` |
| Player dashboard | `/dashboard` | `app/dashboard/layout.tsx`, `app/dashboard/page.tsx`, `components/dashboard/player/player-dashboard.tsx` |
| Host dashboard | `/dashboard/host` | `app/dashboard/layout.tsx`, `app/dashboard/host/layout.tsx`, `app/dashboard/host/page.tsx`, `components/dashboard/host-dashboard.tsx` |
| Admin console | `/admin` | `app/admin/layout.tsx`, `app/admin/page.tsx`, `components/admin/dashboard/admin-overview.tsx` |
| Session context/API role data | `/api/account/session-context` | `app/api/account/session-context/route.ts` |

## User Action

1. Guest opens a public page, `/login`, or `/register`.
2. User signs in with email/password or Google, or registers a new account.
3. Client redirects to a safe callback URL if present; otherwise current default post-login landing is `/`.
4. User opens dashboard links from navigation/profile menu or direct URL.
5. `proxy.ts` and page layouts validate session, active account, forced password-change state, and role access.
6. User lands in the role-appropriate dashboard:
   - `player`: `/dashboard`
   - `host`: `/dashboard/host`
   - `super_admin`: `/admin`
7. User performs dashboard actions through page components and React Query hooks or server-rendered data loaders.

## UI Component Sequence

### Shared Auth And Session

```text
app/layout.tsx
  -> providers/app-providers.tsx
  -> QueryProvider + ConfirmDialogProvider + DashboardLayoutClient
  -> auth page or protected page
  -> components/auth/* or dashboard/admin component tree
```

### Player Dashboard

```text
app/dashboard/layout.tsx
  -> requireSession()
app/dashboard/page.tsx
  -> requirePlayerDashboardAccess()
  -> getPlayerDashboardData(userId)
  -> PageShell
  -> PlayerDashboard
  -> DashboardWorkspaceShell
  -> DashboardNav / DashboardMobileBottomNav with variant="player"
  -> DashboardWelcomeCard, DashboardQuickLinks, ProfileCompletionBanner,
     PlayerPageCompletionPrompt, player stats/history/sidebar components
```

Player navigation items:

| Item | Route |
| --- | --- |
| Overview | `/dashboard` |
| Tournaments | `/dashboard/tournaments` |
| Match log | `/dashboard/matches` |
| Payments | `/dashboard/payments` |
| Settings | `/dashboard/settings` |
| Switch to host | `/dashboard/host`, only when roles include `host` or `super_admin` |

### Host Dashboard

```text
app/dashboard/layout.tsx
  -> requireSession()
app/dashboard/host/layout.tsx
  -> requireHostDashboardAccess()
app/dashboard/host/page.tsx
  -> requireHostDashboardAccess()
  -> getServerSession()
  -> direct user profile DB lookup
  -> PageShell
  -> HostDashboard
  -> DashboardWorkspaceShell
  -> DashboardNav / DashboardMobileBottomNav with variant="host"
  -> DashboardWelcomeCard, DashboardQuickLinks, ProfileCompletionSection,
     hosted tournaments list from useHostTournamentsList()
```

Host navigation items:

| Item | Route |
| --- | --- |
| Overview | `/dashboard/host` |
| Tournaments | `/dashboard/host/tournaments` |
| Payments & payout | `/dashboard/host/payments` |
| Settings | `/dashboard/settings` |
| Switch to player | `/dashboard` |

### Super Admin Console

```text
app/admin/layout.tsx
  -> requireAdminSession()
app/admin/page.tsx
  -> getAdminSessionContext()
  -> AdminOverview
  -> AdminShell
  -> AdminSidebar / AdminNavbar / AdminSportSelector
  -> useAdminDashboardStats(range)
  -> stats, charts, recent activity, admin quick links
```

Admin navigation items:

| Item | Route | Permission/behavior |
| --- | --- | --- |
| Dashboard | `/admin` | Available to `super_admin`. |
| Content Approval | `/admin/content-approval` | Requires `admin.content.moderate`, currently disabled/Soon and route needs verification before linking. |
| User Management | `/admin/users` | Requires `admin.users.manage`. |
| Wiki Entities | `/admin/wiki-entities` | Requires `admin.wiki.manage`. |
| Sports | `/admin/sports` | Requires `admin.sports.manage`. |
| Payment settings | `/admin/settings/payments` | Requires `admin.users.manage`. |
| System Settings | `/admin/settings` | Disabled/Soon. |
| Create New Entity | `/admin/wiki-entities/new` | Sidebar action; super admin has `admin.wiki.manage`. |

## Validation

| Validation layer | Source | Behavior |
| --- | --- | --- |
| Session cookie pre-check | `proxy.ts` + Better Auth cookie | Unauthenticated protected page requests redirect to `/login?callbackUrl=...`. |
| Session context | `/api/account/session-context` | Returns authenticated state, inactive/stale session flags, roles, permissions, dashboard links, profile status, password-change state, provider flags. |
| Role/path access | `lib/roles/route-access.ts` | Maps paths to `player`, `host`, `admin`, or `account_settings` zones and checks roles. |
| Page role guards | `lib/auth/role-guard.ts`, `lib/admin/session.ts` | Server-side guards re-check role access before protected pages render. |
| API role guards | `requireApiRoleGuardContext`, `requireApiHostDashboardAccess`, admin session helpers | API routes return JSON errors instead of HTML redirects. |
| Admin permissions | `lib/roles/permissions.ts`, `lib/admin/navigation.ts` | Filters admin UI and protects admin actions by permission. |
| Callback URL safety | `resolveSafeCallbackUrl` | Normalizes local paths and rejects role-disallowed dashboard callbacks. |

## API / Server Action Call

No explicit `"use server"` server actions were observed for this flow. Role/session behavior uses route handlers, server components, and server-only helper functions.

| Call | Used by | Purpose |
| --- | --- | --- |
| `GET /api/account/session-context` | `proxy.ts`, `hooks/use-session-context.ts`, client UI | Central role/session/profile/provider state. |
| `GET/POST /api/auth/[...all]` | Better Auth client and auth forms | Login, sign-out, email verification, provider auth, session cookie management. |
| `POST /api/account/register` | Registration flow | Creates account, stores profile photo/app fields, assigns default `player` role. |
| Admin APIs under `/api/admin/*` | Admin hooks/pages | Dashboard stats, users, sports, wiki entities, payment settings. |
| Host APIs under `/api/host/*` | Host hooks/pages | Host tournaments, workspace, payments, payout profile and disbursements. |
| Account/player APIs under `/api/account/*` | Player/settings pages | Settings, payments, registrations, matches, competition history. |
| Tournament APIs under `/api/tournaments/*` | Player/host tournament flows | Create/manage/register/lobby/bracket/match flows. |

## Auth / Session Handling

1. Better Auth stores and validates the session through `lib/auth/server.ts`.
2. `proxy.ts` uses `getSessionCookie(request)` as a fast protected-page check.
3. If a session cookie exists, `proxy.ts` fetches `/api/account/session-context` with forwarded cookies and `cache: "no-store"`.
4. Inactive accounts redirect to `/login?error=account_inactive`; stale/unauthenticated contexts are treated as not signed in.
5. Users with `mustChangePassword` are forced to `/auth/change-password`.
6. Role-protected paths call `isPathAllowedForRoles`; denied users redirect to their default dashboard:
   - `super_admin` -> `/admin`
   - `host` -> `/dashboard/host`
   - `player` -> `/dashboard`
   - no role -> `/login?error=no_role`
7. Page layouts still call `requireSession`, `requireHostDashboardAccess`, or `requireAdminSession` so proxy bypasses do not grant access.

## Database Interaction

| Data | Tables/schemas | Access path |
| --- | --- | --- |
| Auth account/session | `user`, `session`, `account`, `verification` in `db/schema/auth.ts` | Better Auth adapter, `getServerSession`, account status helpers. |
| Role assignments | `userRoleAssignments` in `db/schema/roles.ts` | `getUserRoleAssignments`, registration default role sync, admin user management. |
| Session context profile status | `user` fields such as full name, phone, image/storage key | `/api/account/session-context`, profile completion helper. |
| Player dashboard data | auth user, wiki/player profile, competition history, tournament data | `getPlayerDashboardData(userId)` and related account/player services. |
| Host dashboard profile | `user` | Direct lookup in `app/dashboard/host/page.tsx` for display name/image fields. |
| Host tournaments/payouts | `tournaments`, registration/payment tables, host bank/payout tables | Host APIs and hooks such as `useHostTournamentsList`, host payout hooks. |
| Admin console context | `user`, `sports` | `getAdminSessionContext`, `resolveSportContext`; ensures active sport fallback. |
| Admin stats/content | `user`, wiki tables, sports, payment settings | Admin APIs and services. |

## Response Handling

| Layer | Success | Failure |
| --- | --- | --- |
| Proxy | Allows request to continue with security headers, or redirects to safe destination. | Redirects to login, change-password page, or default dashboard. |
| Session context API | Returns common JSON success envelope with role and permission data. | Returns common JSON error via `jsonError`; proxy treats bad response as no context. |
| Protected pages | Render dashboard/admin UI after server guard passes. | Server redirects via `redirect(...)`. |
| API route handlers | Return JSON via `jsonSuccess`/`jsonError` where implemented. | Role guards throw `AppError` with `401` or `403`; validation usually returns `400`/`422`. |
| React Query hooks | Populate dashboard widgets, tables, stats, and loading states. | Components show loading/error/empty states and may expose retry actions. |

## Redirect / Navigation

| Scenario | Result |
| --- | --- |
| Guest opens protected dashboard/admin path | Redirect to `/login?callbackUrl=<path>`. |
| Authenticated user opens auth page | Redirect to safe callback URL or `/`. |
| User must change password | Redirect to `/auth/change-password`. |
| Inactive account | Redirect to `/login?error=account_inactive`; server role guard signs out current session. |
| Role denied for dashboard/admin path | Redirect to `getDefaultDashboardUrl(roles)`. |
| Legacy contributor path | Redirect to corresponding `/dashboard/host` path. |
| No callback after sign-in | Current default landing is `/`, not a dashboard. |

## Error Handling

| Case | Handling |
| --- | --- |
| Missing session | Proxy/page guard redirects to login; API guard returns `401`. |
| Stale session user | Session context returns `staleSession`; protected flow treats it as unauthenticated. |
| Inactive user | Session context marks inactive; proxy redirects; role guard signs out and redirects. |
| Missing role | Default dashboard resolver sends user to `/login?error=no_role`. |
| Insufficient role | Proxy/page guard redirects to highest allowed dashboard; API guard returns `403`. |
| Must change password | Proxy blocks all pages except forced password-change route. |
| Unsafe callback URL | `resolveSafeCallbackUrl` strips absolute origins and falls back to `/` if disallowed. |
| Admin sport missing | Admin session attempts to ensure default sports; if none remain, uses fallback slug `padel` with empty sport ID. Wiki management guards reject empty sport ID. |
| Client data load failure | Dashboard/admin components render error/empty/loading states; admin overview includes retry for stats. |

## Files Involved

| File | Role in workflow |
| --- | --- |
| `proxy.ts` | First-line protected page, role, inactive, forced password-change, and legacy redirect handling. |
| `lib/constants/routes.ts` | Auth/dashboard/admin route constants and protected path helpers. |
| `lib/roles/constants.ts` | Role definitions, labels, legacy role normalization, default registration role. |
| `lib/roles/route-access.ts` | Role-to-path access rules and dashboard fallback routing. |
| `lib/roles/permissions.ts` | Permission mapping for admin features. |
| `lib/roles/dashboard-links.ts` | Role dashboard links returned by session context and user menu. |
| `lib/roles/sync.ts` | User role assignment loading/sync. |
| `lib/auth/session.ts` | Server session helpers. |
| `lib/auth/role-guard.ts` | Player/host/account/API role guards. |
| `lib/admin/session.ts` | Admin session context and permission guard helpers. |
| `app/api/account/session-context/route.ts` | Role/session/profile/provider payload for proxy and client. |
| `app/api/auth/[...all]/route.ts` | Better Auth route wrapper. |
| `app/api/account/register/route.ts` | Default `player` role assignment for new registrations. |
| `app/dashboard/layout.tsx` | Requires a signed-in session for dashboard routes. |
| `app/dashboard/page.tsx` | Player dashboard page and data loading. |
| `app/dashboard/host/layout.tsx` | Requires host/super-admin access for host routes. |
| `app/dashboard/host/page.tsx` | Host dashboard page and profile lookup. |
| `app/admin/layout.tsx` | Requires super-admin session. |
| `app/admin/page.tsx` | Admin overview entry. |
| `components/dashboard/dashboard-nav.tsx` | Role-sensitive player/host navigation. |
| `components/dashboard/player/player-dashboard.tsx` | Player dashboard UI and quick links. |
| `components/dashboard/host-dashboard.tsx` | Host dashboard UI, quick links, hosted tournament list. |
| `components/admin/layout/admin-sidebar.tsx` | Admin sidebar filtered by permissions. |
| `components/admin/dashboard/admin-overview.tsx` | Admin dashboard content and permission-aware widgets. |
| `hooks/use-session-context.ts` | Client session-context query. |
| `hooks/use-auth-mutations.ts` | Login/register/logout mutations and redirects. |
| `hooks/use-admin-dashboard.ts` | Admin dashboard stats query. |
| `hooks/use-host-tournaments.ts` | Host tournament list and management hooks. |
| `db/schema/auth.ts` | User/session/account/verification schema. |
| `db/schema/roles.ts` | Role assignment schema. |

## Risk If Modified

| Area | Risk |
| --- | --- |
| `proxy.ts` | Can accidentally expose protected dashboards, break forced password changes, create redirect loops, or lose security headers. |
| `lib/roles/route-access.ts` | Can grant/deny wrong role access, break callback URL safety, or route users to the wrong dashboard. |
| `app/api/account/session-context/route.ts` | Breaks both proxy and client navigation if payload fields or semantics change. |
| `lib/auth/role-guard.ts` / `lib/admin/session.ts` | Can turn page guards into inconsistent redirects or API guards into HTML responses. |
| Role constants/legacy maps | Can orphan legacy `contributor`, `editor`, `admin`, or `moderator` users from their intended canonical roles. |
| Admin permissions/navigation | Can show UI without backend permission or hide valid admin capabilities. |
| Dashboard navigation | Can expose links the proxy later denies, creating confusing UX. |
| Registration role sync | Can create users without a usable dashboard role. |
| Database role schema | Can invalidate access checks, default role creation, or admin user management. |

## Recommended Tests

| Area | Tests |
| --- | --- |
| Proxy route access | Guest protected-page redirect; player denied admin/host-only pages; host denied player-only pages; super admin allowed `/admin` and `/dashboard/host`; legacy contributor redirects. |
| Session context | Authenticated/unauthenticated/stale/inactive responses; roles, permissions, dashboard links, profile completion, and `mustChangePassword` fields. |
| Callback safety | Allowed local player/host/admin callbacks by role; disallowed dashboard callbacks fall back to `/`; absolute URL input cannot open external redirect. |
| Page guards | `requirePlayerDashboardAccess`, `requireHostDashboardAccess`, and `requireAdminSession` redirect/allow matrix for all role combinations. |
| API guards | Unauthenticated returns `401`; insufficient role returns `403`; inactive account returns `403`; no HTML redirects from API routes. |
| Dashboard nav | Player nav items; host nav items; switch links shown only for `host`/`super_admin`; mobile bottom nav item count and active state. |
| Admin nav | Permission-filtered sidebar items; disabled Soon items remain non-clickable; Create New Entity only usable when backend wiki permission passes. |
| Registration default role | New email/password user receives `player` assignment and can access `/dashboard` after verification/sign-in. |
| Forced password change | User with `mustChangePassword` cannot open dashboard/admin routes until password is changed. |
| Inactive account | Existing session is blocked and redirected/sign-out behavior remains consistent between proxy and page guard. |

## Needs Verification

- Whether role descriptions for `host` should still mention wiki editing; current dashboard behavior is tournament hosting and payout management.
- Exact UI consumers of `dashboardLinks` from session context outside the files listed here.
- Exact API coverage for every player/host/admin subpage should be rechecked before changing an individual dashboard feature.
