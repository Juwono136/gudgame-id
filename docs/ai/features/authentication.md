# Authentication

Last updated: 2026-06-26

## Feature Purpose

Authentication lets users create accounts, verify email, sign in with email/password or Google, recover/reset passwords, complete required password changes, and enter role-appropriate areas of the app. It also provides the session and role context used by protected dashboard/admin pages and role-sensitive navigation.

## User Flow

1. Guest opens `/login`, `/register`, `/forgot-password`, or reset/verification pages.
2. Already-authenticated active users are redirected away from guest auth pages by server page helpers or `proxy.ts`.
3. New email/password users register at `/register`, including profile photo, KTP full name, email, phone, password, and optional nickname.
4. Registration uploads the profile photo, creates a Better Auth user, updates app-specific user fields, assigns the default `player` role, then sends the user to `/auth/check-email`.
5. Email verification lands on `/auth/verify-email`; Better Auth can auto sign in after successful verification.
6. Returning users sign in at `/login`; the client checks login eligibility first, then uses Better Auth email sign-in.
7. Google sign-in uses Firebase popup auth on the client and posts the ID token to `/api/auth/firebase/google`.
8. After sign-in, the client and proxy read `/api/account/session-context` to enforce inactive-account, required-password-change, role, callback URL, and profile-completion behavior.
9. Users with `mustChangePassword` are forced to `/auth/change-password` until they set a new password.
10. Users can request password reset from `/forgot-password` and complete it on `/auth/reset-password`.
11. Sign-out uses Better Auth client sign-out and returns the user to `/login`.

## Technical Flow

