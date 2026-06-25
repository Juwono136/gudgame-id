# Shared: Hooks

Last updated: 2026-06-25

Hooks live in `hooks/`. Many are client-side React Query wrappers over route handlers.

| Hook/file | Domain |
| --- | --- |
| `use-auth-mutations.ts` | Login/register/password/auth mutations. |
| `use-session-context.ts` | Client session context. |
| `use-admin-access.ts`, `use-admin-dashboard.ts`, `use-admin-sports.ts`, `use-admin-users.ts` | Admin data and permissions. |
| `use-account-settings.ts` | Account settings forms/data. |
| `use-notifications.ts` | Notification list/count/read mutations. |
| `use-public-tournaments.ts`, `use-public-players.ts`, `use-public-gear.ts` | Public sport-scoped data. |
| `use-wiki-entities.ts`, `use-gear-search.ts`, `use-player-search.ts` | Wiki/search data. |
| `use-tournaments.ts`, `use-host-tournaments.ts`, `use-manage-tournament.ts` | Tournament list/create/edit/manage. |
| `use-tournament-lobby.ts`, `use-tournament-bracket.ts`, `use-tournament-participants.ts` | Tournament runtime state. |
| `use-registration-status.ts`, `use-cancel-registration.ts` | Registration state/actions. |
| `use-host-payments.ts`, `use-host-payout.ts`, `use-player-payments.ts`, `use-payment-invoice-download.ts` | Payment and payout client flows. |
| `use-player-competition.ts` | Player match/tournament history. |
| `use-reclub-session-phase.ts` | Reclub session phase state. |
| `use-dashboard-mobile-nav-active.ts` | Dashboard layout UI state. |
| `use-logout-with-confirm.ts` | Confirmed logout UX. |
| `use-debounce.ts` | Generic debounce helper. |

## Hook Inventory Check

All observed files under `hooks/` are represented above as of this audit. When adding a hook, update this file and any related feature docs.

## Hook Rules

- Prefer preserving query keys and invalidation behavior when editing hooks.
- Keep provider assumptions in mind: hooks need `QueryProvider` and client components.
- Do not call server-only services directly from hooks; use route handlers.

## Needs Verification

- Exact query key structure and invalidation side effects for each hook.
