# Gud Game — Portfolio Brief

A concise narrative for recruiters, collaborators, and reviewers. For full depth, use the [documentation hub](./README.md).

---

## One-liner

**Gud Game** is a production-oriented court-sports platform (padel-first) that combines tournaments with live ops, TV venue displays, a sports wiki, partner white-label tenants, and Xendit payments — shipped as a Dockerized Next.js stack.

---

## Why it is interesting as a portfolio piece

| Theme | What you can point to |
| --- | --- |
| **Full-stack product** | Real user roles (player / host / partner / admin), not a single CRUD demo |
| **Domain complexity** | Brackets, double-stage pools, live scoring, Fun Match timers, career isolation |
| **Multi-tenancy** | Partner white-label with **separate member auth** and data boundaries |
| **Money path** | Invoices, webhooks, XenPlatform, cron disbursements |
| **Ops maturity** | Compose stack, CI migrate, health checks, PG18 restore runbooks, Tunnel deploy |
| **UX for venues** | Dedicated TV/display mode for match days |

---

## Stack (production)

- **Frontend / BFF:** Next.js 16 (App Router), React 19, TypeScript, Tailwind 4, shadcn/ui  
- **Data:** PostgreSQL 18, Drizzle ORM, Redis  
- **Auth:** better-auth + Firebase Google  
- **Payments:** Xendit (+ XenPlatform)  
- **Storage:** SeaweedFS + nginx gateway  
- **Deploy:** Docker Compose on VPS, GitHub Actions (self-hosted), Cloudflare Tunnel  
- **Domains:** `gudgame.id`, `storage.gudgame.id`

---

## Architecture in one paragraph

Browsers reach the Next.js app through Cloudflare Tunnel on Docker network `tunnel`. The app talks to Postgres and Redis by Docker DNS, stores media via an authenticated storage gateway in front of SeaweedFS, and runs payout / timed-match jobs from a small Alpine cron sidecar. Partner tenants reuse the tournament engine but isolate membership and career data from the Gud Game main site.

Diagram and service table: [architecture.md](./architecture.md).

---

## Feature highlights to demo

1. **Official tournament lifecycle** — create → register/pay → generate bracket → live score → complete.  
2. **TV display** — open `/sports/padel/tournaments/[slug]/display` (or partner equivalent) on a large screen.  
3. **Fun Match** — unranked timed sessions with hard-stop cron.  
4. **Partner white-label** — `/{partnerSlug}` branded flow + isolated login.  
5. **Master Console** — sports, wiki entities, host requests, platform settings.  
6. **Wiki / search** — encyclopedia entities under `/sports/padel/…`.

Feature list: [features.md](./features.md).

---

## Engineering practices worth mentioning

- Zod-validated environment configuration  
- SQL migrations in CI (`db:migrate:prod`), not ad-hoc schema push  
- Role-aware request proxy (`proxy.ts`)  
- Vitest coverage on critical `lib/` modules  
- Documented restore path for custom PostgreSQL dumps (PG18)  
- Secrets via GitHub Actions — never baked into images  

---

## Suggested reading order for reviewers

1. [overview.md](./overview.md)  
2. This page  
3. [architecture.md](./architecture.md)  
4. [features.md](./features.md)  
5. One deep dive: [tournaments.md](./tournaments.md) or [partners.md](./partners.md)  
6. Ops proof: [DEPLOYMENT-VPS.md](./DEPLOYMENT-VPS.md)  

---

## Naming clarity

Public product: **Gud Game**. Production database: **`gudgame_db`**. Repository folder may still be `court-pedia` locally — that is legacy path naming only.
