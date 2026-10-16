# API Overview

Gud Game exposes HTTP APIs as **Next.js Route Handlers** under `app/api/`. There are on the order of **~180** route files; this document groups them by domain instead of listing every path.

Base URL (prod): `https://gudgame.id`  
Internal Docker: `http://app:3000`

---

## Conventions

- JSON request/response helpers in `lib/api/`
- Auth: session cookies (better-auth) or partner cookies; cron/health use shared secrets
- Errors: structured app errors from `lib` core patterns
- Partner routes often live under `/api/...` with partner slug/context validated in handlers

---

## Domain map

| Domain | Typical prefixes | Notes |
| --- | --- | --- |
| **Auth** | `/api/auth/*` | better-auth catch-all |
| **Session / me** | `/api/...` user profile helpers | Used by dashboards |
| **Tournaments** | `/api/tournaments/*` | CRUD, bracket, manage, display feeds |
| **Live / manage** | `.../manage/*`, live payloads | Score entry, court ops |
| **Payments** | payment + webhook routes | Xendit |
| **Host payout** | host bank / payout APIs | Dashboard + cron consumer |
| **Partner public** | partner auth + registration | Isolated members |
| **Wiki / search** | `/api/search`, wiki admin APIs | Encyclopedia |
| **Media** | `/api/media/*` | Uploads / signed access patterns |
| **Notifications** | `/api/notifications/*` | In-app notifications |
| **Admin** | `/api/admin/*` (and admin UI loaders) | Super-admin only |
| **Maps** | `/api/maps/*` | Google Places proxy where enabled |
| **Health** | `/api/health` | Token-gated infra check |
| **Cron** | `/api/cron/host-payouts`, `/api/cron/timed-matches` | `CRON_SECRET` |

---

## Privileged endpoints

| Endpoint | Auth | Caller |
| --- | --- | --- |
| `GET /api/health` | `HEALTH_CHECK_TOKEN` | Monitoring / CI |
| `POST /api/cron/*` | `CRON_SECRET` | `payout-cron` sidecar |

Do not expose these secrets in client bundles.

---

## Tournament API themes

Handlers typically cover:

1. Public tournament read / registration  
2. Checkout + payment confirmation  
3. Bracket generate / start / reset  
4. Manage score updates & revisions  
5. Display polling payloads  
6. Invites & claim  

UI entry points mirror these under `app/sports/...` and `app/[partnerSlug]/...`.

---

## Exploring the code

```bash
# List route handlers
find app/api -name 'route.ts' | sort
```

For behavior, start from the UI action → Network tab → matching `app/api/**/route.ts` → `lib/**` domain module.

---

## Related

- [architecture.md](./architecture.md)
- [auth-and-roles.md](./auth-and-roles.md)
- [payments-and-payouts.md](./payments-and-payouts.md)