```text
Auth page
  -> server redirect helper (`redirectIfAuthenticated`, `requireSession`)
  -> client form in `components/auth`
  -> hook in `hooks/use-auth-mutations.ts`
  -> account API route or Better Auth client
  -> `app/api/auth/[...all]/route.ts` or `app/api/account/*`
  -> `lib/auth/server.ts` Better Auth config
  -> Drizzle auth/role tables, Redis secondary storage, email, Firebase, storage
  -> `/api/account/session-context`
  -> role-aware redirect/navigation
```

`proxy.ts` performs coarse page protection before rendering. It checks for a Better Auth session cookie, fetches `/api/account/session-context` with forwarded cookies, redirects unauthenticated users to `/login?callbackUrl=...`, blocks inactive users, forces password changes, redirects legacy host paths, and enforces role path access.

## Routes/Pages Involved

| Route | File | Notes |
| --- | --- | --- |
| `/login` | `app/login/page.tsx` | Email/password and Google sign-in; signs out stale/inactive sessions before rendering. |
| `/register` | `app/register/page.tsx` | Multipart registration with required profile photo. |
| `/forgot-password` | `app/forgot-password/page.tsx` | Password reset request. |
| `/auth/forgot-password/sent` | `app/auth/forgot-password/sent/page.tsx` | Post-request confirmation. |
| `/auth/check-email` | `app/auth/check-email/page.tsx` | Post-registration email check state. |
| `/auth/verify-email` | `app/auth/verify-email/page.tsx` | Verification landing/status page. |
| `/auth/reset-password` | `app/auth/reset-password/page.tsx` | Token-based password reset form. |
| `/auth/change-password` | `app/auth/change-password/page.tsx` | Forced password change for admin-created/temporary-password users. |
| `/dashboard*` | `app/dashboard/**` | Protected by session and role rules. |
| `/admin*` | `app/admin/**` | Protected by `super_admin` role rules. |

## Layouts Involved

| File | Role |
| --- | --- |
| `app/layout.tsx` | Root server layout; wraps all pages with `AppProviders`; forced dynamic per architecture docs. |
| `app/template.tsx` | App template used globally. Needs verification for auth-specific behavior. |
| `app/loading.tsx` | Global loading UI. |
| `app/login/loading.tsx` | Login loading state. |
| `app/register/loading.tsx` | Register loading state. |
| `app/dashboard/layout.tsx` | Dashboard shell for protected dashboard routes. |
| `app/admin/layout.tsx` | Admin shell for protected admin routes. |
| `components/layout/page-shell.tsx` | Auth pages render without navbar/footer/grid background through this shell. |

## Components Involved

| Component/file | Responsibility |
| --- | --- |
| `components/auth/login-form.tsx` | Login form and submission UI. |
| `components/auth/register-form.tsx` | Registration form and multipart payload assembly. |
| `components/auth/forgot-password-form.tsx` | Reset request form. |
| `components/auth/reset-password-form.tsx` | New password form for reset token flow. |
| `components/auth/change-password-required-form.tsx` | Forced password change form. |
| `components/auth/google-sign-in-button.tsx` | Google sign-in trigger. |
| `components/auth/photo-upload-field.tsx` | Required registration profile photo field. |
| `components/auth/password-input.tsx` | Password field wrapper. |
| `components/auth/auth-shell.tsx`, `components/auth/auth-simple-shell.tsx` | Auth page presentation wrappers. |
| `components/auth/auth-field.tsx`, `auth-form-controls.tsx`, `auth-phone-field-group.tsx`, `auth-divider.tsx` | Shared auth form primitives. |
| `components/layout/user-menu.tsx` | Session-aware user actions. Needs verification for exact auth hook usage. |
| `components/dashboard/dashboard-nav.tsx` | Role-sensitive dashboard navigation. |

## Hooks Involved

| Hook | Responsibility |
| --- | --- |
| `hooks/use-auth-mutations.ts` | Login, Google sign-in, registration, resend verification, password reset request, password reset, logout mutations. |
| `hooks/use-session-context.ts` | React Query wrapper for `/api/account/session-context`; used for client session/role/profile state. |
| `hooks/use-logout-with-confirm.ts` | Confirmed logout UX. |
| `lib/session/invalidate-session-context.ts` | Invalidates the `["session", "context"]` query after auth changes. |

## Providers/Stores Involved

| File | Responsibility |
| --- | --- |
| `providers/app-providers.tsx` | Composes global client providers. |
| `providers/query-provider.tsx` | Required by auth/session React Query hooks. |
| `providers/confirm-dialog-provider.tsx` | Used by confirmed logout behavior. |
| `stores/auth-ui-store.ts` | Zustand UI state for shared auth form `isSubmitting`. |
| `lib/auth/client.ts` | Better Auth React client exports (`authClient`, `signIn`, `signUp`, `signOut`, `useSession`). |

## API Routes Or Server Actions Involved

No explicit `"use server"` server actions were observed. Auth mutations use route handlers and Better Auth APIs.

| Route | File | Responsibility |
| --- | --- | --- |
| `/api/auth/[...all]` | `app/api/auth/[...all]/route.ts` | Better Auth GET/POST wrapper with origin/rate guards, email lockout tracking, and security headers. Also hosts plugin endpoints such as `/api/auth/firebase/google`. |
| `/api/account/register` | `app/api/account/register/route.ts` | Validates registration, uploads profile photo, calls Better Auth sign-up, stores app fields, assigns default role. |
| `/api/account/login-eligibility` | `app/api/account/login-eligibility/route.ts` | Pre-login inactive and Google-only account check. |
| `/api/account/forgot-password` | `app/api/account/forgot-password/route.ts` | Validates email, blocks Google-only reset, calls Better Auth reset request. |
| `/api/account/change-password-required` | `app/api/account/change-password-required/route.ts` | Validates current/new password and clears `mustChangePassword`. |
| `/api/account/session-context` | `app/api/account/session-context/route.ts` | Central authenticated state, roles, permissions, dashboard links, profile completion, provider state, inactive/stale-session flags. |
| `/api/account/check-nickname` | `app/api/account/check-nickname/route.ts` | Nickname availability. Needs verification for response details. |
| `/api/account/settings/change-password` | `app/api/account/settings/change-password/route.ts` | Account settings password change. |
| `/api/account/settings/profile` | `app/api/account/settings/profile/route.ts` | Profile settings tied to auth user fields. |

## Database/Models Involved

| Table/model | File | Notes |
| --- | --- | --- |
| `user` | `db/schema/auth.ts` | Better Auth user plus app fields: `role`, `isActive`, `lastLoginAt`, phone, nickname, KTP full name, profile image storage key, `mustChangePassword`, `invitedByAdmin`. |
| `session` | `db/schema/auth.ts` | Better Auth sessions with token, expiry, IP, user agent, user FK. |
| `account` | `db/schema/auth.ts` | Credential/OAuth provider accounts, tokens, password hash. |
| `verification` | `db/schema/auth.ts` | Verification and reset tokens. |
| `userRoleAssignments` | `db/schema/roles.ts` | Source of truth for authorization roles; unique user/role pairs. |

Better Auth is configured in `lib/auth/server.ts` with the Drizzle adapter, Redis secondary storage, email/password, email verification, password reset, Firebase Google plugin, account linking, and session hooks that block inactive accounts and update last login.

## Validation Rules

| Rule area | Source |
| --- | --- |
| Password | `lib/validations/auth.ts`: 8-128 chars, uppercase, lowercase, number. Better Auth also enforces 8-128 chars. |
| Login | Email must be valid; password is required. |
| Forgot/reset password | Email must be valid; reset password must match confirmation and satisfy password schema. |
| Registration full name | 3-150 chars, letters/spaces/apostrophe/dot/hyphen only. |
| Registration phone | Valid configured country code; phone digits only, 8-15 chars. |
| Registration photo | Required; JPEG/PNG/WebP/GIF; 2 MB max. |
| Nickname | Optional; normalized; 3-50 chars; starts with alphanumeric and then alphanumeric, `_`, or `-`; unique. |
| Callback URL | `resolveSafeCallbackUrl` normalizes local paths, strips absolute URLs to pathname, rejects unauthorized role paths. |
| API request guard | `guardApiRequest` applies origin checks and tiered rate limits for auth/register/password reset routes. |

## Error Handling

| Area | Behavior |
| --- | --- |
| Auth API wrapper | Applies security headers to Better Auth responses; tracks failed email sign-ins and clears attempts on success. |
| Login lockout | `lib/security/auth-lockout.ts` can lock an IP/email pair after 5 failed attempts for 15 minutes when enabled. Redis failures log warnings and allow attempts. |
| Login UI | Maps Better Auth errors through `lib/auth/map-errors.ts`; shows toast errors. |
| Inactive users | Session hooks block session creation; proxy/session-context redirect or report `accountInactive`; role guards throw/redirect. |
| Google-only accounts | Email/password login and password reset are blocked with a specific message. |
| Registration | Returns `422` field errors for validation/photo issues, `409` for duplicate nickname/email-like conflicts, `500` for upload/server failures. |
| Forgot password | Returns validation, not-found, Google-only, or generic server errors. |
| API role guards | API routes throw `AppError` for `401`/`403` instead of redirecting to HTML. |
| Session context | Returns unauthenticated, stale session, inactive account, role/profile/provider details in a common JSON success envelope. |

## Dependency Graph

```text
app auth pages
  -> PageShell + components/auth/*
  -> hooks/use-auth-mutations.ts
  -> lib/auth/client.ts
  -> app/api/account/* and app/api/auth/[...all]
  -> lib/api/guard-request.ts + lib/security/*
  -> lib/auth/server.ts
  -> Better Auth + Drizzle adapter
  -> db/schema/auth.ts + db/schema/roles.ts
  -> Redis secondary storage / lockout / rate limit
  -> email templates + SMTP
  -> Firebase Google auth
  -> profile photo storage

proxy.ts
  -> Better Auth session cookie
  -> /api/account/session-context
  -> lib/roles/route-access.ts
  -> protected page redirects
```

## High-Risk Files

| File | Risk |
| --- | --- |
| `proxy.ts` | Central auth, role, inactive account, forced password, and legacy redirect behavior. |
| `lib/auth/server.ts` | Better Auth configuration, providers, email/password policy, session hooks, Redis storage. |
| `app/api/auth/[...all]/route.ts` | Security wrapper around Better Auth; changes can bypass origin checks, lockout, or headers. |
| `app/api/account/session-context/route.ts` | Proxy and client source of session/role/profile truth. |
| `lib/auth/session.ts` | Server session helpers and auth-page redirects. |
| `lib/auth/role-guard.ts` | Shared page/API role guard behavior. |
| `lib/roles/route-access.ts` | Role-to-route authorization and callback URL safety. |
| `lib/roles/sync.ts` | Default role assignment and role synchronization. |
| `db/schema/auth.ts` | Auth user/session/account/verification schema. |
| `db/schema/roles.ts` | Authorization source-of-truth schema. |
| `app/api/account/register/route.ts` | Multipart registration, storage upload, Better Auth sign-up, user update, role assignment. |
| `lib/auth/plugins/firebase-google.ts` | Google sign-in/register, account linking, session cookie creation. |
| `lib/security/auth-lockout.ts` | Redis-backed login lockout policy. |
| `lib/api/guard-request.ts` | Origin/rate-limit guard used by auth-sensitive routes. |
| `hooks/use-auth-mutations.ts` | Client redirect and cache invalidation behavior after auth changes. |
| `stores/auth-ui-store.ts` | Shared submitting state across auth forms. |

## Safe Modification Guide

- Preserve server/client boundaries: keep Better Auth server config, session helpers, role guards, and DB access server-only.
- Do not add `"use client"` to auth pages just to access form state; keep interactive form logic in `components/auth`.
- Keep `/api/account/session-context` stable because both `proxy.ts` and client hooks depend on its fields.
- When changing routes, update `lib/constants/routes.ts`, `lib/roles/route-access.ts`, proxy redirect behavior, and this feature doc.
- When changing role rules, test player, host, and super_admin paths plus safe callback URL behavior.
- When changing registration fields, update `lib/validations/auth.ts`, `app/api/account/register/route.ts`, `db/schema/auth.ts` if needed, form components, profile completion logic, and docs.
- When changing password or email flows, verify Better Auth config and the custom account routes stay consistent.
- Preserve origin checks, rate-limit tiers, security headers, and login lockout around auth endpoints.
- Preserve inactive-user and `mustChangePassword` handling in both proxy/page helpers and API guards.
- Avoid storing session or role truth in Zustand; use Better Auth/session-context and React Query.
- Treat code as source of truth if docs disagree, then update the relevant `docs/ai` files.

## Recommended Tests

| Area | Tests |
| --- | --- |
| Login | Valid credentials, invalid credentials, inactive account, Google-only account, lockout after repeated failures, callback URL redirect. |
| Registration | Field validation, required/invalid/oversized photo, duplicate nickname, duplicate email, upload failure, default player role assignment, verification redirect. |
| Google auth | Existing verified account linking, new account creation, inactive existing account, profile completion false path, invalid Firebase token. |
| Session context | Unauthenticated, stale session, inactive account, roles/permissions/dashboard links, `mustChangePassword`, provider flags. |
| Proxy redirects | Unauthenticated protected page, authenticated auth page, forced password change, role-denied admin/host/player paths, legacy contributor redirects. |
| Password reset | Unknown email, Google-only account, valid reset request, expired/invalid token, password complexity. |
| Forced password change | Unauthorized request, not-required request, wrong temporary/current password, successful change clears `mustChangePassword`. |
| Role guards | Page redirects and API JSON errors for missing/insufficient roles. |
| Security | Origin rejection, auth/register/passwordReset rate-limit tiers, security headers on auth API responses. |

## Needs Verification

- Exact rendering and copy behavior of `/auth/check-email`, `/auth/verify-email`, and `/auth/forgot-password/sent` was not deeply inspected.
- Exact consumers of `useSessionContext`, `useLogoutWithConfirm`, `components/layout/user-menu.tsx`, and dashboard navigation should be rechecked before UI changes.
- Whether every account settings route uses the common JSON envelope and guard style consistently.
