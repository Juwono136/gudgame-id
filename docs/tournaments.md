# Tournaments — Architecture

How competition works in Gud Game. Day-of operator steps (Indonesian): [tournament-guide.md](./tournament-guide.md).

---

## Tournament types

| Type | Ranking | Billing | Notes |
| --- | --- | --- | --- |
| **official** | Yes (Gud Game career) | `paid` or `free` | Main competitive path |
| **fun_match** | No | Typically free / session-based | Community / reclub-style; timed scoring |

Legacy DB/API value `recreational` maps to `fun_match`.

Partner tournaments reuse the same engine with `tournaments.partner_id` set — career writes stay partner-scoped.

---

## Lifecycle statuses

`draft` → `upcoming` → `live` → `completed` (or `cancelled`)

Registration windows use `registrationOpensAt` / `registrationClosesAt`. Event window uses `startsAt` / `endsAt`.

---

## Formats

From `TOURNAMENT_FORMATS` in `db/schema/tournaments.ts`:

| Format | Typical use |
| --- | --- |
| `americano` | Rotating partners / social competitive |
| `mexicano` | Social ladder-style |
| `single_elimination` | Classic knockout |
| `double_elimination` | Losers bracket |
| `double_stage` | Groups/pools → knockout (e.g. Bestie Cup) |
| `group_only` / `groups` | Pool play without full knockout path |
| `swiss` / `modified_swiss` | Pairing by record |
| `round_robin` | Everyone plays everyone |
| `open_play` | Loose open sessions |

Double-stage / Bestie Cup playbook: [bestie-cup-guide.md](./bestie-cup-guide.md).

---

## Core modules

| Concern | Code area |
| --- | --- |
| Schema | `db/schema/tournaments.ts`, `tournament-*.ts` |
| Bracket engine | `lib/tournaments/brackets/` |
| Double-stage | `lib/tournaments/double-stage/` |
| Live payloads / polling | `lib/tournaments/live/` |
| Fun Match / reclub | `lib/tournaments/reclub/` |
| Manage APIs | `app/api/tournaments/**/manage/**` |
| Public pages | `app/sports/[sportSlug]/tournaments/...` |
| Partner pages | `app/[partnerSlug]/tournaments/...` |

---

## Match-day building blocks

1. **Registration & roster** — entries, invites, claim links  
2. **Courts** — physical courts + order of play  
3. **Bracket / groups** — generate, start, reset, rematch  
4. **Live scoring** — manage UI writes; clients poll live endpoints  
5. **Score revisions** — audited overrides (`match-score-revisions`)  
6. **TV display** — spectator boards ([tv-display.md](./tv-display.md))  
7. **Completion** — results → career tables (official / partner rules)  
8. **Archives** — historical snapshots when configured  

---

## Fun Match specifics

- Uses reclub/timed match tables rather than full ranked bracket semantics.
- **Timed-match cron** (`/api/cron/timed-matches`) hard-stops sessions that overrun.
- Designed for venue community play without polluting official rankings.

---

## Payments touchpoint

Paid official events create Xendit invoices during checkout. Payment state gates registration confirmation. See [payments-and-payouts.md](./payments-and-payouts.md).

---

## QA seeds

| Script | Purpose |
| --- | --- |
| `npm run db:seed:fixtures` | Official tournament fixtures |
| `npm run db:seed:double-stage` | 32-player double-stage sample |
| `npm run db:seed:partner-bestie-cup` | Partner Bestie Cup dry-run |

Use purge scripts only on disposable databases.

---

## Related

- [tv-display.md](./tv-display.md)
- [features.md](./features.md)
- [data-model.md](./data-model.md)
