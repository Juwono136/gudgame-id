# Partner White-Label

Partners run **branded** tournament sites on Gud Game infrastructure without looking like the Gud Game marketing product. Surfaces show **Powered by Gud Game** where appropriate.

---

## Tenant model

| Concept | Detail |
| --- | --- |
| Partner row | `db/schema/partners.ts` |
| Public site | `/{partnerSlug}/…` |
| Staff console | `/dashboard/partner` (Gud Game login + `partner` role) |
| Member auth | Isolated — [partner-auth.md](./partner-auth.md) |
| Tournament ownership | `tournaments.partner_id` set |
| Leagues | `partner_leagues` + optional `tournaments.partner_league_id` |

Gud Game main-site tournaments keep `partner_id` **NULL**.

---

## Staff vs members

| Actor | Auth system | Can manage tournaments? |
| --- | --- | --- |
| Partner **owner/staff** | Gud Game better-auth (`partner` role) | Yes — dashboard |
| Partner **members/players** | Partner identity cookies | Register/play on partner site |

Staff roles inside a tenant: `owner` | `staff`.

---

## Partner leagues

- Group tournaments by brand/season for **standings**.
- Intentionally lighter than Gud Game official career + TV path.
- Deleting a league clears `partner_league_id` on tournaments (`ON DELETE SET NULL`).

---

## Isolation guarantees (product intent)

1. Partner tournaments are not listed as Gud Game official events.  
2. Partner member sessions do not unlock Gud Game dashboards.  
3. Partner career/stats stay in partner-scoped tables.  
4. Branding/assets are tenant-specific.

Engineering details for auth cookies and Google on partner sites: [partner-auth.md](./partner-auth.md).

---

## Event example

[bestie-cup-guide.md](./bestie-cup-guide.md) documents a real partner double-stage dry-run (Bestie Cup 2026) including seed scripts and H-day ops.

---

## Related

- [tournaments.md](./tournaments.md)
- [auth-and-roles.md](./auth-and-roles.md)
- [data-model.md](./data-model.md)
