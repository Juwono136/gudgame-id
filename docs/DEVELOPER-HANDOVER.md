# Gud Game — Developer Handover Manual

| | |
| --- | --- |
| **Document** | Technical handover & developer manual |
| **Product** | **Gud Game** (`gud-game` npm package) |
| **Receiving team** | Attentive IT / engineering |
| **Audience** | Developers taking ownership of development **and** deployment |
| **Language** | English |
| **Version** | 2026-10-16 |
| **Companion docs** | Everything under [`docs/`](./README.md) |

> **Purpose.** After reading this document, a new engineer should be able to run the app locally, understand the major domains, change features safely, ship migrations, and operate production deploys without tribal knowledge.
>
> **Product naming.** The public product is **Gud Game** (domains `gudgame.id`, DB `gudgame_db`). The repository folder may still be named `court-pedia` — that is a legacy local path only. In this handover, “the application” always means Gud Game.

---

## Table of contents

1. [Handover checklist](#1-handover-checklist)
2. [System overview](#2-system-overview)
3. [Repository map](#3-repository-map)
4. [Local development](#4-local-development)
5. [Configuration & secrets](#5-configuration--secrets)
6. [Request lifecycle & security](#6-request-lifecycle--security)
7. [Authentication & authorization](#7-authentication--authorization)
8. [Domain modules (how features work)](#8-domain-modules-how-features-work)
9. [Database, schema & migrations](#9-database-schema--migrations)
10. [APIs & UI conventions](#10-apis--ui-conventions)
11. [Background jobs & cron](#11-background-jobs--cron)
12. [Testing & quality gates](#12-testing--quality-gates)
13. [Docker images & Compose stack](#13-docker-images--compose-stack)
14. [CI/CD & production deployment](#14-cicd--production-deployment)
15. [Day-2 operations](#15-day-2-operations)
16. [How to extend the product safely](#16-how-to-extend-the-product-safely)
17. [Known pitfalls & legacy names](#17-known-pitfalls--legacy-names)
18. [Reading order & doc index](#18-reading-order--doc-index)

---

# 1. Handover checklist

Use this on day one of ownership.

### Access & accounts

- [ ] Git repository access (source of truth for code + `docs/`)
- [ ] GitHub Actions access (self-hosted runner on the VPS)
- [ ] VPS / Docker host SSH (Compose project `gudgame-app`, network `tunnel`)
- [ ] Cloudflare Zero Trust / Tunnel (public HTTPS for `gudgame.id` & `storage.gudgame.id`)
- [ ] GitHub Actions **Secrets** inventory (see [§5](#5-configuration--secrets))
- [ ] Xendit dashboard (payments / webhooks / XenPlatform)
- [ ] Firebase project (Google sign-in)
- [ ] SMTP credentials
- [ ] pgAdmin credentials (optional admin UI)

### Verify the running system

```bash
# On the VPS (project checkout used by the runner)
docker compose ps
docker compose exec postgres psql -U "$POSTGRESQL_USERNAME" -d postgres -c "SHOW server_version;"
# expect 18.x

curl -sS -H "X-Health-Token: $HEALTH_CHECK_TOKEN" \
  "https://gudgame.id/api/health"
```

### Verify you can develop

```bash
cp .env.example .env   # then fill secrets
npm install
npm run db:push:prod   # local only
npm run db:seed
npm run infra:check
npm run dev
npm run typecheck && npm run lint && npm run test
```

### Read next (in order)

1. This file (finish at least through §8)  
2. [architecture.md](./architecture.md)  
3. [USER-MANUAL.md](./USER-MANUAL.md) (product behavior)  
4. [DEPLOYMENT-VPS.md](./DEPLOYMENT-VPS.md)  
5. Domain deep-dives as needed (tournaments, partners, payments)

---

# 2. System overview

## 2.1 What the product does

Gud Game is a **court-sports platform** (padel-first MVP):

| Pillar | Capability |
| --- | --- |
| Sport hub & wiki | Players, teams, gear, rules, search |
| Tournaments | Official (ranked) + Fun Match (unranked) + live scoring |
| Venue TV | Full-screen display boards |
| Payments | Xendit invoices + host payouts |
| Partners | White-label tenants with isolated member auth |
| Platform admin | Master Console for super admins |

End-user flows: [USER-MANUAL.md](./USER-MANUAL.md). Feature inventory: [features.md](./features.md).

## 2.2 Runtime architecture

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

| Service | Role |
| --- | --- |
| `app` | Next.js 16 App Router (standalone Docker image) |
| `postgres` | PostgreSQL **18**, database **`gudgame_db`** |
| `redis` | Cache + better-auth secondary storage |
| `seaweedfs` + `storage_gateway` | Object storage behind nginx basic auth |
| `pgadmin` | DB admin UI |
| `payout-cron` | Calls host-payout + timed-match cron routes |
| `db-migrate` *(profile)* | Applies SQL migrations |
| `db-restore` *(profile)* | Opt-in dump restore (never on every push) |

Full diagram notes: [architecture.md](./architecture.md).

## 2.3 Tech stack

| Layer | Choice | Notes |
| --- | --- | --- |
| Framework | **Next.js 16** (App Router), React 19, TypeScript | `package.json` |
| UI | Tailwind 4, shadcn/radix, Framer Motion | `components/`, `components.json` |
| ORM | **Drizzle** | `db/schema/*`, `db/migrations/*` |
| Auth | **better-auth** + Firebase Google plugin | `lib/auth/` |
| Payments | **Xendit** (+ XenPlatform) | `lib/payments/` |
| Storage | SeaweedFS + `@aws-sdk/client-s3` | `lib/storage/` |
| Email | nodemailer / SMTP | `lib/email/` |
| Tests | Vitest | `lib/**/__tests__` |
| Deploy | Docker Compose + GHA self-hosted + Cloudflare Tunnel | `.github/workflows/cicd.yml` |

---

# 3. Repository map

```text
app/                 # Pages (RSC) + Route Handlers (API)
  api/               # ~180 route.ts handlers
  sports/            # Sport hubs, wiki, Gud Game tournaments
  [partnerSlug]/     # White-label public surfaces
  dashboard/         # Player / host / partner workspaces
  admin/             # Super Admin Master Console
components/          # UI (layout, tournaments, partners, shadcn)
db/
  schema/            # Drizzle table modules
  migrations/        # Versioned SQL (production path)
  seed.ts            # MVP seed (padel)
lib/
  auth/              # better-auth, sessions, Firebase plugin
  roles/             # Canonical roles + legacy maps
  tournaments/       # Brackets, live, scoring, registration, display
  partners/          # Tenant + partner member auth
  payments/          # Xendit, XenPlatform, host payout
  wiki/              # Encyclopedia + scrape + search
  storage/           # Object storage adapters
  config/            # Zod env validation, site metadata
  cron/              # Cron secret verification helpers
proxy.ts             # Request gate (cookies, roles, rate limit, headers)
ops/
  cron/              # payout-cron Dockerfile + crontab
  storage/           # nginx gateway + htpasswd generator
  db/                # restore script + backups drop folder
  pgadmin/           # servers.json
  ci/                # export-docker-database-url.sh, etc.
scripts/             # migrate runner, seeds, infra check, bootstrap admin
docs/                # Product, ops, and this handover
.github/workflows/   # cicd.yml, db-restore.yml
docker-compose.yml   # Full VPS stack
Dockerfile           # app (standalone) + migrator stages
```

### Mental model for changes

| You want to change… | Start here |
| --- | --- |
| Page URL / layout | `app/**` + matching `components/**` |
| Business rule | `lib/<domain>/**` then wire API/UI |
| Table / column | `db/schema/**` → generate migration → `db:migrate:prod` |
| Env var | `.env*.example` + `lib/config/env.server.ts` (+ CI secrets) |
| Deploy behavior | `docker-compose.yml`, `Dockerfile`, `.github/workflows/cicd.yml` |
| Cron schedule | `ops/cron/` + `app/api/cron/**` |

---

# 4. Local development

Detailed steps: [SETUP.md](./SETUP.md). Summary below.

## 4.1 Prerequisites

- Node.js **20+**
- PostgreSQL (16+ OK locally; production is **18**)
- Redis 7
- Optional Docker for infra parity

## 4.2 Bootstrap

```bash
cp .env.example .env
# Set at least: DATABASE_URL, REDIS_URL, BETTER_AUTH_SECRET,
# BETTER_AUTH_URL, NEXT_PUBLIC_APP_URL (local origin)

npm install

# Local convenience — NOT the production migrate path
npm run db:push:prod
npm run db:seed

# Optional admin user (requires BOOTSTRAP_ADMIN_* in .env)
npm run db:bootstrap-admin

npm run infra:check
npm run dev
```

Open `http://localhost:3000` (or the port printed by the dev script).

## 4.3 Essential scripts

| Command | Use |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` / `start` | Prod-like local run |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run test` | Vitest |
| `npm run validate:env` | Zod env check |
| `npm run db:generate` | Create migration from schema diff |
| `npm run db:migrate:prod` | **Production** SQL migrator (`scripts/run-db-migrate.ts`) |
| `npm run db:seed*` | Seeds / fixtures / Bestie Cup dry-run |
| `npm run infra:check` | Postgres / Redis / storage health |

## 4.4 QA fixture scripts (disposable DBs only)

| Script | Purpose |
| --- | --- |
| `db:seed:fixtures` / `:purge` | Official tournament fixtures |
| `db:seed:double-stage` / `:purge` | Double-stage sample |
| `db:seed:partner-bestie-cup` / `:purge` | Partner event dry-run |

Never run purge scripts against production.

---

# 5. Configuration & secrets

## 5.1 Env files

| File | Purpose |
| --- | --- |
| `.env.example` | Local template (may still mention legacy `courtpedia_*` names) |
| `.env` | Local secrets (**gitignored**) |
| `.env.production.example` | Production-oriented template (`gudgame_db`, bucket `gudgame`) |
| GitHub Actions Secrets | Source of truth for VPS deploy |

Validation lives in `lib/config/env.server.ts`. CI should use `STRICT_PRODUCTION_ENV=true`.

## 5.2 Critical variables (production)

| Area | Variables |
| --- | --- |
| URLs | `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SITE_URL`, `BETTER_AUTH_URL` → `https://gudgame.id` |
| DB | `DATABASE_URL` → `postgres://…@postgres:5432/gudgame_db` |
| Redis | `REDIS_URL` → `redis://:…@redis:6379` |
| Auth | `BETTER_AUTH_SECRET` (≥32), Firebase client + admin keys |
| Storage | `STORAGE_ENDPOINT=http://storage_gateway:8333`, `STORAGE_BUCKET=gudgame`, `NEXT_PUBLIC_STORAGE_URL=https://storage.gudgame.id`, `USERNAME_STORAGE` / `PASSWORD_STORAGE` |
| Payments | `XENDIT_SECRET_KEY`, `XENDIT_WEBHOOK_TOKEN`, `XENDIT_XENPLATFORM_ENABLED`, `XENDIT_STAGING_MODE` |
| Ops | `HEALTH_CHECK_TOKEN`, `CRON_SECRET`, `LOG_LEVEL` |
| Compose infra | `POSTGRESQL_*`, `REDIS_PASSWORD`, `PGADMIN_*`, `TUNNEL_NAME` |

**Rule:** runtime secrets are injected by Compose / CI. The Docker image build uses placeholders (`SKIP_ENV_VALIDATION`, fake `BETTER_AUTH_SECRET`). Public `NEXT_PUBLIC_*` and Firebase client config are **baked at image build** via Dockerfile `ARG`s — changing them requires a rebuild.

Template: `.env.production.example`.

## 5.3 Docker DNS vs localhost

Inside Compose, the app must use:

| Host | Service |
| --- | --- |
| `postgres` | Database |
| `redis` | Redis |
| `storage_gateway` | Object storage writes |
| `app` | Cron → Next.js |

Using `localhost` or `host.docker.internal` inside containers is a common deploy bug. CI resolves `DATABASE_URL` from `POSTGRESQL_*` via `ops/ci/export-docker-database-url.sh`.

---

# 6. Request lifecycle & security

## 6.1 Path of a request

1. Client → Cloudflare → Tunnel → `app:3000`  
2. **`proxy.ts`** — cookie/session awareness, role path gates, rate limit, security headers  
3. App Router page or `app/api/**/route.ts`  
4. Domain logic in `lib/**`  
5. Postgres / Redis / storage / external APIs (Xendit, Firebase, SMTP, Maps)

There is no classic `middleware.ts` entry in the same form — treat **`proxy.ts`** as the edge gate.

## 6.2 Security controls to preserve

| Control | Where |
| --- | --- |
| Env validation | `lib/config/env.server.ts` |
| Auth lockout | `lib/security/auth-lockout.ts` |
| Cron auth | `lib/cron/verify-cron-secret.ts` + `CRON_SECRET` |
| Health auth | `HEALTH_CHECK_TOKEN` on `/api/health` |
| Wiki scrape SSRF allowlist | `WIKI_SCRAPE_ALLOWED_HOSTS` |
| Storage basic auth | `ops/storage` htpasswd |
| Partner cookie isolation | `gg_pps_<slug>` — never reuse on Gud Game routes |

---

# 7. Authentication & authorization

Deep dive: [auth-and-roles.md](./auth-and-roles.md), [partner-auth.md](./partner-auth.md).

## 7.1 Two auth systems (do not merge)

| Surface | Stack | Session |
| --- | --- | --- |
| Gud Game users (player, host, partner **staff**, super_admin) | better-auth + Firebase Google | Platform session cookies |
| Partner **members** | Partner identity tables | `gg_pps_<partnerSlug>` |

Partner **staff** still use Gud Game login and open `/dashboard/partner`.

## 7.2 Canonical roles

Defined in `lib/roles/constants.ts`:

| Role | Workspace |
| --- | --- |
| `player` | `/dashboard` |
| `host` | `/dashboard/host` |
| `partner` | `/dashboard/partner` |
| `super_admin` | `/admin` |

Assignments are many-to-many in `user_role_assignments`. Legacy `user.role` is synced via `pickPrimaryRole`. Legacy aliases (`contributor` → `host`, `admin` → `super_admin`) must keep working until fully purged.

Active workspace cookie: `cp-active-role`.

## 7.3 Key files

| Concern | Path |
| --- | --- |
| better-auth server | `lib/auth/server.ts` |
| Auth API | `app/api/auth/[...all]/route.ts` |
| Role guard | `lib/auth/role-guard.ts` |
| Firebase Google | `lib/auth/plugins/firebase-google.ts` |
| Partner sessions | `lib/partners/auth/` |

---

# 8. Domain modules (how features work)

## 8.1 Tournaments

| Concept | Implementation |
| --- | --- |
| Types | `official` · `fun_match` (`db/schema/tournaments.ts`) |
| Formats | americano, single elim, double stage, mexicano, group_only, swiss, … |
| Isolation | `partner_id IS NULL` = Gud Game; set = partner only |
| Brackets | `lib/tournaments/brackets/` |
| Double stage | `lib/tournaments/double-stage/` |
| Live polling | `lib/tournaments/live/` |
| Fun Match / reclub | `lib/tournaments/reclub/` |
| Scoring / revisions | `lib/tournaments/scoring/` |
| Manage UI | `…/manage` + `components/tournaments/` |
| TV display | `…/display` + `components/tournaments/display/` |

Docs: [tournaments.md](./tournaments.md), [tournament-guide.md](./tournament-guide.md), [tv-display.md](./tv-display.md).

**When changing tournament logic:** update engines under `lib/tournaments/**`, add/adjust Vitest tests, then verify Manage + Display + public pages together. Format settings often live in `tournaments.settings` JSONB — dual-read with legacy columns is intentional.

## 8.2 Payments & host payouts

```text
Registration checkout → Xendit invoice → webhook / status sync
Host XenPlatform + bank accounts → cron disbursements
```

| Area | Path |
| --- | --- |
| Checkout methods | `lib/tournaments/payments/` |
| Xendit / XenPlatform | `lib/payments/` |
| Host payout | `lib/payments/host-payout/` |
| Cron route | `app/api/cron/host-payouts` |

Docs: [payments-and-payouts.md](./payments-and-payouts.md).

Prefer `XENDIT_STAGING_MODE` until webhooks are verified on the public domain.

## 8.3 Partners (white-label)

| Concern | Path / rule |
| --- | --- |
| Tenant model | `db/schema/partners.ts`, `lib/partners/` |
| Public site | `app/[partnerSlug]/**` |
| Staff console | `app/dashboard/partner/**` |
| Member auth | Isolated — [partner-auth.md](./partner-auth.md) |
| Leagues | `partner_leagues` — standings, not Gud Game career |
| Career | Partner-scoped tables — do not write into Gud Game official ranking |

Docs: [partners.md](./partners.md).

## 8.4 Wiki & search

| Concern | Path |
| --- | --- |
| Entities | `db/schema/wiki.ts`, `lib/wiki/` |
| Search | `lib/wiki/global-search.ts`, `/search` |
| Scrape | allowlisted hosts only |

Docs: [wiki-and-content.md](./wiki-and-content.md).

## 8.5 Storage & media

App → `STORAGE_ENDPOINT` (`storage_gateway`) → SeaweedFS. Browsers use `NEXT_PUBLIC_STORAGE_URL`.

Docs: [storage-and-media.md](./storage-and-media.md). Regenerate htpasswd with `ops/storage/generate-htpasswd.sh` when credentials rotate.

---

# 9. Database, schema & migrations

Map: [data-model.md](./data-model.md).

## 9.1 Schema layout

Modules under `db/schema/` cover auth, roles, sports/wiki, tournaments (+ registration, matches, courts, payments), career, partners, host money, notifications, etc. Re-exports go through `db/schema.ts`.

## 9.2 Migration policy (critical)

| Environment | Command | Notes |
| --- | --- | --- |
| Local spike | `npm run db:push` / `db:push:prod` | Fast, not for prod history |
| **Production / CI** | `npm run db:migrate:prod` | Applies `db/migrations` via `scripts/run-db-migrate.ts` |

**Do not** use `drizzle-kit push` in the deploy pipeline. CI previously failed when push hid errors or when host Node / wrong `DATABASE_URL` was used — migrate runs inside the **migrator** image on Docker network `tunnel`.

### Adding a schema change

```bash
# 1) Edit db/schema/*.ts
# 2) Generate migration
npm run db:generate
# 3) Review SQL under db/migrations/
# 4) Apply locally with migrate:prod against a disposable DB
npm run db:migrate:prod
# 5) Ship — CI applies migrate:prod on deploy
```

Keep `db/migrations/meta/_journal.json` consistent. Missing journal entries have caused production migrate failures before.

## 9.3 Restore (opt-in only)

Legacy dumps may say database name `tanding_db` and require PostgreSQL **18**. Restore **into** `gudgame_db` without `--create`.

- Compose: `FORCE_RESTORE=true docker compose --profile restore run --rm db-restore`  
- Then: `docker compose --profile migrate run --rm db-migrate`  
- Workflow: `db-restore.yml` (`workflow_dispatch` only)

Full runbook: [DATABASE-RESTORE.md](./DATABASE-RESTORE.md).

### Postgres 18 volume mount

Official image expects volume at **`/var/lib/postgresql`** (not `.../data`). Wrong mount → container unhealthy.

---

# 10. APIs & UI conventions

API map: [api-overview.md](./api-overview.md).

## 10.1 Route Handlers

- Live under `app/api/**/route.ts`  
- Prefer shared helpers in `lib/api/`  
- Auth via session cookies or partner cookies; cron/health via secrets  

Discover routes:

```bash
find app/api -name 'route.ts' | sort
```

## 10.2 UI / App Router

- Server Components by default; client components only when needed (`"use client"`)  
- Tournament manage/display are the highest-complexity UI surfaces  
- Partner public UI intentionally mirrors Official visuals but keeps white-label auth/data rules  

End-user labels: [USER-MANUAL.md](./USER-MANUAL.md).

## 10.3 Route constants

Prefer helpers in `lib/constants/routes.ts` over hard-coded path strings when adding links.

---

# 11. Background jobs & cron

| Job | Route | Purpose |
| --- | --- | --- |
| Host payouts | `POST /api/cron/host-payouts` | Disburse settled funds |
| Timed matches | `POST /api/cron/timed-matches` | Hard-stop Fun Match timers |

- Sidecar: Compose service `payout-cron` (`ops/cron/Dockerfile`)  
- Calls `APP_INTERNAL_URL` (default `http://app:3000`)  
- Header/secret: `CRON_SECRET`  

If payouts or timed matches stop, check sidecar logs and that the app is healthy on Docker DNS `app`.

---

# 12. Testing & quality gates

```bash
npm run typecheck
npm run lint
npm run test
```

- Unit/domain tests live next to code: `lib/**/__tests__/**`  
- Prioritize tests when changing: scoring engines, double-stage, brackets, partner auth, payments helpers  
- There is no substitute for a Manage + Display smoke test on a seeded tournament before a big release  

Suggested local smoke after tournament changes:

1. Seed fixtures or Bestie Cup dry-run  
2. Open public page → register path (or use seed data)  
3. Manage → Live scoring  
4. Display URL on a second window  

---

# 13. Docker images & Compose stack

## 13.1 Dockerfile stages

| Stage | Role |
| --- | --- |
| `deps` / `builder` | `npm ci` + `next build` (standalone) |
| `migrator` | Full deps including devDependencies; runs `db:migrate:prod` |
| `runner` | Minimal production image as user `nextjs` |

Build-time: public URLs + Firebase client args. Runtime: secrets from Compose/CI.

## 13.2 Compose highlights (`docker-compose.yml`)

- Project name: `gudgame-app`  
- External network: `tunnel` (must exist: `docker network create tunnel`)  
- Postgres image: `postgres:18-alpine`  
- Volume: `gudgame_postgres18_data` → `/var/lib/postgresql`  
- Profiles: `migrate`, `restore`  

Never run destructive global `docker compose down --remove-orphans` on a shared VPS without understanding other stacks on `tunnel`.

---

# 14. CI/CD & production deployment

Summary: [cicd-and-ops.md](./cicd-and-ops.md). Full VPS runbook: [DEPLOYMENT-VPS.md](./DEPLOYMENT-VPS.md).

## 14.1 Workflows

| File | Trigger | Purpose |
| --- | --- | --- |
| `.github/workflows/cicd.yml` | Deploy path (push / configured events) | Infra up → PG18 check → build/roll app → migrate → health |
| `.github/workflows/db-restore.yml` | `workflow_dispatch` only | Restore dump → optional migrate |

Runner: **self-hosted** on the VPS with Docker.

## 14.2 Deploy flow (what CI does)

```text
checkout
  → ensure network `tunnel`
  → export DATABASE_URL from POSTGRESQL_* (force gudgame_db)
  → compose up postgres/redis/seaweedfs/storage_gateway/pgadmin
  → assert Postgres major ≥ 18
  → build/pull app
  → compose --profile migrate run db-migrate
  → up app + payout-cron
  → health check with HEALTH_CHECK_TOKEN
```

## 14.3 What must never happen in normal CI

- Auto-running `db-restore` / wiping `gudgame_db`  
- `drizzle-kit push` as the migrate step  
- Pointing `DATABASE_URL` at `tanding_db` or `host.docker.internal`  
- Baking production secrets into the image  

## 14.4 Cloudflare Tunnel

Public HTTPS terminates at Cloudflare. `cloudflared` joins Docker network `tunnel` and routes to `app` / `storage_gateway`. Compose does not replace Tunnel configuration — keep Zero Trust config under Attentive ops ownership.

---

# 15. Day-2 operations

| Task | Action |
| --- | --- |
| App logs | `docker compose logs -f app` |
| DB shell | `docker compose exec postgres psql -U … -d gudgame_db` |
| Health | `GET /api/health` + token header |
| Rotate storage password | Regenerate htpasswd → restart `storage_gateway` |
| Restore dump | [DATABASE-RESTORE.md](./DATABASE-RESTORE.md) |
| Match-day support | [tournament-guide.md](./tournament-guide.md), [tv-display.md](./tv-display.md) |
| Partner event | [bestie-cup-guide.md](./bestie-cup-guide.md) |

### Production checklist (release)

- [ ] `typecheck` / `lint` / `test` green  
- [ ] Migration reviewed and journal OK  
- [ ] Secrets present in GitHub Actions  
- [ ] `NEXT_PUBLIC_*` changes rebuilt into image  
- [ ] Xendit webhook still points at production URL  
- [ ] Post-deploy health OK; smoke login + one tournament page  

---

# 16. How to extend the product safely

## 16.1 Add a new API + UI feature

1. Define/adjust schema if needed → migration  
2. Implement domain logic in `lib/<domain>/`  
3. Add/adjust `app/api/.../route.ts`  
4. Wire UI in `app/` + `components/`  
5. Guard with roles (`lib/auth/role-guard.ts` / partner session helpers)  
6. Add Vitest coverage for pure logic  
7. Update docs: [features.md](./features.md), [USER-MANUAL.md](./USER-MANUAL.md) if user-facing  

## 16.2 Add a tournament format capability

1. Extend format constants / settings typing in schema + `lib/tournaments`  
2. Implement engine changes with tests  
3. Update create/edit wizards (Official + Partner parity if required)  
4. Verify Manage sections + Display layouts  
5. Update [tournament-guide.md](./tournament-guide.md)  

## 16.3 Add a partner-only feature

1. Scope all queries by `partnerId`  
2. Do **not** write partner results into Gud Game official career tables  
3. Keep member auth on partner cookies  
4. Preserve “Powered by Gud Game” / isolation messaging  

## 16.4 Add an env var

1. Update `.env.example` and `.env.production.example`  
2. Extend Zod schema in `lib/config/env.server.ts`  
3. Add GitHub Actions secret + Compose `environment` if needed  
4. If `NEXT_PUBLIC_*`, add Dockerfile `ARG`/`ENV` and rebuild  

---

# 17. Known pitfalls & legacy names

| Pitfall | Correct approach |
| --- | --- |
| Repo folder `court-pedia` / local `courtpedia_db` | Product/DB in prod: **Gud Game** / **`gudgame_db`** |
| Dump DB name `tanding_db` | Restore into `gudgame_db` without `--create` |
| Postgres volume on `/var/lib/postgresql/data` | Mount `/var/lib/postgresql` for PG18 |
| `drizzle-kit push` in CI | Use `db:migrate:prod` |
| Merging partner member sessions into better-auth | Keep two auth systems |
| Partner career → Gud Game ranking | Forbidden by design |
| Changing only server `.env` for `NEXT_PUBLIC_*` | Rebuild image |
| Running restore on every deploy | Opt-in profile / workflow only |
| Missing migration journal entry | Fix `_journal.json` before deploy |
| UUID insert failures after old restores | Ensure migrations (e.g. UUID defaults) applied |

---

# 18. Reading order & doc index

### Recommended onboarding path (Attentive engineer)

1. **[DEVELOPER-HANDOVER.md](./DEVELOPER-HANDOVER.md)** ← you are here  
2. [architecture.md](./architecture.md)  
3. [SETUP.md](./SETUP.md) → get local running  
4. [USER-MANUAL.md](./USER-MANUAL.md) → learn product behavior  
5. [auth-and-roles.md](./auth-and-roles.md) + [partner-auth.md](./partner-auth.md)  
6. [tournaments.md](./tournaments.md) + skim [tournament-guide.md](./tournament-guide.md)  
7. [data-model.md](./data-model.md) + [api-overview.md](./api-overview.md)  
8. [DEPLOYMENT-VPS.md](./DEPLOYMENT-VPS.md) + [cicd-and-ops.md](./cicd-and-ops.md)  
9. [DATABASE-RESTORE.md](./DATABASE-RESTORE.md) (before any prod restore)  
10. Domain as needed: [payments-and-payouts.md](./payments-and-payouts.md), [partners.md](./partners.md), [wiki-and-content.md](./wiki-and-content.md), [storage-and-media.md](./storage-and-media.md), [tv-display.md](./tv-display.md)

### Full index

See [docs/README.md](./README.md).

### Portfolio / product brief

[overview.md](./overview.md) · [portfolio.md](./portfolio.md) · [features.md](./features.md)

---

## Support contacts (fill during handover)

| Area | Owner at Attentive | Notes |
| --- | --- | --- |
| Application code | _TBD_ | |
| VPS / Docker / Tunnel | _TBD_ | |
| Xendit / finance | _TBD_ | |
| Firebase / Google auth | _TBD_ | |
| DNS / Cloudflare | _TBD_ | |
| Product decisions | _TBD_ | |

---

*© Gud Game — Developer Handover Manual for Attentive IT. Living document: update when architecture, deploy, or domain rules change.*
