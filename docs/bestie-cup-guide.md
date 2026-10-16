# Bestie Cup 2026 — Partner Tournament Manual

> **Docs hub:** [README.md](./README.md) · Partners: [partners.md](./partners.md) · Tournaments: [tournaments.md](./tournaments.md) · TV: [tv-display.md](./tv-display.md)

Official reference: [`Panduan Dan Rundown Bestie Cup 2026.pdf`](./Panduan%20Dan%20Rundown%20Bestie%20Cup%202026.pdf)

This guide describes how to run the full **Bestie Cup** event on Gud Game Partner (Spinderellas white-label).

---

## Staging / dev dry-run (before H-day)

Use this checklist on **localhost** or **staging** with real UI flows. Seed data first so you can test without manual registration of 48 pairs.

### 1. Provision database & partner access

- [ ] PostgreSQL + Redis running (`DATABASE_URL`, `REDIS_URL` in `.env`) — production VPS: see `docs/DEPLOYMENT-VPS.md` (Docker network `tunnel`)
- [ ] `npm run db:seed` (sports baseline)
- [ ] Partner tenant exists (e.g. `spark-area`) and your account is **partner owner/staff**
- [ ] Dev server: `npm run dev`

### 2. Seed dry-run tournament (48 confirmed pairs, **upcoming**)

**Local development only** — script refused in production/CI. Deploy pipeline purges slug `dev-bestie-cup-2026` automatically. Dummy players use `*@bestie-fixture.local` and **never receive registration emails**.

```bash
npm run db:seed:partner-bestie-cup -- --name YOUR_PARTNER_EMAIL --partner-slug spark-area
```

Setiap seed (create / `--reset`) memakai **start ≈ +14 hari** dari waktu generate — bukan tanggal kalender tetap — sehingga status default selalu **Upcoming**. Fixture yang sudah ada tanpa `--reset` tidak diubah; pakai `--reset` untuk recreate dengan jadwal baru.

Optional flags:

| Flag | Purpose |
| --- | --- |
| `--reset` | Remove previous fixture, then recreate |
| `--go-live` | After seed, set status **Live** (skip manual go-live step) |
| `--slug dev-bestie-cup-2026` | Custom slug (default) |

**What the seed creates**

| Item | Value |
| --- | --- |
| Tournament | `Bestie Cup 2026 · Dry Run` · slug `dev-bestie-cup-2026` |
| Status | **Upcoming** (start ≈ **+14 days** from seed time; unless `--go-live`) |
| Schedule | Relative each run — not a fixed calendar day (so status stays upcoming) |
| Format | Double Stage · `poolRules: bestie_cup` · race-to-6 games |
| Teams | **48 confirmed pairs** (partner registrations → roster teams) |
| Pool A names | From PDF examples: Sinta/Eka, Arin/Indri, Voni/Septi |
| Other pools | Synthetic pairs · 16 pools × 3 structure |
| Fixture emails | `bc2026-p001-c@bestie-fixture.local` … (dev-only domain, **no SMTP**) |

Purge when done:

```bash
npm run db:seed:partner-bestie-cup:purge
npm run db:seed:partner-bestie-cup:purge -- --players   # also remove fixture partner_players
```

Script sources: `scripts/seed-partner-bestie-cup.ts`, `lib/dev/partner-bestie-cup-fixture.ts`

### 3. Dry-run walkthrough (check each box)

#### A — Verify seeded event

- [ ] Open partner **Manage** URL printed by the seed script (`/{partnerSlug}/tournaments/dev-bestie-cup-2026/manage`)
- [ ] Public page shows **Upcoming** and **48 / 48** teams (or capacity full)
- [ ] Settings: Double Stage, 5 courts, 3 per pool, advance 1, no 3rd place, `poolRules: bestie_cup`
- [ ] Registrations tab: 48 rows **Confirmed** (not pending payment)

#### B — Go live & groups

- [ ] Set tournament status **Live** (Edit → status, or re-seed with `--go-live`)
- [ ] Manage → **Groups** tab → **Sync / Assign** → exactly **16 groups × 3 teams**
- [ ] Group labels A–P (or Group A … Group P)
- [ ] **3 round-robin matches** scheduled per pool (48 pool matches total)

#### C — Pool scoring (Bestie rules)

Pick one pool (e.g. Group A) and score all 3 matches:

- [ ] Live scoreboard shows **games** (not classic sets)
- [ ] First to **6** games · Golden Point at deuce
- [ ] At **5–5** → deciding game → winner **6–5**
- [ ] **Side change + 1 min rest** prompt at odd total games (from game 3)
- [ ] Standings show **W** and **GW%** columns
- [ ] Test **WO 6–0** on one match → GW% updates correctly

**GW% tie test (optional):** In a 3-team pool, force 1-1-1 wins with different game totals; verify rank order follows **Game Win %** (see PDF §5 example).

#### D — Knockout

