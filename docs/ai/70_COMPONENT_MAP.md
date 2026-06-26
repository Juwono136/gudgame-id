# Component Map

Last updated: 2026-06-25

## Component Organization

| Folder | Responsibility |
| --- | --- |
| `components/ui` | Local UI primitives: button, dialog, card, input, select, badge, skeleton, alert-dialog, etc. |
| `components/layout` | Public layout/navigation/footer/user menu/content header. |
| `components/auth` | Login, register, reset/forgot password, auth shell, password input, Google sign-in, photo upload. |
| `components/dashboard` | Dashboard shell, navigation, quick links, welcome/profile completion, host/player subfolders. |
| `components/dashboard/host/workspace` | Host workspace panels for official registrations and Reclub lobby. |
| `components/dashboard/player/competition` | Player match/tournament history lists, pagination, summary cards, detail dialog. |
| `components/admin` | Admin shell, dashboard, sports, users, wiki management, settings. |
| `components/admin/layout` | Admin shell, sidebar, navbar, breadcrumbs, sport selector, role badge. |
| `components/admin/dashboard` | Admin overview cards/charts/range filters/recent activity. |
| `components/tournaments` | Public/detail tournament UI, official and Reclub flows, forms, bracket/live score. |
| `components/tournaments/form` | Tournament form fields for cover, gear, venue maps/autocomplete, currency, review blocks. |
| `components/tournaments/reclub` | Reclub wizard, stepper, review, squad create/name editor, session status. |
| `components/wiki` | Public wiki detail/listing components for players, gear, entities. |
| `components/wiki/player` | Player detail layout, hero, stats, matches, share/sidebar cards. |
| `components/payments` | Payment invoice/receipt/ledger UI. |
| `components/settings` | Account/player/staff settings forms. |
| `components/notifications` | Notification bell. |
| `components/sports` | Sport hub and public tournament directory components. |
| `components/theme` | Theme toggle/settings card. |
| `components/motion` | Motion helpers. |
| `components/skeletons` | Shared skeleton screens. |
| `components/sections` | Marketing/public content sections. |

## Provider Stack

`app/layout.tsx` -> `AppProviders` -> `ThemeProvider` -> `QueryProvider` -> `ConfirmDialogProvider` -> `DashboardLayoutClient` -> page content, plus global `Toaster`.

See `docs/ai/shared/providers.md`.

## Client Hooks

Hooks are in `hooks/` and mostly wrap API calls with React Query for auth mutations, admin data, tournaments, host/player dashboards, notifications, public wiki/tournament data, and debounce/session helpers.

See `docs/ai/shared/hooks.md`.

## Stores

Only `stores/auth-ui-store.ts` was observed. It uses Zustand for auth UI state. See `docs/ai/shared/stores.md`.

## High-Risk Components

| Component/folder | Risk |
| --- | --- |
| `components/tournaments/*` | Large stateful flows for registration, live scoring, bracket/reclub behavior. |
| `components/tournaments/official-scoring-staff-panel.tsx` | Owner-only public bracket staff delegation UI; controls who can manage official bracket scoring from the public page. |
| `components/admin/wiki/wiki-entity-wizard.tsx` | Complex admin form and entity-type branching. |
| `components/admin/tournaments/tournament-create-wizard.tsx` | Multi-step creation/edit flow. |
| `components/tournaments/reclub/reclub-tournament-wizard.tsx` | Reclub-specific create flow. |
| `components/dashboard/dashboard-nav.tsx` | Role-sensitive navigation and responsive behavior. |
| `components/dashboard/host/host-payout-*` | Payment/payout state and bank account mutation UI. |
| `components/settings/player-equipment-editor.tsx` | Player gear linkage to wiki catalog. |
| `components/admin/wiki/scrape-hosts-manager.tsx` | Controls scraper host allowlist that gates remote fetches. |
| `components/tournaments/registration-checkout-client.tsx` | Payment polling and checkout state. |
| `components/tournaments/official-registration-wizard.tsx` | Multi-step official registration and team data. |
| `components/dashboard/player/competition/*` | Player-facing history must match stats/payment registration state. |

## Recommended UI Tests

| Area | Tests |
| --- | --- |
| Auth forms | Validation, disabled/loading states, error display. |
| Tournament wizards | Step transitions, required fields, media preview cleanup. |
| Registration checkout | Payment method selection, polling states, retry/failure UI. |
| Admin tables/dialogs | CRUD happy paths, permission failure display. |
| Dashboard nav | Role-specific links and mobile behavior. |

## Needs Verification

- Exact server/client status for every component.
- Whether all local UI primitives are shadcn-compatible or manually adapted.
