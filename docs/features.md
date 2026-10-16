# Feature Catalog

Capabilities shipping in Gud Game, grouped by product domain. Paths are illustrative entry points in the codebase or UI.

---

## Sport hub & discovery

| Feature | Description | Entry |
| --- | --- | --- |
| Sport hubs | Per-sport landing for wiki + tournaments | `/sports/[sportSlug]` |
| Players / teams / gear | Encyclopedia entities with detail pages | `/sports/.../players`, `teams`, `gear` |
| Rules | Sport rules content | `/sports/.../rules` |
| Global search | Cross-entity search | `/search`, `lib/wiki/global-search.ts` |
| News / community | Editorial & community surfaces | `/news`, `/community` |
| Public player directory | Browse players | `/players` |

---

## Accounts & workspaces

| Feature | Description | Entry |
| --- | --- | --- |
| Email/password auth | Register, verify, reset | `/register`, `/login`, `/forgot-password` |
| Google sign-in | Firebase → better-auth plugin | `lib/auth/plugins/firebase-google.ts` |
| Player dashboard | Profile, matches, payments, settings | `/dashboard` |
| Complete profile | Onboarding / sport interests | `/dashboard/complete-profile` |
| Host workspace | Create & manage tournaments, payouts | `/dashboard/host` |
| Partner workspace | White-label staff console | `/dashboard/partner` |
| Master Console | Super-admin platform control | `/admin` |
| Host role requests | Players request host; admin approves | `/admin/host-requests` |
| Notifications | In-app notification APIs | `app/api/notifications` |

Roles detail: [auth-and-roles.md](./auth-and-roles.md).

---

## Tournaments

| Feature | Description |
| --- | --- |
| Official tournaments | Ranked; billing `paid` or `free` |
| Fun Match | Unranked community / reclub-style sessions |
| Formats | americano, single elim, double stage, mexicano, group_only, swiss, modified swiss, double elim, round robin, groups, open play |
| Registration | Open/close windows, invites, roster claim |
| Brackets | Generate, start, reset, rematch |
| Double-stage / pools | Pool stage → knockout (e.g. Bestie Cup) |
| Live scoring | Manage UI + polling payloads |
| Score revisions | Audited overrides |
| Courts & order of play | Multi-court scheduling |
| Archives | Completed tournament archives |
| Partner tournaments | Same engine, tenant-scoped |

Deep dive: [tournaments.md](./tournaments.md) · Ops: [tournament-guide.md](./tournament-guide.md).

---

## TV / venue display

| Feature | Description |
| --- | --- |
| Display routes | Public TV boards for Gud Game & partner events |
| Multi-court live | Score boards suitable for venue screens |
| Schedule / bracket slides | Rotating views for spectators |
| Sponsor-friendly layouts | Minimal chrome for full-bleed TVs |

See [tv-display.md](./tv-display.md).

---

## Payments & payouts

| Feature | Description |
| --- | --- |
| Registration checkout | Xendit invoice flow |
| Webhooks | Payment status reconciliation |
| Host XenPlatform | Split / connected account support |
| Bank accounts | Host payout destinations |
| Automated disbursements | Cron-driven host payouts |
| Staging mode | Safer payment testing flags |

See [payments-and-payouts.md](./payments-and-payouts.md).

---

## Partner white-label

| Feature | Description |
| --- | --- |
| Branded sites | `/{partnerSlug}` home, tournaments, account |
| Staff roles | `owner` / `staff` inside tenant |
| Isolated member auth | Separate cookies & identity tables |
| Guest registration | Partner player onboarding |
| Partner career | Stats scoped to the partner |
| Leagues | Season/brand grouping + standings |
| Isolation | Not mixed into Gud Game official rankings |

See [partners.md](./partners.md) · [partner-auth.md](./partner-auth.md).

---

## Wiki & content ops

| Feature | Description |
| --- | --- |
| Wiki entities | Players, teams, gear (draft/publish) |
| Scrape import | Allowlisted hosts only (SSRF-safe) |
| Sports admin | Create/manage sports |
| Platform CMS | Homepage / legal / settings content |
| Media uploads | Covers, avatars via object storage |

See [wiki-and-content.md](./wiki-and-content.md) · [storage-and-media.md](./storage-and-media.md).

---

## Platform & reliability

| Feature | Description |
| --- | --- |
| Infra health | `/api/health` + `npm run infra:check` |
| Env validation | Zod + `validate:env` |
| Timed-match cron | Hard-stop long Fun Match sessions |
| Docker full stack | Postgres, Redis, SeaweedFS, pgAdmin, cron |
| CI/CD | Build, migrate, deploy on self-hosted runner |
| DB restore profile | Opt-in production dump restore |

See [cicd-and-ops.md](./cicd-and-ops.md).

---

## Event playbooks

| Playbook | Purpose |
| --- | --- |
| [bestie-cup-guide.md](./bestie-cup-guide.md) | Partner double-stage dry-run & match day |
| [tournament-guide.md](./tournament-guide.md) | General Indonesian tournament ops |
