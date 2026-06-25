# Shared: UI Components

Last updated: 2026-06-25

## UI Primitive Folder

`components/ui` contains local primitives used across feature screens.

| Component | File |
| --- | --- |
| Alert dialog | `components/ui/alert-dialog.tsx` |
| Avatar | `components/ui/avatar.tsx` |
| Badge | `components/ui/badge.tsx` |
| Button | `components/ui/button.tsx` |
| Card | `components/ui/card.tsx` |
| Data table pagination | `components/ui/data-table-pagination.tsx` |
| Datetime picker | `components/ui/datetime-picker.tsx` |
| Dialog | `components/ui/dialog.tsx` |
| Dropdown menu | `components/ui/dropdown-menu.tsx` |
| Input | `components/ui/input.tsx` |
| Label | `components/ui/label.tsx` |
| Loading overlay/spinner | `components/ui/loading-overlay.tsx`, `components/ui/loading-spinner.tsx` |
| Progress | `components/ui/progress.tsx` |
| Select | `components/ui/select.tsx` |
| Skeleton | `components/ui/skeleton.tsx` |
| Sonner toaster | `components/ui/sonner.tsx` |
| Backgrounds | `components/ui/backgrounds/grid-background.tsx` |

## Other Shared UI

| Folder | Purpose |
| --- | --- |
| `components/layout` | Navbar, footer, page shell, user menu, content header. |
| `components/brand` | Logo/wordmark. |
| `components/theme` | Theme controls. |
| `components/motion` | Shared animation helpers. |
| `components/skeletons` | Page-level skeletons. |
| `components/tournaments/form` | Shared tournament form inputs and previews used by creation/edit flows. |
| `components/admin/ui` | Admin loading/stat primitives. |
| `components/admin/form` | Admin-specific form primitives such as limited textarea. |
| `components/dashboard/host/workspace` | Host workspace panel components. |
| `components/dashboard/player/competition` | Player competition list/detail shared pieces. |

## Guidelines

- Reuse local primitives before introducing new UI libraries.
- Check server/client boundary before importing hooks or browser APIs.
- Keep feature-specific UI inside feature folders unless it is broadly reused.

## Needs Verification

- Exact shadcn source/version for each primitive.
