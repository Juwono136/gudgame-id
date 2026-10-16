# Architecture

How Gud Game is structured in production and what each layer owns.

---

## High-level diagram

```text
                         Cloudflare Tunnel
                                |
                     Docker network: tunnel
          +---------------------+---------------------+
          |                     |                     |
       Next.js app           pgAdmin            storage_gateway
       (gudgame-app)         :5050              (nginx → S3 API)
          |                     |                     |
          +----------+----------+                     |
                     |                                v
              PostgreSQL 18  +  Redis 7           SeaweedFS
              (gudgame_db)

          payout-cron  -->  POST /api/cron/*  (CRON_SECRET)
```

Compose project name: **`gudgame-app`**. External Docker network: **`tunnel`**.

---

## Runtime services

| Service | Container | Role |
| --- | --- | --- |
| `app` | `gudgame-app` | Next.js 16 App Router (standalone image) |
| `postgres` | `gudgame-postgres` | PostgreSQL **18** (`gudgame_db`) |
| `redis` | `gudgame-redis` | Sessions/cache secondary storage |
| `seaweedfs` | `seaweed_core` | Object storage backend |
| `storage_gateway` | — | nginx basic-auth gateway to SeaweedFS |
| `pgadmin` | `gudgame-pgadmin` | DB admin UI (localhost / tunnel) |
| `payout-cron` | — | Alpine cron → host payouts + timed matches |
| `db-migrate` | *(profile)* | `npm run db:migrate:prod` |
| `db-restore` | *(profile)* | Opt-in dump restore into `gudgame_db` |

Details: [DEPLOYMENT-VPS.md](./DEPLOYMENT-VPS.md).

---

## Application layers

```text
app/                 Routes (RSC pages) + Route Handlers (API)
components/          UI — layouts, tournament manage/display, shadcn
lib/                 Domain logic (auth, tournaments, payments, wiki, storage)
db/                  Drizzle schema + migrations + seeds
proxy.ts             Request gate (cookies, roles, rate limit, headers)
ops/                 Cron, storage gateway, pgAdmin, restore scripts
```

### Request path (simplified)

1. **Browser** hits Cloudflare → Tunnel → `app:3000`.
2. **`proxy.ts`** enforces auth cookies, role path rules, and security headers.
3. **Server Components / Route Handlers** call `lib/*` with validated env (`lib/config/env.server.ts`).
4. **Postgres** holds durable state; **Redis** backs Better Auth secondary storage and caching.
5. **Media** uploads go through storage adapters → `storage_gateway` → SeaweedFS; public URLs use `NEXT_PUBLIC_STORAGE_URL`.

---

## Auth architecture (two systems)

| Surface | Mechanism | Cookie / session |
| --- | --- | --- |
| Gud Game (players, hosts, partner **staff**, admin) | **better-auth** + Firebase Google plugin | Platform session |
| Partner **members** | Partner identity tables + dedicated cookies | `gg_pps_<partnerSlug>` (see [partner-auth.md](./partner-auth.md)) |

Roles are many-to-many (`user_role_assignments`) with legacy `user.role` kept in sync. Canonical roles: `player`, `host`, `partner`, `super_admin`.

See [auth-and-roles.md](./auth-and-roles.md).

---

## Multi-tenancy model

- **Gud Game tournaments:** `tournaments.partner_id IS NULL` — appear on the main site.
- **Partner tournaments:** `partner_id` set — only on `/{partnerSlug}/…`.
- **Career stats:** Gud Game career tables vs partner-scoped career tables (no cross-leak of partner play into global rankings by design).
- **Partner leagues:** group partner tournaments for standings; no TV/career sync with Gud Game official path.

See [partners.md](./partners.md) and [data-model.md](./data-model.md).

---

## Background jobs

| Job | Trigger | Purpose |
| --- | --- | --- |
| Host payouts | `payout-cron` → `/api/cron/host-payouts` | Disburse settled funds to host banks |
| Timed matches | `payout-cron` → `/api/cron/timed-matches` | Hard-stop Fun Match / timed sessions |

Both require `CRON_SECRET`. The app itself stays request-driven; the sidecar keeps schedules reliable inside Docker.

---

## Data & migrations

- ORM: **Drizzle** (`db/schema/*`, `db/migrations/*`).
- Production apply path: **`npm run db:migrate:prod`** (SQL migrator) — not `drizzle-kit push` in CI.
- Restore of custom dumps is **opt-in** (Compose profile `restore` / workflow `db-restore.yml`).

See [DATABASE-RESTORE.md](./DATABASE-RESTORE.md).

---

## Security highlights

- Zod-validated server env; `STRICT_PRODUCTION_ENV` for CI.
- Health endpoint gated by `HEALTH_CHECK_TOKEN`.
- Auth lockout + rate limits.
- Wiki scrape SSRF protection via `WIKI_SCRAPE_ALLOWED_HOSTS`.
- Storage gateway basic auth; secrets never baked into images.
- Postgres / Redis bound to `127.0.0.1` on the host; public entry via Tunnel.

---

## Tech stack snapshot

| Layer | Choice |
| --- | --- |
| UI | Next.js 16, React 19, Tailwind 4, shadcn/radix, Framer Motion |
| API | Next.js Route Handlers |
| DB | PostgreSQL 18 + Drizzle |
| Cache | Redis 7 (ioredis) |
| Auth | better-auth, Firebase Admin/Client (Google) |
| Payments | Xendit (+ XenPlatform) |
| Storage | SeaweedFS + nginx gateway + AWS S3 SDK |
| Email | nodemailer / SMTP |
| Tests | Vitest |
| Deploy | Docker Compose, GitHub Actions self-hosted, Cloudflare Tunnel |

---

## Related

- [features.md](./features.md)
- [cicd-and-ops.md](./cicd-and-ops.md)
- [api-overview.md](./api-overview.md)