- [ ] After **all** pool matches complete → **Generate knockout**
- [ ] R16 pairings fixed: **A–I, B–J, C–K, D–L, E–M, F–N, G–O, H–P**
- [ ] Score R16/QF: at **5–5** → **match tiebreak to 7**
- [ ] Score SF/Final: **win by 2** · at **6–6** → match tiebreak to 7
- [ ] No 3rd-place match
- [ ] Public **Bracket** + **Groups** tabs update in real time (live poll)

#### E — Display & ops

- [ ] Court display URL loads (`…/display`)
- [ ] Copy layout URLs from Manage → Display: `single`, `multi_court`, `group_stage`, `leaderboard`, `bracket`, plus public `?tab=Matches` schedule
  - Bracket TV (`layout=bracket`) auto-fits the full tree to the monitor (no pan required). Feeder winners land in the correct next-round slot (odd match → top, even → bottom).
- [ ] `group_stage` layout shows **pool standings** in a **responsive pool carousel** (1–4 pools per slide by monitor size; all teams visible per pool); public/manage Groups tab hides player avatars on **mobile** so names are not truncated
- [ ] `match_schedule` layout uses **3 equal full-width columns** (Now/Next/Later) + horizontal **Done** strip; cards-per-slide **adapt to monitor size** (not fixed 5); partner logo in in-flow chrome
- [ ] Scorekeeper label on TV/manage uses staff **full name** (Manage → Invites), not account nickname
- [ ] TV shows **40–40 deuce** label and per-side **15/30/40** milestones during live games
- [ ] Completed pool fixtures show **Done/Finished** on Order of Play (not Queued)
- [ ] Special result dialog (WO / RET) from match card
- [ ] Manual pool tie badge visible when GW% cannot break a tie

#### F — Reset for next rehearsal

```bash
npm run db:seed:partner-bestie-cup:purge -- --players
npm run db:seed:partner-bestie-cup -- --name YOUR_EMAIL --reset
```

---

## Quick start (H-day)

1. **Create tournament** → Partner wizard → **Double Stage** (Original) → tap **Apply preset** (Bestie Cup 2026).
2. Confirm: **48 pairs**, **3 per pool**, **advance 1**, **5 courts**, **no 3rd place**, `poolRules: bestie_cup`.
3. Open registration → collect **48 confirmed pairs**.
4. Set status **Live** → open **Groups** tab → **Sync/Assign** (16 pools × 3).
5. **Live scoring** pool matches (First to 6, Golden Point, rest at odd game totals).
6. When all pool matches finish → **Generate knockout** (fixed R16: A–I … H–P).
7. Score knockout rounds (R16/QF vs SF/Final rules differ — see below).
8. Publish results on **Groups** + **Bracket** tabs (real-time via live poll).

**Pool-only test** (no knockout): use **Modified Swiss** (Custom) — same pool rules, auto-applied.

---

## Capacity & structure

| Setting | Value |
| --- | --- |
| Total pairs | 48 |
| Pools | 16 (Group A … Group P) |
| Pairs per pool | 3 |
| Pool matches | 3 per pool (round robin, meet once) |
| Advance | Pool winner only (rank 1) |
| Knockout | R16 → QF → SF → Final (15 KO matches) |
| 3rd place | **None** |

Preset code: `lib/tournaments/partner/bestie-cup-config.ts`

---

## Pool stage rules (app behaviour)

| Rule | Implementation |
| --- | --- |
| Scoring | **First to 6 games** per match |
| Deuce | **Golden Point** at 40–40 (wizard: **Deuce (in-game)** — locked on Bestie preset) |
| 5–5 | One deciding game → **6–5** (not a point tiebreak) |
| Standings | **W** → **Game Win %** → manual draw |
| WO | Recorded **6–0** (counts in GW%) |
| Rest | Side change + **1 min** at odd total games (from game 3) |
| UI | Standings show **GW%**, **Qualified** / **Eliminated** badges |

---

## Knockout scoring (app behaviour)

Per PDF **Sistem Skor** — race target stays **First to 6** for every KO round; **margin + tiebreak trigger** differ:

| Round | Rules |
| --- | --- |
| **R16 & QF** | First to 6 · Golden Point · at **5–5** → **match tiebreak to 7 points** (no win-by-2 in TB) |
| **SF & Final** | First to 6 **win by 2 games** · Golden Point · at **6–6** → **match tiebreak to 7 points** (no win-by-2 in TB) |

Runtime: `getBestieCupKnockoutGameRules(round, totalRounds)` via `getTournamentGameRules(..., { knockoutRoundNumber, knockoutTotalRounds })` on Manage Live scoring, client Finish-match checks, and server `assertOfficialLiveGamesMatchComplete` (so SF/Final cannot be finalized at 6–5).

**Pool finals:** **6–0 … 6–5** (including **5–6**) are valid First-to-6 results. If an Ended card shows the wrong games, use **Override** — the server clears the rally `completedGames` log so the new score is what the UI displays (previously Math.max could keep the old 5–6 after a successful save).

**Wizard note:** Structured match rules + Review show these PDF lines when **Bestie Cup 2026 preset** is applied. Generic “Race to per knockout round” targets are hidden for Bestie (rules are fixed by PDF, not custom race-to maps).

