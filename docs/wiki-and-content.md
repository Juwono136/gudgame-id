# Wiki & Content

Gud Game includes a sports encyclopedia (wiki) alongside tournaments — players, teams, gear, and rules under each sport hub.

---

## Public surfaces

| Content | Path pattern |
| --- | --- |
| Sport hub | `/sports/[sportSlug]` |
| Players | `/sports/[sportSlug]/players/[slug]` |
| Teams | `/sports/[sportSlug]/teams/[slug]` |
| Gear | `/sports/[sportSlug]/gear/[slug]` |
| Rules | `/sports/[sportSlug]/rules` |
| Search | `/search` |

Default sport slug: **`padel`** (`lib/config/site.ts`).

---

## Data model (high level)

| Area | Schema |
| --- | --- |
| Sports | `db/schema/sports.ts` |
| Wiki entities | `db/schema/wiki.ts` |
| Scrape allowlist | `db/schema/wiki-scrape-hosts.ts` |
| Domain logic | `lib/wiki/` |
| Global search | `lib/wiki/global-search.ts` |

Entities typically support draft/publish workflows moderated from the Master Console (`/admin/wiki-entities`).

---

## Scrape imports & SSRF safety

Admins may import content from allowlisted hosts only. Configure:

```bash
WIKI_SCRAPE_ALLOWED_HOSTS=example.com,www.example.com
```

Do not widen the allowlist to arbitrary hosts in production.

---

## Platform CMS

Super admins manage homepage / legal / platform settings via `/admin/settings` and related APIs. Public pages such as `/about`, `/privacy`, `/terms` consume that content where wired.

---

## Media

Cover images and entity media use the object storage pipeline — see [storage-and-media.md](./storage-and-media.md).

---

## Host contribution note

Role description for `host` includes wiki editing with moderation. Super admins retain full control. Exact permission checks live in role guards and admin APIs.

---

## Related

- [features.md](./features.md)
- [auth-and-roles.md](./auth-and-roles.md)
- [data-model.md](./data-model.md)
