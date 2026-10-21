# Gud Game — Documentation

**Gud Game** is a court-sports platform (padel-first MVP): tournaments with live scoring, TV venue displays, player careers, a sports wiki, partner white-label tenants, and Xendit-powered payments — deployed as a Docker stack on a VPS behind Cloudflare Tunnel.

This folder is the **single source of truth** for product understanding, engineering, and operations. It is written so a recruiter, collaborator, or operator can learn the system without reading the full codebase.

| | |
| --- | --- |
| **Product** | Gud Game |
| **Package** | `gud-game` |
| **Production DB** | `gudgame_db` |
| **Domains** | [gudgame.id](https://gudgame.id) · storage.gudgame.id |
| **Repo folder** | `court-pedia` (legacy local name — product is Gud Game) |

---

## Start here

| Audience | Read first |
| --- | --- |
| **End users (players / hosts / partners)** | **[USER-MANUAL.md](./USER-MANUAL.md)** |
| **Developers / Gud Game handover** | **[DEVELOPER-HANDOVER.md](./DEVELOPER-HANDOVER.md)** |
| **Portfolio / product overview** | [overview.md](./overview.md) → [portfolio.md](./portfolio.md) → [features.md](./features.md) |
| **Engineers (deep dives)** | [architecture.md](./architecture.md) → [SETUP.md](./SETUP.md) → [data-model.md](./data-model.md) |
| **Operators / deploy** | [cicd-and-ops.md](./cicd-and-ops.md) → [DEPLOYMENT-VPS.md](./DEPLOYMENT-VPS.md) |
| **Tournament day ops** | [tournament-guide.md](./tournament-guide.md) → [tv-display.md](./tv-display.md) |
| **Partner tenants** | [partners.md](./partners.md) → [partner-auth.md](./partner-auth.md) |

---

## Documentation map

### Product & portfolio

| Document | Description |
| --- | --- |
| **[LICENSE.md](./LICENSE.md)** | **Proprietary license pointer (all rights reserved)** |
| **[USER-MANUAL.md](./USER-MANUAL.md)** | **Complete end-user manual (English)** |
| **[DEVELOPER-HANDOVER.md](./DEVELOPER-HANDOVER.md)** | **Developer handover manual for Gud Game (English)** |
| [overview.md](./overview.md) | Vision, naming, who the product serves |
| [features.md](./features.md) | Feature catalog by domain |
| [portfolio.md](./portfolio.md) | Portfolio-oriented summary (stack, highlights, demo paths) |
| [architecture.md](./architecture.md) | System design, services, request flows |

### Getting started & data

| Document | Description |
| --- | --- |
| [SETUP.md](./SETUP.md) | Local development, env, seed, scripts |
| [data-model.md](./data-model.md) | Schema map, Gud Game vs partner data isolation |
| [api-overview.md](./api-overview.md) | API surface grouped by domain |

### Core domains

| Document | Description |
| --- | --- |
| [auth-and-roles.md](./auth-and-roles.md) | Better Auth, Firebase Google, roles, proxy gates |
| [tournaments.md](./tournaments.md) | Formats, brackets, live scoring, Fun Match vs Official |
| [tv-display.md](./tv-display.md) | Venue TV / display mode |
| [payments-and-payouts.md](./payments-and-payouts.md) | Xendit invoices, XenPlatform, host payouts |
| [wiki-and-content.md](./wiki-and-content.md) | Encyclopedia, scrape allowlist, search |
| [partners.md](./partners.md) | White-label tenants, leagues, isolation |
| [storage-and-media.md](./storage-and-media.md) | SeaweedFS, gateway, media URLs |

### Operations (runbooks)

| Document | Description |
| --- | --- |
| [cicd-and-ops.md](./cicd-and-ops.md) | CI/CD pipeline, health, cron, secrets overview |
| [DEPLOYMENT-VPS.md](./DEPLOYMENT-VPS.md) | Full VPS + Docker Compose + Cloudflare Tunnel |
| [DATABASE-RESTORE.md](./DATABASE-RESTORE.md) | Restore dump → `gudgame_db` (PG18, CLI + pgAdmin) |
| [tournament-guide.md](./tournament-guide.md) | Indonesian ops manual (Official / Fun Match / partner) |
| [partner-auth.md](./partner-auth.md) | Partner member auth isolation |
| [bestie-cup-guide.md](./bestie-cup-guide.md) | Bestie Cup 2026 dry-run & H-day playbook |

---

## Naming conventions

| Term | Meaning |
| --- | --- |
| **Gud Game** | Public product / brand |
| **gudgame** | Docker project prefix, storage bucket (prod), theme key |
| **gudgame_db** | Production PostgreSQL database |
| **court-pedia** | Local repository folder name only |
| **tanding_db** | Legacy name inside some database dumps (restored into `gudgame_db`) |

---

## Contributing to docs

- Prefer **English** for architecture and portfolio pages; keep event/ops playbooks in the language operators use.
- Link to code with repo-relative paths (`lib/auth/server.ts`).
- Do not commit secrets, dump files, or real `.env` values.
- When a feature lands, update [features.md](./features.md) and the relevant domain doc in the same PR when practical.