Live scoreboard enters **Match tiebreak** mode automatically at 5–5 / 6–6. Golden Point banner: **receiving pair chooses side**.

---

## Fixed R16 bracket (no re-draw)

| Match | Pairing |
| --- | --- |
| R16-1 | Group A vs Group I |
| R16-2 | Group B vs Group J |
| R16-3 | Group C vs Group K |
| R16-4 | Group D vs Group L |
| R16-5 | Group E vs Group M |
| R16-6 | Group F vs Group N |
| R16-7 | Group G vs Group O |
| R16-8 | Group H vs Group P |

Seeding: `buildBestieCupRoundOneSlotOrder()` in `lib/tournaments/double-stage/seeding.ts`

---

## Partner public UI (mobile & live data)

| Area | Behaviour |
| --- | --- |
| **Mobile nav** | Public site + Partner Console use a **bottom tab bar** on small screens (`partner-mobile-bottom-nav.tsx`). Desktop keeps header links. |
| **Tournament tabs** | Sticky horizontal tabs on mobile; Live Score / Groups / Matches / Players / History poll every **4–6s** (live) via `useTournamentLive`; roster refreshes every **30s** on stats tabs. Live Score shows court/match scores only — pool tables stay on **Groups**. |
| **Rest teams** | Live Score shows waiting pairs as **chips** (`rest-teams-panel.tsx`), not a comma-separated wall. |
| **Bestie Cup GW%** | Groups tab shows **Game Win %** when `poolRules: bestie_cup` (PDF §5 tie-break). |

---

## Operator checklist

- [ ] Preset applied (`poolRules: bestie_cup`, `matchFormat: race_to_games`)
- [ ] 48 teams registered and confirmed
- [ ] Groups initialized (16 × 3)
- [ ] Pool scoring uses race-to-6 (not classic sets)
- [ ] GW% visible on Groups tab
- [ ] Manual tie badge shown if pool needs committee decision
- [ ] Knockout generated after all pool matches complete
- [ ] R16 pairings match A–I … H–P table
- [ ] R16/QF: 5–5 enters match TB to 7; Finish rejects incomplete
- [ ] SF/Final: 6–5 **blocked** until win-by-2 or TB at 6–6
- [ ] 3rd place match **disabled**
- [ ] WO/RET via match card → Special result dialog
- [ ] Deuce chip shows Golden Point + receiving pair chooses side

---

#### D — Manage roster (48 teams)

- [ ] Manage → **Players**: antrian review compact (tanpa daftar 48 confirmed duplikat)
- [ ] Tabel roster: search, paginasi, scroll area — tidak satu halaman panjang
- [ ] Remove team hanya untuk tim yang belum main

---

## Tie-break reference (Bestie Cup)

| Context | Rule |
| --- | --- |
| **Pool standings** | Wins → **Game Win %** (GW%) → manual committee |
| **Pool match at 5–5** | Deciding game → winner **6–5** (race to 6) |
| **KO R16/QF at 5–5** | Match tiebreak to **7** points |
| **KO SF/Final at 6–6** | Match tiebreak to **7** points (SF/F win by 2 games before 6–6) |
| **Best runner-up (2+1)** | `bestRunnerUpSlots` fills knockout bracket after pool winners |

UI labels: pool column **GW%**; knockout live score shows match tiebreak when configured in `bestie-cup-config.ts`.

---

## Manage Players UI

Untuk event besar (mis. 48 pasangan Bestie Cup):

| Area | Perilaku |
| --- | --- |
| **Guest registrations** | Stat Needs review / Confirmed / Total; hanya pending ditampilkan sebagai list |
| **Confirmed teams** | Satu tabel di bawah — tidak diduplikasi di panel registrations |
| **Search & pagination** | Cari nama tim/pemain; 10 tim per halaman default (10 / 20 / 50) |
| **Compact layout** | Player sebagai chip inline; baris lebih pendek; header sticky saat scroll |
| **Remove** | Konfirmasi modal; tim yang sudah main = locked |

---

## Troubleshooting

| Issue | Fix |
| --- | --- |
| Classic sets UI instead of games | Ensure `matchFormat: race_to_games` (preset sets this; avoid legacy API default) |
| No GW% column | Tournament must have `poolRules: bestie_cup` or format `modified_swiss` |
| Wrong pool tie-break | Verify `standingsScoring.tieBreakers`: wins → gameWinPct → manual |
| Empty groups on live scoring first visit | Open **Groups** tab once to init, or refresh Live scoring (auto-inits for group formats) |
| Halaman Players terlalu panjang | Gunakan search/paginasi di tabel Confirmed teams; panel registrations tidak lagi menampilkan ulang semua confirmed |
| Knockout not generated | Complete all pool matches; use **Generate knockout** on manage Groups panel |

---

## Related docs

- [`tournament-guide.md`](./tournament-guide.md) — general partner & format reference (§2.10 Modified Swiss, partner wizard)
- [`partner-auth.md`](./partner-auth.md) — member login & registration
