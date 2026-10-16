# Auth & Roles

Gud Game uses **two authentication systems** and a **multi-role** workspace model.

---

## System A — Gud Game platform (better-auth)

Used by players, hosts, partner **staff**, and super admins.

| Piece | Location |
| --- | --- |
| Server config | `lib/auth/server.ts` |
| API catch-all | `app/api/auth/[...all]/route.ts` |
| Session helpers | `lib/auth/session.ts` |
| Role guard | `lib/auth/role-guard.ts` |
| Google | Firebase plugin `lib/auth/plugins/firebase-google.ts` |
| Redis secondary storage | `lib/auth/redis-secondary-storage.ts` |
| Lockout | `lib/security/auth-lockout.ts` |
| Request gate | `proxy.ts` |

Capabilities:

- Email/password with verification flows
- Password reset / change
- Google sign-in via Firebase Admin verification
- Rate limiting and optional lockout (`AUTH_LOCKOUT_ENABLED`)
- Secure cookies in production (`BETTER_AUTH_URL`, `BETTER_AUTH_SECRET`)

---

## System B — Partner members

Partner **players/members** do **not** share Gud Game better-auth sessions. They authenticate against partner identity tables with per-tenant cookies (`gg_pps_<partnerSlug>`).

Full isolation rules: [partner-auth.md](./partner-auth.md).

Partner **staff** still use System A with the `partner` role and manage the tenant from `/dashboard/partner`.

---

## Canonical roles

Defined in `lib/roles/constants.ts`:

| Role | Purpose | Primary UI |
| --- | --- | --- |
| `player` | Default registration | `/dashboard` |
| `host` | Create/manage Gud Game tournaments, wiki edit (moderated) | `/dashboard/host` |
| `partner` | White-label staff | `/dashboard/partner` |
| `super_admin` | Master Console | `/admin` |

Anonymous visitors have no stored role (`viewer` is conceptual only).

### Legacy mapping

Older single-column values are normalized:

| Legacy | Canonical |
| --- | --- |
| `contributor`, `editor`, `moderator` | `host` |
| `admin` | `super_admin` |

Source of truth for assignments: `user_role_assignments` (`db/schema/roles.ts`). Legacy `user.role` is kept in sync via `pickPrimaryRole`.

### Active role cookie

`cp-active-role` selects the workspace when a user holds multiple roles. Sport-scoped cookies (`cp-admin-sport`, `cp-dashboard-sport`) narrow admin/dashboard context.

---

## Host onboarding

Players can request the host role; super admins approve via `/admin/host-requests` (`db/schema/host-role-requests.ts`).

---

## Path gates (conceptual)

`proxy.ts` + role guards protect:

- `/admin/**` → `super_admin`
- `/dashboard/host/**` → `host` (or higher as implemented)
- `/dashboard/partner/**` → `partner`
- Auth pages vs authenticated redirects

Exact rules live in code — treat this table as the product intent.

---

## Security notes

- Never reuse partner member cookies on Gud Game routes.
- Production requires strong `BETTER_AUTH_SECRET` and HTTPS URLs.
- Health and cron endpoints use separate tokens (`HEALTH_CHECK_TOKEN`, `CRON_SECRET`), not user sessions.

---

## Related

- [partners.md](./partners.md)
- [partner-auth.md](./partner-auth.md)
- [SETUP.md](./SETUP.md)
