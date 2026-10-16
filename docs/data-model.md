# Data Model Overview

Drizzle schemas live under `db/schema/` (re-exported via `db/schema.ts`). Migrations under `db/migrations/` are applied in production with `npm run db:migrate:prod`.

This page is a **map**, not a full ERD dump.

---

## Domains

```text
Auth & roles          →  user, session, account, verification, user_role_assignments
Sports & wiki         →  sports, wiki entities, scrape hosts, profiles, gear
Tournaments           →  tournaments, registration, matches, groups, courts, invites
Career                →  player_matches, player_tournament_results (+ partner-scoped)
Payments / host money →  tournament payments, host xendit, banks, disbursements
Partners              →  partners, partner auth, partner players, leagues
Platform              →  notifications, host role requests, admin invites, interests
```

---

## Auth & roles

| Table / file | Notes |
| --- | --- |
| `auth.ts` | better-auth core tables |
| `roles.ts` | many-to-many role assignments |
| `partner-auth.ts` | partner member identities & sessions |

See [auth-and-roles.md](./auth-and-roles.md).

---

## Tournaments

| File | Notes |
| --- | --- |
| `tournaments.ts` | header row; `partnerId` / `partnerLeagueId` isolation |
| `tournament-registration.ts` | entries |
| `tournament-payments.ts` | invoices / payment state |
| `tournament-matches.ts` | bracket + reclub/fun match tables |
| `tournament-courts.ts` | courts & scheduling |
| `tournament-invitations.ts` | invites |
| `tournament-archives.ts` | archives |
| `match-score-revisions.ts` | audited score changes |

`partner_id IS NULL` ⇒ Gud Game site. Set ⇒ partner tenant only.

---

## Career isolation

| Scope | Intent |
| --- | --- |
| Gud Game official | Updates global/player career paths used on the main product |
| Partner play | Partner career tables — **not** mixed into Gud Game official rankings |

Implementation: `db/schema/player-competition.ts` and partner player schemas.

---

## Partners & leagues

| File | Notes |
| --- | --- |
| `partners.ts` | tenant + staff membership |
| `partner-players.ts` | guest/member players |
| `partner-leagues.ts` | league headers & standings inputs |

---

## Host money

| File | Notes |
| --- | --- |
| `host-xendit.ts` | XenPlatform linkage |
| `host-bank-accounts.ts` | payout destinations |
| `host-payout-disbursements.ts` | disbursement ledger |

---

## UUID defaults

Some tables rely on application- or migration-provided UUID defaults (e.g. migration `0027_uuid_pk_defaults`). If inserts fail with null PKs after restore, re-run migrations — see [DATABASE-RESTORE.md](./DATABASE-RESTORE.md).

---

## Related

- [architecture.md](./architecture.md)
- [tournaments.md](./tournaments.md)
- [partners.md](./partners.md)
