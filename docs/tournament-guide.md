# Panduan Turnamen Gud Game

> **Dokumen hidup.** Perbarui file ini setiap kali ada perubahan, penambahan, atau rombak fitur seputar turnamen (format match, scoring, form create/edit, aturan lifecycle, dsb.).  
> Terakhir diselaraskan dengan aplikasi: **2026-08-13**.  
> Rule agen: `.cursor/rules/tournament-docs.mdc` — sync otomatis saat file turnamen terkait diubah.

Dokumen ini menjelaskan:

1. Jenis turnamen (**Official** vs **Fun Match** vs **Partner**)
2. Format pertandingan (termasuk **Mexicano**, **Group only**, family Original/Custom)
3. Layer **berapa kali main** (group meetings vs knockout legs) + **match scoring**
4. Form create / edit Official & Fun Match
5. Aturan scoring, ranking, standings, **leaderboard**
6. Alur operasional + **realtime** public & manage saat Live
7. Checklist, seed QA, **matriks uji otomatis**, maintenance dokumen

Nama field di UI umumnya berbahasa Inggris; penjelasan di sini berbahasa Indonesia agar mudah dipakai sebagai panduan operasional.

---

## Daftar isi

1. [Jenis turnamen](#1-jenis-turnamen)
2. [Format pertandingan (match format)](#2-format-pertandingan-match-format)
3. [Form create / edit Official](#3-form-create--edit-official)
4. [Form create / edit Fun Match](#4-form-create--edit-fun-match)
5. [Aturan scoring](#5-aturan-scoring)
6. [Alur operasional per format](#6-alur-operasional-per-format)
7. [Realtime: public & manage saat Live](#7-realtime-public--manage-saat-live)
8. [Checklist field wajib](#8-checklist-field-wajib)
9. [Seed fixtures (local QA)](#9-seed-fixtures-local-qa)
10. [Matriks uji otomatis](#10-matriks-uji-otomatis)
11. [Catatan maintenance dokumen](#11-catatan-maintenance-dokumen)

---

## 1. Jenis turnamen

### 1.1 Official (`tournamentType: official`)

Turnamen resmi yang dikelola host/admin. Bisa **Paid** atau **Free**.

| Aspek | Paid | Free |
| --- | --- | --- |
| Billing | `officialBilling: paid` | `officialBilling: free` |
| Biaya registrasi | Wajib (> 0 IDR), lewat payment gateway | Tidak boleh ada fee |
| Prize pool | Opsional | Opsional |
| Category | **Wajib**: Male / Female / Mix | **Wajib**: Male / Female / Mix |
| **Tournament tier \*** | Satu skill tier **atau** **No Rank** | Sama |
| Match family | **Original** atau **Custom** | Sama |
| Match format | Double Stage / Americano / Mexicano / Knockout / Group only | Sama |
| Eligibility | Exact-match tier; No Rank = semua boleh join | Sama |
| Ranking points | ± poin sesuai tier; No Rank = **0** | Sama |
| Registrasi | Checkout / konfirmasi sesuai billing | Konfirmasi tanpa bayar |

**Karakteristik umum Official**

- Halaman publik turnamen, registrasi tim, manage panel (scoring, bracket, groups, staff).
- Aturan terstruktur dari settings (family / format / scoring / meetings) + catatan host opsional.
- Status publik: Draft → Upcoming / Live / Completed (otomatis dari tanggal jika published).
- Saat **Live**, skor di manage host dan halaman publik sinkron lewat polling (lihat §7).

### 1.2 Fun Match (`tournamentType: fun_match`)

Sesi komunitas / rekreasi. **Tidak** memengaruhi ranking official.

| Aspek | Nilai |
| --- | --- |
| Billing | Tidak dipakai (`officialBilling` harus kosong) |
| Fee | Harus 0 / tidak ada |
| Category | Tidak ditampilkan di form Fun Match |
| Format | Americano atau Elimination (bukan Double Stage / Mexicano / Group only) |
| Tier gate | **Tidak ada** |
| Ranking | **Tidak** memengaruhi tier / ranking / win rate karier |

### 1.3 Partner white-label (`partnerTenant`)

Partner organizations create events on their own site (`/{partnerSlug}`). Stats stay **off Gud Game career rankings**.

| Aspek | Partner white-label |
| --- | --- |
| Surface type | Disimpan sebagai `fun_match` + `partnerId` |
| Billing | Free / Paid untuk guest checkout |
| Skill / tournament tier | **Tidak ada** |
| Format | Double Stage / Elimination / Americano (wizard partner; field legacy race-to) |
| Guest registration | `registered` → partner Confirm → `confirmed` |

Wizard: `components/partners/partner-tournament-wizard.tsx`.

---

## 2. Format pertandingan (match format)

### 2.0 Tiga layer yang sering dicampur (penting)

| Layer | Artinya | Model |
| --- | --- | --- |
| **Group “ketemu N kali”** | Setiap pasangan di grup bermain **N pertandingan terpisah**; tiap hasil masuk klasemen (W/L/G/PTS). | **Independent fixtures** (`customMatch.groupMeetingsPerPair`) |
| **Bracket “berapa kali main”** | Satu slot KO terdiri dari **N legs**; pemenang slot = **mayoritas legs**. Skor seperti `4–0` = scoring **dalam satu leg**, bukan “main 4 kali”. | **Series legs** (`customMatch.knockoutLegsPerSlot`) |
| **Match scoring** | Cara menyelesaikan **satu** match/leg: Best of / Race to / Total / Custom score. | `settings.matchScoring` (orthogonal ke format) |

Official Gud Game memakai **ketiganya**. Custom family mengaktifkan meetings/legs; Original default meetings/legs = 1.

### 2.0.1 Match family

| Family | Kode | Isi |
| --- | --- | --- |
| **Original** | `formatFamily: original` | Double Stage, Americano, **Mexicano**, Knockout, Group only |
| **Custom** | `formatFamily: custom` | Sama **kecuali Mexicano**; unlock meetings per pair + knockout legs |

Settings disimpan di `tournaments.settings` JSONB (dual-read dengan field legacy).

**Runtime guarantee (penting)**

| Family | `groupMeetingsPerPair` | `knockoutLegsPerSlot` | Persistensi |
| --- | --- | --- | --- |
| **Original** | Selalu **1** (ignore sisa JSON `customMatch`) | Selalu **1** | Save/edit sebagai Original **menghapus** `customMatch` dari settings |
| **Custom** | 1–10 dari form | 1–9 dari form | Disimpan di `settings.customMatch` |

Getter: `getGroupMeetingsPerPair` / `getKnockoutLegsPerSlot` di `format-capabilities.ts`.  
Switch format menjauh dari Mexicano **menghapus** `settings.mexicano`.

### 2.0.2 Matriks Official: Paid / Free × Original / Custom

Semua kombinasi berikut **didukung** (kecuali Mexicano + Custom):

| Format | Paid Original | Paid Custom | Free Original | Free Custom |
| --- | --- | --- | --- | --- |
| Double Stage | ✅ | ✅ (+ meetings/legs) | ✅ | ✅ (+ meetings/legs) |
| Group only | ✅ | ✅ (+ meetings) | ✅ | ✅ (+ meetings) |
| Elimination | ✅ | ✅ (+ KO legs) | ✅ | ✅ (+ KO legs) |
| Americano | ✅ | ✅ | ✅ | ✅ |
| Mexicano | ✅ | ❌ | ✅ | ❌ |

Paid vs Free **tidak** mengubah engine format/scoring — hanya billing, fee, dan jalur registrasi. Skill tier / No Rank berlaku sama untuk keduanya.

### 2.0.3 Ketersediaan format

| Format | Kode | Official | Fun Match | Partner | Ringkas |
| --- | --- | --- | --- | --- | --- |
| **Double Stage** | `double_stage` | ✅ | ❌ | ✅ | Group RR → knockout |
| **Group only** | `group_only` | ✅ | ❌ | — | Group RR saja; juara dari standings |
| **Elimination** | `single_elimination` | ✅ | ✅ | ✅ | Bracket knockout |
| **Americano** | `americano` | ✅ | ✅ | ✅ | Rotasi pasangan; poin per pemain |
| **Mexicano** | `mexicano` | ✅ (Original only) | ❌ | — | Round dari leaderboard (Individu / Team) |

### 2.1 Double Stage

**Alur**

1. **Group stage** — tim dibagi ke grup; round-robin (× `groupMeetingsPerPair` jika Custom).
2. Standings dihitung (W/L/PTS + Game atau +/-).
3. Top N per grup (+ best runner-up opsional) **advance**.
4. **Knockout** — setiap slot bisa N legs; mayoritas maju; opsional 3rd place.

**Setting form**

| Field UI | Setting key | Fungsi |
| --- | --- | --- |
| Max teams per group | `doubleStage.maxTeamsPerGroup` | 2–8 |
| Teams advancing per group | `doubleStage.teamsAdvancePerGroup` | ≤ max/group |
| Best runner-up slots | `doubleStage.bestRunnerUpSlots` | Slot ekstra lintas grup |
| Allow draw | `standingsScoring.allowDraw` | Imbang di group |
| Include 3rd place | `doubleStage.thirdPlaceEnabled` | Bronze match |
| Meetings per pair | `customMatch.groupMeetingsPerPair` | Custom only; 1–10 |
| Legs per KO slot | `customMatch.knockoutLegsPerSlot` | Custom only; 1–9 (ganjil disarankan) |
| Match scoring | `matchScoring` | Lihat §5.6 |

**Aturan group**

- Fixture digenerate saat Live + tim cukup; tiap meeting pasangan = baris match terpisah (metadata `meetingIndex`).
- Live score di court; finalize → standings + history.
- Qualifikasi bermakna setelah **semua** fixture grup selesai.
- Setelah selesai → knockout **otomatis** (tombol Generate tetap sebagai retry). Generic generate bracket untuk semua tim **dilarang**.
- Schedule kickoff di manage → Groups; tampil di publik tab **Matches**.

**Aturan knockout**

- Hanya tim qualified.
- Legs: baris anak terhubung `seriesParentId` / `legIndex`; advance setelah mayoritas (`resolveSeriesMajority`).
- Live scoring manage + publik tab Bracket / Live Score.

### 2.2 Group only (`group_only`)

Sama infrastruktur group seperti Double Stage, **tanpa** knockout.

- Tabs publik: Overview, Live Score, Groups, Matches, Players, History.
- Manage: Groups + Live scoring (mode groups); **tidak** ada Generate knockout.
- Setelah semua fixture selesai → standings final = pemenang.

### 2.3 Elimination (`single_elimination`)

1. Bracket digenerate / di-seed (random atau manual).
2. Custom: tiap slot bisa multi-leg (sama model series).
3. Pemenang maju; bye jika field bukan power-of-two.

### 2.4 Americano (`americano`)

1. Lobby pemain/tim.
2. Setiap round: pasangan & lawan di-rotasi (`planAmericanoRound`).
3. Skor per match; agregat poin individu.
4. Manage: Live scoring mode rounds; reshuffle / finish round.

### 2.5 Mexicano (`mexicano`) — Original only

| Setting | Nilai |
| --- | --- |
| `mexicano.mode` | `individual` (partner berotasi: blok 1+4 vs 2+3) atau `team` (pasangan tetap; 1v2, 3v4, …) |
| `mexicano.roundCount` | Jumlah round (juga mengisi `maxRounds`) |

**Alur**

1. Round 1: acak.
2. Round berikutnya: seed dari **leaderboard live** (poin sesi).
3. Manage memakai court grid yang sama dengan Americano; planner `lib/tournaments/mexicano/`.
4. Publik: Live Score + History dari payload live (lobby rounds).

---

## 3. Form create / edit Official

Wizard: `components/admin/tournaments/tournament-create-wizard.tsx`  
Validasi: `lib/validations/tournaments.ts` (`tournamentUpsertSchema`).

Tanda **\*** = wajib.

### 3.1 Step Basics

| Field UI | Wajib? | Fungsi / catatan |
| --- | --- | --- |
| **Name \*** | Ya | Nama publik |
| Visibility | Ya | Draft / Published |
| **Registration billing \*** | Ya | Paid / Free |
| **Registration fee (IDR) \*** | Ya jika Paid | > 0; Free tidak boleh fee |
| Prize pool (IDR) | Tidak | Opsional |
| **Category \*** | Ya | Male / Female / Mix |
| **Tournament tier \*** | Ya | Satu tier **atau No Rank** (`rankingMode: open`) — No Rank: eligibility terbuka, ranking delta 0 |
| **Match family \*** | Ya | Original / Custom |
| **Match format \*** | Ya | Difilter family; Mexicano hilang di Custom |
| Meetings per pair | Custom + group-capable | 1–10 independent fixtures |
| Legs per knockout slot | Custom + KO-capable | 1–9; warn jika genap |
| Mexicano setup | Format Mexicano | Individual/Team + round count |
| **Match scoring \*** | Ya (Official) | Best of / Race to / Total / Custom score |
| Max teams per group | Double Stage, Group only | |
| Teams advancing / 3rd place | Double Stage saja | |
| Allow draw | Double Stage, Group only | |
| Scoring type / Point / Duration | Americano & Mexicano | Points atau Timed (jam round) |
| Number of courts | Ya | 1–12 |
| Max teams / Players per team | Disarankan / default sport | |
| Summary / Description / Cover | Tidak | |
| **Venue \*** | Ya | + maps autocomplete |

### 3.2 Step Schedule & rules

| Field UI | Fungsi |
| --- | --- |
| Starts / Ends / Registration closes | Jadwal |
| **Structured match rules** (read-only) | Ringkasan family, format, tier, scoring, meetings/legs, Mexicano |
| Additional match notes (optional) | Catatan host saja |
| Equipment standards | Rich text |

### 3.3 Review

Seksi **Format & scoring** menampilkan family, format, tier/No Rank, match scoring, meetings/legs, Mexicano.

### 3.4 Validasi Official (penting)

- `categoryLabel` wajib Male | Female | Mix.
- `format` harus cocok `formatFamily`; Mexicano ditolak di Custom.
- Mexicano wajib payload `mexicano` (mode + roundCount).
- `officialBilling` paid | free; Paid → fee > 0; Free → fee tidak > 0.
- `rankingMode !== open` → tepat 1 `allowedTierLevels`; `open` → tier kosong diizinkan.
- Venue tidak boleh kosong (client).

---

## 4. Form create / edit Fun Match

Wizard: `components/tournaments/reclub/reclub-tournament-wizard.tsx`.

| Field UI | Wajib? | Fungsi |
| --- | --- | --- |
| **Fun Match name \*** | Ya | |
| Match format | Ya | Americano / Elimination |
| Players per team / Max teams | Ya | |
| Number of rounds | Opsional | |
| Scoring type + Point/Duration | Ya | |
| Number of courts | Ya | |
| **Start / End \*** | Ya | |
| Description / House rules / Venue | Sesuai UI | |

**Tidak ada:** Category, billing Official, Double Stage / Mexicano / Group only, tournament tier, match family Custom.

---

## 5. Aturan scoring

### 5.1 Legacy flat points

- First to N dari `pointsPerMatch` (11 / 15 / 21 / 25 / 30).
- Timed: `roundDurationMinutes`.

### 5.2 Legacy race to games

- Skor besar = games won (contoh 4–1).
- Dalam game: 0 → 15 → 30 → 40; deuce `golden_point` / `advantage`.
- Dual-write: Official `matchScoring.mode = race_to` tetap mengisi `matchScoreMode` + `raceToGames`.

### 5.3 Ranking points (Official skill tier)

| Tournament tier | Win | Loss |
| --- | --- | --- |
| Bronze | +1 | −1 |
| Silver | +3 | −3 |
| Gold | +5 | −5 |
| Platinum | +8 | −8 |
| International / National | +10 | −10 |
| **No Rank** (`open`) | **0** | **0** |

- Eligibility exact-match kecuali No Rank.
- Fun Match: 0 poin ranking.

### 5.4 Americano / Mexicano (sesi)

- Poin match menambah total individu sesi (leaderboard live).
- Mexicano: round ≥ 2 memakai ranking poin sesi itu.

### 5.5 Standings group (Double Stage & Group only)

| Kolom | Arti |
| --- | --- |
| M / G | Matches played (setiap meeting pasangan dihitung) |
| W / L | Wins / Losses |
| Game atau +/- | Mode games vs points |
| PTS | Default klasemen 3 / 1 / 0 (bukan input form) |

Tie-breaker: sesuai sport (points sports vs padel/tennis ITF-ish).

### 5.6 Match scoring terpadu (`settings.matchScoring`)

| Mode | Perilaku |
| --- | --- |
| `best_of` | Best of 3/5; set race-to `setTarget` |
| `race_to` | First to N (points/games flat) |
| `total` | Semua `totalSets` dimainkan; set wins terbanyak |
| `custom_score` | `large_score` / `one_match_winner`; `allowDraw` default false; `tiePolicy` |

Resolver: `lib/tournaments/scoring/match-scoring.ts`. Series knockout: `resolveSeriesMajority`.

Legacy Official tanpa `matchScoring` di-derive dari race-to / points (`deriveMatchScoringFromLegacy`).

**Source of truth runtime**

- Official: `settings.matchScoring` (tersimpan). Race-to custom (mis. 8) dibaca lewat `getTournamentRaceToTarget` / `getTournamentGameRules` — **bukan** legacy `raceToGames` saja (yang terbatas 2/3/4/6).
- Dual-write legacy `matchScoreMode` / `raceToGames` hanya jika target termasuk preset, agar engine lama tetap aman.
- Fun Match / points flat: `matchScoreMode: points` menang — derive `matchScoring` **tidak** boleh memaksa mode games.

### 5.7 Leaderboard (sesi & bracket)

| Konteks | Sumber | Aturan |
| --- | --- | --- |
| **Americano / Mexicano** | Poin pemain sesi (`playerStats` / reclub) | Sort poin desc, lalu nama; Mexicano round ≥ 2 memakai ranking ini |
| **Group stage** | Standings per grup | Setiap meeting pasangan = 1 baris match; W/L/PTS/Game |
| **Bracket Elimination / DS KO** | `buildTournamentLeaderboard` | Hanya **slot parent** (bukan child series legs). Multi-leg = 1 W/L setelah mayoritas |
| **Career ranking** | `rankingDeltaForMatch` | Official tier ±poin; **No Rank / open = 0**; Fun Match = 0; paid & free memakai skill tier yang sama |

Helper: `isBracketSeriesChildLeg` (`bracket-metadata.ts`) — child legs tidak menggelembungkan W/L leaderboard.

### 5.8 Statistik player (career + sesi) ↔ aturan turnamen

| Lapisan | Kapan tersimpan | Sinkron ke |
| --- | --- | --- |
| **Sesi** (Live Score / manage / display) | Setiap update skor live + finalize | Payload `playerStats` lewat poll live/manage (§7) |
| **Career** (`player_matches` + wiki) | Hanya saat **finalize** match (bukan live ±) | Account history + wiki performance |

**Aturan career mengikuti create-tournament**

| Setting turnamen | Efek career |
| --- | --- |
| Official Paid / Free | `statsTier` billing; poin ranking dari **skill tier** (sama untuk paid & free) |
| Tournament tier Bronze…International | ±1 / 3 / 5 / 8 / 10 per W/L |
| **No Rank** (`rankingMode: open`) | Poin ranking **0** |
| Fun Match / Partner | Tidak menambah ranking Gud Game (partner tidak menulis career GG) |
| Match scoring / meetings / legs | Mempengaruhi kapan match selesai & berapa fixture; tiap fixture finalized = 1 baris history (kunci `·#matchId`) |

**Finalize hooks**

- Group / Group only / DS group → `recordGroupStageScore` → `syncOfficialMatchToPlayerHistory`
- Bracket / KO legs → `submitBracketMatchScore` → sync Official atau Fun
- Americano / Mexicano lobby → `completeReclubRound` → sync Fun dan/atau Official
- **Rematch** bracket → hapus baris history fixture + Champion placement, lalu wiki recompute

**Kunci anti-tabrakan:** `round` menyimpan label + `·#<fixtureId>` agar Custom meetings dan KO multi-leg tidak saling menimpa.

---

## 6. Alur operasional per format

### 6.1 Official — Double Stage

1. Create (family, format, scoring, pool rules, tier/No Rank).
2. Publish; registrasi & konfirmasi tim.
3. **Live** → groups + fixtures (× meetings).
4. Opsional: schedule kickoff (Groups).
5. Live scoring group di manage → publik Live Score / Groups / Matches.
6. Semua group selesai → knockout otomatis (× legs jika Custom).
7. Score legs / bracket → juara; history & ranking sync.

**Reset knockout:** sebelum bracket di-score; regenerate hanya dari qualified.

### 6.2 Official — Group only

1–5 sama group Double Stage.  
**Tidak** ada langkah knockout. Juara = standings akhir.

### 6.3 Official — Elimination

1. Create (+ Custom legs opsional).  
2. Generate / seed bracket.  
3. Live scoring bracket (series jika multi-leg).  
4. Champion di final.

### 6.4 Official — Americano

1. Create + courts + points/timed + match scoring.  
2. Join / assign.  
3. Start rounds, score, finish / reshuffle.  
4. Leaderboard individu.

### 6.5 Official — Mexicano

1. Create Original → Mexicano → Individual/Team + round count.  
2. Live: planner Mexicano di manage scoring.  
3. Publik melihat Live Score & history dari lobby rounds.  
4. Round cap = `mexicano.roundCount`.

### 6.6 Fun Match — Americano / Elimination

Mirip di atas tanpa billing/category/ranking Official.

---

## 7. Realtime: public & manage saat Live

Tujuan: penonton di **halaman publik** dan host di **manage** melihat skor/standings yang sama tanpa hard refresh, dengan interval yang aman untuk Postgres.

### 7.1 Sumber data

| Surface | Hook / API | Isi utama |
| --- | --- | --- |
| Publik Live Score / Groups / History | `useTournamentLive` → `GET .../live` | `buildTournamentLivePayload` — matches (group / lobby / bracket), `doubleStage` overview, `matchHistory`, `playerStats` |
| Publik lobby Americano/Mexicano (cadangan) | `useTournamentLobby` (enabled jika `hasLobbyRounds`) | Teams + reclub matches |
| Manage Live scoring | `useTournamentManageScoring` → `GET .../manage/scoring` | Courts, active matches, groups/bracket/rounds sesuai `getFormatCapabilities` |
| Mutasi skor | Group / reclub / bracket score APIs | `invalidateQueries` live + manage-scoring (+ lobby jika relevan) |

### 7.2 Interval polling (aktif saat tab fokus)

| Query | Saat ada match `in_progress` | Saat status Live tanpa match aktif | Selesai / idle |
| --- | --- | --- | --- |
| Live publik | ~4s | ~6s | ~8–20s |
| Manage scoring | ~5s | ~15s | — |
| Lobby (jika enabled) | Dinamis (aktif match lebih cepat) | Lebih lambat | — |

Penulisan skor (±) **menjeda** poll manage sebentar agar GET stale tidak menimpa skor lokal (`isManageScoringWriteInFlight`).

### 7.3 Capabilities → tab & mode

`getFormatCapabilities(tournament)` mengontrol:

| Format | Groups tab | Bracket tab | Manage scoring mode | Live payload |
| --- | --- | --- | --- | --- |
| Double Stage (group) | ✅ | Setelah KO | `groups` | Group matches + standings |
| Double Stage (KO) | ✅ (final standings) | ✅ | `bracket` | Bracket live |
| Group only | ✅ | ❌ | `groups` | Group only (no KO generate) |
| Elimination | ❌ | ✅ | `bracket` | Bracket |
| Americano / Mexicano | ❌ | ❌ | `rounds` | Lobby rounds |

API menolak operasi ilegal (contoh: generate KO pada `group_only` / `mexicano`; generic bracket generate pada `double_stage`).

### 7.4 Apa yang harus sinkron

- **Skor court** (group / lobby / bracket) → Live Score publik dalam interval poll berikutnya (atau segera setelah invalidate mutasi).
- **Standings grup** → tab Groups publik (`live.doubleStage.groups`) termasuk semua meetings.
- **Knockout series** → parent slot + legs; advance setelah mayoritas; pohon publik memakai parent slots.
- **Mexicano / Americano** → leaderboard / history dari `playerStats` + `matchHistory` live.
- **Schedule** → tab Matches publik mengikuti kickoff yang di-set host.

### 7.5 File acuan realtime

- `lib/tournaments/live/build-payload.ts`
- `lib/tournaments/live/poll-intervals.ts` — interval poll publik / manage / clamp TV
- `lib/tournaments/live/display-scoring.ts` — mapping scoring → fullscreen games board
- `lib/tournaments/format-capabilities.ts`
- `lib/tournaments/lifecycle-guards.ts`
- `hooks/use-tournament-live.ts`, `hooks/use-tournament-manage-scoring.ts`
- `hooks/use-double-stage-group-score.ts`, `hooks/use-tournament-lobby.ts`, `hooks/use-tournament-bracket.ts`
- `components/tournaments/official-tournament-page.tsx`
- `components/tournaments/tournament-display-client.tsx` (fullscreen venue)
- `components/tournaments/manage/fun-match-scoring-workspace.tsx`

**Automated smoke (no DB):**

```bash
npx vitest run lib/tournaments
npx vitest run lib/account/player-performance
```

| Suite | Cakupan |
| --- | --- |
| `format-scoring-smoke.test.ts` | Format helpers, capabilities, upsert, scoring modes, meetings/legs, live poll, display games mode |
| `official-matrix.test.ts` | Paid/Free × Original/Custom × semua format, No Rank, Original clears customMatch, leaderboard rules |
| `match-scoring-resolve.test.ts` | Race-to custom vs points mode dual-read |
| `official-format-overhaul.test.ts` | Meetings ×N, Mexicano planner, series majority |
| `points.test.ts` | Ranking delta per tier + No Rank = 0 |

---

## 8. Checklist field wajib

### Official (Paid & Free)

- [ ] Name
- [ ] Registration billing (Paid / Free)
- [ ] Registration fee (hanya Paid)
- [ ] **Category (Male / Female / Mix)**
- [ ] **Tournament tier** (satu tier) **atau No Rank**
- [ ] **Match family** (Original / Custom)
- [ ] **Match format**
- [ ] **Match scoring**
- [ ] Meetings / legs jika Custom
- [ ] Mexicano mode + rounds jika Mexicano
- [ ] Scoring type + point/duration (Americano / Mexicano)
- [ ] Number of courts
- [ ] Venue
- [ ] Group extras jika Double Stage / Group only

### Fun Match

- [ ] Name
- [ ] Match format (Americano / Elimination)
- [ ] Start & end
- [ ] Scoring + courts
- [ ] Tidak mengisi official billing / fee

---

## 9. Seed fixtures (local QA)

Dev-only scripts (bukan CI). Creator harus sudah ada di DB.

| Command | Isi |
| --- | --- |
| `npm run db:seed:double-stage -- --name you@email` | **5** Official Double Stage × 32 tim (satu per tier). Platinum & International = paid |
| `npm run db:seed:double-stage -- --name you@email --tier=gold --reset` | Satu tier |
| `npm run db:seed:double-stage -- --name you@email --go-live` | Langsung live (groups init) |
| `npm run db:seed:double-stage:purge -- --all` | Hapus fixture DS per-tier |
| `npm run db:seed:fixtures -- --name you@email` | Matrix Official free/paid × Americano/Elimination + Fun Match |
| `npm run db:seed:fixtures:purge` | Hapus matrix |

**Deploy:** job ensure idempotent (`ALLOW_DEPLOY_FIXTURE_SEED=true`) — tidak `--reset`. Host default override via `SEED_FIXTURE_HOST_EMAIL`.

Player dummy: `*@gudgame.local`, password default `SeedPlayer1!`.

**Manual smoke saat Live (setelah seed `--go-live`)**

1. Manage → Live scoring: ± skor / complete match.
2. Publik Live Score + Groups/Bracket (sesuai format) ter-update setelah poll / invalidate.
3. Fullscreen `/display`: race-to games memakai `live.scoring.raceToGames` (termasuk custom N).
4. Custom Double Stage: fixtures × meetings; KO slots × legs → advance mayoritas.
5. Original: pastikan meetings/legs tetap 1 meski event pernah Custom.

---

## 10. Matriks uji otomatis

Status verifikasi terakhir: **2026-08-13** (`vitest` tournaments + player-performance = hijau).

| Dimensi | Kasus yang dikunci tes |
| --- | --- |
| Billing | Paid + fee; Free tanpa fee; Free+fee ditolak; Paid tanpa fee ditolak |
| Family | Original semua format; Custom tanpa Mexicano; Mexicano+Custom ditolak |
| Format | DS / Group only / Elimination / Americano / Mexicano capabilities + manage mode |
| Scoring | Race to 8, Best of, Total, Custom large, ±1 intra-game, labels live |
| Meetings / legs | RR × N; series majority; Original paksa 1; save Original hapus customMatch |
| Leaderboard | Series child di-skip; Mexicano sort poin |
| Ranking | Tier ±poin; No Rank = 0; Fun Match = 0; skill hilang = 0 (bukan fallback Gold) |
| Player history | Fixture key `·#matchId`; rematch membersihkan history; placement Official upsert |
| Realtime | Poll 4s/6s publik, 5s/15s manage; display clamp 5–120s; fullscreen games map |

---

## 11. Catatan maintenance dokumen

| Perubahan | Bagian docs |
| --- | --- |
| Format / family / meetings / legs / Mexicano / Group only | §2, §6, §7 |
| Field form Official | §3 + §8 |
| Match scoring / No Rank / leaderboard | §5 + §3 |
| Realtime / polling / capabilities | §7 |
| Fun Match | §4 + §8 |
| Seed QA | §9 |
| Matriks uji / regresi | §10 |

**File kode acuan (non-exhaustive)**

- Validasi: `lib/validations/tournaments.ts`
- Match config / dual-read: `lib/tournaments/match-config.ts`, `lib/tournaments/settings.ts`
- Scoring resolver: `lib/tournaments/scoring/match-scoring.ts`
- Format options / capabilities / guards: `lib/tournaments/form/format-options.ts`, `format-capabilities.ts`, `format-guards.ts`
- Wizard Official: `components/admin/tournaments/tournament-create-wizard.tsx`
- Double Stage / group meetings: `lib/tournaments/double-stage/`
- KO series: `lib/tournaments/brackets/series-legs.ts`, `bracket-metadata.ts`
- Bracket leaderboard: `lib/tournaments/brackets/leaderboard.ts`
- Mexicano: `lib/tournaments/mexicano/`
- Ranking points: `lib/account/player-performance/points.ts`
- Career sync: `lib/tournaments/stats/sync.ts`, `history-fixture-key.ts`
- Live payload / poll / display: `lib/tournaments/live/`

---

*Gud Game tournament product documentation — keep in sync with the running app.*
