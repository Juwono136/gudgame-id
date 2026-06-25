# Database Map

Last updated: 2026-06-25

## Database Stack

| Area | File |
| --- | --- |
| Client | `db/client.ts` |
| Exports | `db/index.ts`, `db/schema.ts` |
| Schema modules | `db/schema/*` |
| Migrations | `db/migrations/*` |
| ORM | Drizzle ORM with PostgreSQL |

`getDb()` caches the Drizzle client on `globalThis`. Script mode can use raw `DATABASE_URL`; app mode reads validated server env.

## Tables By Domain

| Domain | Tables |
| --- | --- |
| Auth | `user`, `session`, `account`, `verification` |
| Roles/admin | `userRoleAssignments`, `adminInvitePending` |
| Sports | `sports` |
| Wiki | `wikiEntities`, `wikiEntityRelations`, `wikiEntityMedia`, `wikiScrapeHosts` |
| Legacy/community profile | `playerProfiles`, `equipments` |
| Tournaments | `tournaments` |
| Registration | `tournamentTeams`, `tournamentTeamMembers`, `tournamentRegistrations` |
| Matches/brackets | `tournamentReclubMatches`, `tournamentBracketMatches` |
| Payments | `tournamentPayments`, `platformSettings` |
| Host payment setup | `hostXenditAccounts`, `hostBankAccounts` |
| Host payouts | `hostPayoutDisbursements`, `hostPayoutDisbursementItems` |
| Player history | `playerMatches`, `playerTournamentResults` |
| Notifications | `notifications` |

## Schema Files

| File | Responsibility |
| --- | --- |
| `db/schema/auth.ts` | Better Auth tables plus user extensions. |
| `db/schema/roles.ts` | User role assignments. |
| `db/schema/sports.ts` | Sport catalog and display config. |
| `db/schema/wiki.ts` | Wiki entity core, media, relations. |
| `db/schema/tournaments.ts` | Tournament metadata, schedule, registration configuration. |
| `db/schema/tournament-registration.ts` | Teams, team members, registrations. |
| `db/schema/tournament-matches.ts` | Reclub and bracket match records. |
| `db/schema/tournament-payments.ts` | Tournament payments and platform settings. |
| `db/schema/host-xendit.ts` | Host managed account status. |
| `db/schema/host-bank-accounts.ts` | Host bank account records. |
| `db/schema/host-payout-disbursements.ts` | Payout batch and item tracking. |
| `db/schema/player-competition.ts` | Player match and tournament history. |
| `db/schema/notifications.ts` | User notifications. |
| `db/schema/wiki-scrape-hosts.ts` | Allowed/managed scrape hosts. |
| `db/schema/uuid.ts` | UUID helpers/domain utilities. |

## Migrations Observed

| Migration | Notes |
| --- | --- |
| `0000_confused_madelyne_pryor.sql` | Initial migration. Needs verification. |
| `0001_perpetual_silver_centurion.sql` | Follow-up migration. Needs verification. |
| `0002_host_bank_payout.sql` | Host payout/bank related. |
| `0003_host_bank_accounts.sql` | Host bank accounts. |
| `0004_tournament_uuid_domain.sql` | Tournament UUID domain changes. |
| `0005_platform_uuid_domain.sql` | Platform UUID domain changes. |
| `0006_host_payout_disbursements.sql` | Host payout disbursement tables. |
| `0007_wiki_scrape_hosts.sql` | Wiki scrape host table. |

## High-Risk Data Flows

| Flow | Risk |
| --- | --- |
| Registration payment confirmation | Must keep registration, payment, team, notifications, and provider IDs consistent. |
| Bracket scoring/live updates | Race conditions can corrupt match and leaderboard state. |
| Reclub match completion | Syncs to player competition history and session stats. |
| Host payout job | Moves pending payments into disbursements and external payout state. |
| Wiki entity delete/update | Media and relations cleanup must stay consistent. |
| User role changes | Affects proxy route access and admin/dashboard visibility. |

## Direct Database Access Hotspots

| Hotspot | Notes |
| --- | --- |
| `lib/tournaments/registration/service.ts` | Registration, team, invoice/payment state writes. |
| `lib/tournaments/brackets/*` | Bracket generation, slot assignment, live score and final score writes. |
| `lib/tournaments/reclub/*` | Reclub match/session/team writes and history sync. |
| `lib/payments/host-payout/disbursement/*` | Payout candidate queries, batch creation, processor, webhook updates. |
| `lib/wiki/service.ts` | Wiki entity CRUD, relations, media. |
| `lib/sports/service.ts` | Sport CRUD/reorder and default sport behavior. |
| `lib/admin/users/service.ts` | Admin user CRUD/role-related behavior. |
| `app/api/**/route.ts` direct DB usage | Some route handlers perform DB lookups/checks directly; see `50_API_MAP.md`. |
| Selected pages direct DB usage | `app/dashboard/host/page.tsx`, `app/dashboard/complete-profile/page.tsx`, `app/auth/change-password/page.tsx`. |

## Recommended Database Tests

| Area | Tests |
| --- | --- |
| Schema/service constraints | Duplicate slugs, invalid sport IDs, delete restrictions. |
| Payment state transitions | Pending -> paid/failed/expired idempotency. |
| Payout disbursements | Batch creation, partial failure, webhook update. |
| Tournament lifecycle | Register/join/leave, team deletion, bracket generation. |
| Auth roles | Role assignment sync and default player role creation. |

## Needs Verification

- Exact table columns and indexes were not exhaustively documented here.
- Migration order/status in deployed environments.
- Whether legacy `playerProfiles` and `equipments` remain active or compatibility tables.
