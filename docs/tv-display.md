# TV / Venue Display Mode

Gud Game includes a **display** surface intended for large screens at venues — live courts, schedules, and bracket views with minimal chrome.

---

## Where it lives

| Surface | Typical path |
| --- | --- |
| Gud Game tournament | `/sports/[sportSlug]/tournaments/[slug]/display` |
| Partner tournament | `/[partnerSlug]/tournaments/[slug]/display` |
| UI components | `components/tournaments/display/*` |
| Route helpers | `lib/constants/routes.ts` |

Manage UIs control what the display shows; the display route itself is optimized for spectators / TVs (often left open all day).

---

## What operators care about

1. **One job:** show the current match-day state clearly from across the venue.  
2. **Multi-court:** several courts can appear with live scores.  
3. **Rotation:** schedule / bracket / sponsor-friendly slides where configured.  
4. **Polling:** clients refresh from live APIs — keep the manage tablet and TV on a stable network.  
5. **Fullscreen:** use the browser fullscreen API / kiosk mode on the TV device.

---

## Recommended match-day setup

1. Complete registration & generate bracket/groups in **Manage**.  
2. Assign courts / order of play.  
3. On the TV machine, open the **display** URL for that tournament.  
4. Enter fullscreen; disable screensaver / sleep.  
5. Score only from the **manage** device — do not treat the TV as an input surface.  
6. If the board looks stale, check network + that the tournament status is `live`.

Ops context: [tournament-guide.md](./tournament-guide.md) (display section).

---

## Product constraints

- Partner leagues intentionally **do not** drive the same TV/career path as Gud Game official tournaments.
- Display is tenant-aware: partner tournaments use partner URLs and branding.

---

## Related

- [tournaments.md](./tournaments.md)
- [bestie-cup-guide.md](./bestie-cup-guide.md)
