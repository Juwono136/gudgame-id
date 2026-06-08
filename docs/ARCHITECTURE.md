# Court Pedia — Architecture Overview

## Code layout

```
app/              → Pages & API routes (thin handlers)
components/       → Presentational & layout UI
db/               → Schema, migrations, DB client (server-only)
lib/
  config/         → Zod env (client + server), site metadata
  server/         → Server-only cross-cutting (health access)
  storage/        → Filer + S3 storage adapters
  health/         → Infra health aggregation
  api/            → JSON response helpers
  errors.ts       → AppError taxonomy
  logger.ts       → Structured JSON logging
scripts/          → CLI utilities (no runtime import from app)
```

**Rules:** API routes stay thin; business logic lives in `lib/` or future `services/`. Never import `lib/config/env.server` or `db/` from client components.

## Vision

Court Pedia is a **Liquipedia-style, community-driven sports platform** starting with **padel (MVP)**, expandable to tennis, badminton, billiard, and more. Reference products:

- [Alfred for Padel](https://www.alfredforpadel.com/) — tournaments, brackets, live scores
- [Liquipedia](https://liquipedia.net/) — wiki content, schedules, multi-title structure
- [PadelPedia](https://www.padelpedia.net/) — padel-focused data UX

## Multi-sport model

Every domain entity is scoped by `sport_id` → `sports` table (`slug`: `padel`, `tennis`, …). MVP seeds only `padel`; new sports are additive without schema rewrites.

## User roles (proposed)

| Role | Purpose |
|------|---------|
| **viewer** | Read-only; schedules, news, profiles |
| **player** | Linked `player_profiles`; join clubs, register for events, matchmaking by tier |
| **editor** | Wiki-style edits (pending moderation) |
| **admin** | Moderation, verification, monetized tournaments |

### Player role mechanics

1. **Profile binding** — `users.role = 'player'` + `player_profiles` per sport (tier, stats, `is_pro_verified`).
2. **Skill tiers** — Bronze / Silver / Gold (client MVP); optional sub-tiers later.
3. **Pro verification** — Admin verifies podium/history; `is_pro_verified` gates pro-only lobbies and rated events.
4. **Matchmaking** — Filters by tier ±1 band; pro events require verified pros (see Alfred category splits).
5. **Clubs (ReClub-like)** — Teams with captain, roster, sport; open/recruit or invite-only; club tournaments.
6. **Paid hosted tournaments** — Organizer pays listing fee → bracket tools, public page, live scores.

## Infrastructure (phase 1)

| Service | Purpose |
|---------|---------|
| **PostgreSQL** | Primary data (Drizzle ORM) |
| **Redis** | Cache, sessions, rate limits, live score pub/sub |
| **SeaweedFS** | Media (avatars, gallery, equipment images) via S3 API |

### Health & ops

- `GET /api/health` — JSON status for all services
- `npm run infra:check` — CLI health for CI/local
- Structured JSON logs via `lib/logger.ts`

## Next implementation phases

1. Better Auth + Firebase Google OAuth
2. Wiki revision tables + moderation queue
3. Tournaments, matches, live score workers
4. Club CRUD + discovery
5. Payment integration for hosted tournaments
6. PWA service worker (offline shell, add-to-home-screen)
