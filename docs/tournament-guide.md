# Gud Game — Panduan Pengguna Turnamen

| | |
| --- | --- |
| **Dokumen** | User manual operasional turnamen |
| **Produk** | Gud Game (court-pedia) |
| **Audiens** | Host / admin turnamen, operator lapangan, QA, dan developer yang merawat fitur turnamen |
| **Bahasa UI** | Inggris (nama field mengikuti layar aplikasi) |
| **Bahasa panduan** | Indonesia (penjelasan operasional) |
| **Versi konten** | 2026-08-26 |
| **Status** | Dokumen hidup — diperbarui setiap ada perubahan fitur turnamen |

> **Cara memakai dokumen ini.** Baca [Bagian A](#bagian-a--konsep-dasar) untuk memahami jenis & format turnamen, [Bagian B](#bagian-b--membuat--mengedit-turnamen) saat membuat event, [Bagian C](#bagian-c--operasional-hari-h) saat pertandingan Live, lalu [Lampiran](#lampiran) untuk seed QA, matriks uji, dan referensi teknis.  
> Sinkronisasi otomatis untuk agen: `.cursor/rules/tournament-docs.mdc`.

---

## Daftar isi

### Bagian A — Konsep dasar

1. [Jenis turnamen](#1-jenis-turnamen)
2. [Format pertandingan](#2-format-pertandingan)
3. [Aturan scoring, ranking & leaderboard](#3-aturan-scoring-ranking--leaderboard)

### Bagian B — Membuat & mengedit turnamen

4. [Form create / edit Official](#4-form-create--edit-official)
5. [Form create / edit Fun Match](#5-form-create--edit-fun-match)
6. [Checklist field wajib](#6-checklist-field-wajib)

### Bagian C — Operasional hari-H

7. [Alur operasional per format](#7-alur-operasional-per-format)
8. [Realtime: public & manage saat Live](#8-realtime-public--manage-saat-live)
9. [Registrasi Official (tim & klaim slot)](#9-registrasi-official-tim--klaim-slot)

### Lampiran

- [A. Seed fixtures (local QA)](#lampiran-a--seed-fixtures-local-qa)
- [B. Matriks uji otomatis](#lampiran-b--matriks-uji-otomatis)
- [C. Maintenance & referensi teknis](#lampiran-c--maintenance--referensi-teknis)

---

# Bagian A — Konsep dasar

## 1. Jenis turnamen

Gud Game membedakan tiga permukaan turnamen. Pilih jenis yang tepat sebelum membuat event — jenis menentukan billing, ranking, dan format yang tersedia.

### 1.1 Official (`tournamentType: official`)

Turnamen resmi yang dikelola host/admin. Bisa **Paid** atau **Free**.

| Aspek | Paid | Free |
| --- | --- | --- |
| Billing | `officialBilling: paid` | `officialBilling: free` |
| Biaya registrasi | Wajib (> 0 IDR), lewat payment gateway | Tidak boleh ada fee |
| Prize pool | Opsional | Opsional |
| Category | **Wajib:** Male / Female / Mix | **Wajib:** Male / Female / Mix |
| Tournament tier | Satu skill tier **atau** No Rank | Sama |
| Match family | Original atau Custom | Sama |
| Match format | Double Stage / Americano / Mexicano / Knockout / Group only | Sama |
| Eligibility | Exact-match tier; No Rank = semua boleh join | Sama |
| Ranking points | ± poin sesuai tier; No Rank = **0** | Sama |
| Registrasi | Checkout / konfirmasi sesuai billing | Konfirmasi tanpa bayar |

**Karakteristik umum**

- Halaman publik, registrasi tim, manage panel (scoring, bracket, groups, staff).
- Aturan terstruktur dari settings (family / format / scoring / meetings) + catatan host opsional.
- Status publik: Draft → Upcoming / Live / Completed (otomatis dari tanggal jika published).
- Saat **Live**, skor manage dan halaman publik sinkron lewat polling (lihat [Bab 8](#8-realtime-public--manage-saat-live)).

### 1.2 Fun Match (`tournamentType: fun_match`)

Sesi komunitas / rekreasi. **Tidak** memengaruhi ranking official.

| Aspek | Nilai |
| --- | --- |
| Billing | Tidak dipakai (`officialBilling` harus kosong) |
| Fee | Harus 0 / tidak ada |
| Category | Tidak ditampilkan di form Fun Match |
| Format | Americano atau Elimination saja |
| Tier gate | Tidak ada |
| Ranking | Tidak memengaruhi tier / ranking / win rate karier |

### 1.3 Partner white-label (`partnerTenant`)

Partner membuat event di situs mereka sendiri (`/{partnerSlug}`). Statistik **tidak** masuk ranking karier Gud Game.

| Aspek | Partner white-label |
| --- | --- |
| Surface type | Disimpan sebagai `fun_match` + `partnerId` |
| Billing | Free / Paid untuk guest checkout |
| Skill / tournament tier | Tidak ada |
| Format | Double Stage / Elimination / Americano (wizard partner) |
| Guest registration | `registered` → partner Confirm → `confirmed` |
| **Member auth** | Login/sign-up di `/{slug}/login` (email/password **atau Google**) — identitas terpisah dari Gud Game & partner lain (lihat [`docs/partner-auth.md`](./partner-auth.md)) |
| **Staff auth** | Tetap Gud Game `/login` → `/dashboard/partner` |
| **Data isolation** | Turnamen, liga, player, pembayaran scoped `partnerId` — tidak muncul di discovery Gud Game atau partner lain |
| **Players management** | Staff bisa edit/remove player di Players list (lihat partner-auth §8) |
| **Security** | Cookie per slug, rate limit, callback sanitize, archived players blocked (lihat partner-auth §4) |
| **Stats sync** | Match turnamen → `partner_player_matches`; liga standings + optional team roster → player W/L (partner-auth §13) |
| **Public footer** | “Powered by **Gud Game**” (link ke `/`) di chrome situs publik partner |

Wizard UI: `components/partners/partner-tournament-wizard.tsx`.  
Manual auth member: [`docs/partner-auth.md`](./partner-auth.md).

---

## 2. Format pertandingan

### 2.1 Tiga layer yang sering dicampur

Pahami tiga layer ini sebelum mengatur form. Mencampur artinya sering menimbulkan kesalahan scoring.

| Layer | Artinya | Model data |
| --- | --- | --- |
| **Group “ketemu N kali”** | Setiap pasangan di grup bermain **N pertandingan terpisah**; tiap hasil masuk klasemen (W/L/G/PTS). | Independent fixtures (`customMatch.groupMeetingsPerPair`) |
| **Bracket “berapa kali main”** | Satu slot KO terdiri dari **N legs**; pemenang slot = **mayoritas legs**. Skor seperti `4–0` = scoring **dalam satu leg**, bukan “main 4 kali”. | Series legs (`customMatch.knockoutLegsPerSlot`) |
| **Match scoring** | Cara menyelesaikan **satu** match/leg: Best of / Race to / Total / Custom score. | `settings.matchScoring` (orthogonal ke format) |

Official Gud Game memakai **ketiganya**. Family Custom mengaktifkan meetings/legs; Original default meetings/legs = 1.

### 2.2 Match family

| Family | Kode | Isi |
| --- | --- | --- |
| **Original** | `formatFamily: original` | Double Stage, Americano, Mexicano, Knockout, Group only |
| **Custom** | `formatFamily: custom` | Sama **kecuali Mexicano**; unlock meetings per pair + knockout legs |

Settings disimpan di `tournaments.settings` JSONB (dual-read dengan field legacy).

| Family | `groupMeetingsPerPair` | `knockoutLegsPerSlot` | Persistensi |
| --- | --- | --- | --- |
| **Original** | Selalu **1** | Selalu **1** | Save/edit sebagai Original **menghapus** `customMatch` |
| **Custom** | 1–10 dari form | 1–9 dari form | Disimpan di `settings.customMatch` |

Getter: `getGroupMeetingsPerPair` / `getKnockoutLegsPerSlot` di `format-capabilities.ts`.  
Switch format menjauh dari Mexicano **menghapus** `settings.mexicano`.

### 2.3 Matriks Official: Paid / Free × Original / Custom

Semua kombinasi berikut didukung, kecuali Mexicano + Custom.

| Format | Paid Original | Paid Custom | Free Original | Free Custom |
| --- | --- | --- | --- | --- |
| Double Stage | ✅ | ✅ (+ meetings/legs) | ✅ | ✅ (+ meetings/legs) |
| Group only | ✅ | ✅ (+ meetings) | ✅ | ✅ (+ meetings) |
| Elimination | ✅ | ✅ (+ KO legs) | ✅ | ✅ (+ KO legs) |
| Americano | ✅ | ✅ | ✅ | ✅ |
| Mexicano | ✅ | ❌ | ✅ | ❌ |

Paid vs Free **tidak** mengubah engine format/scoring — hanya billing, fee, dan jalur registrasi. Skill tier / No Rank berlaku sama untuk keduanya.

### 2.4 Ketersediaan format per permukaan

| Format | Kode | Official | Fun Match | Partner | Ringkas |
| --- | --- | --- | --- | --- | --- |
| **Double Stage** | `double_stage` | ✅ | ❌ | ✅ | Group RR → knockout |
| **Group only** | `group_only` | ✅ | ❌ | — | Group RR saja; juara dari standings |
| **Elimination** | `single_elimination` | ✅ | ✅ | ✅ | Bracket knockout |
| **Americano** | `americano` | ✅ | ✅ | ✅ | Rotasi pasangan; poin per pemain |
| **Mexicano** | `mexicano` | ✅ (Original only) | ❌ | — | Round dari leaderboard (Individu / Team) |

### 2.5 Double Stage

**Alur singkat**

1. **Group stage** — tim dibagi ke grup; round-robin (× `groupMeetingsPerPair` jika Custom).
2. Standings dihitung (W/L/PTS + Game atau +/-).
3. Top N per grup (+ best runner-up opsional) advance.
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
| Match scoring | `matchScoring` | Lihat [Bab 3.6](#36-match-scoring-terpadu-settingsmatchscoring) |

**Aturan group**

- Fixture digenerate saat Live + tim cukup; tiap meeting pasangan = baris match terpisah (metadata `meetingIndex`).
- Live score di court; finalize → standings + history.
- Qualifikasi bermakna setelah **semua** fixture grup selesai.
- Setelah selesai → knockout **otomatis** (tombol Generate tetap sebagai retry). Generic generate bracket untuk semua tim **dilarang**.
- Schedule / Order of Play di manage tab **Match Schedule** (terpisah dari Groups); tampil di publik tab **Matches**.
- Live Score menampilkan **timer** elapsed (+ sisa waktu jika timed / estimasi).

**Aturan knockout**

- Hanya tim qualified.
- Legs: baris anak terhubung `seriesParentId` / `legIndex`; advance setelah mayoritas (`resolveSeriesMajority`).
- Live scoring manage + publik tab Bracket / Live Score.

### 2.6 Group only (`group_only`)

Infrastruktur group sama seperti Double Stage, **tanpa** knockout.

- Tabs publik: Overview, Live Score, Groups, Matches, Players, History.
- Manage: Groups + Live scoring (mode groups); **tidak** ada Generate knockout.
- Setelah semua fixture selesai → standings final = pemenang.

### 2.7 Elimination (`single_elimination`)

1. Bracket digenerate / di-seed (random atau manual).
2. Custom: tiap slot bisa multi-leg (model series yang sama).
3. Pemenang maju; bye jika field bukan power-of-two.

### 2.8 Americano (`americano`)

1. Lobby pemain/tim; host set **court count** (paralel) dan **session rounds** (`maxRounds`).
2. Setiap round: pasangan & lawan di-rotasi (`planAmericanoRound`).
3. Skor per match; agregat poin individu.
4. Manage: Live scoring mode rounds; tab round mengikuti `maxRounds`; reshuffle / finish round.  
   **Catatan:** court count ≠ jumlah round.

### 2.9 Mexicano (`mexicano`) — Original only

| Setting | Nilai |
| --- | --- |
| `mexicano.mode` | `individual` (partner berotasi: blok 1+4 vs 2+3) atau `team` (pasangan tetap; 1v2, 3v4, …) |
| `mexicano.roundCount` | Jumlah round (juga mengisi `maxRounds`) |

**Alur**

1. Round 1: acak.
2. Round berikutnya: seed dari **leaderboard live** (poin sesi).
3. Manage memakai court grid yang sama dengan Americano; planner di `lib/tournaments/mexicano/`.
4. Publik: Live Score + History dari payload live (lobby rounds).

---

## 3. Aturan scoring, ranking & leaderboard

### 3.1 Legacy flat points

- First to N dari `pointsPerMatch` (11 / 15 / 21 / 25 / 30).
- Timed: `roundDurationMinutes`.

### 3.2 Legacy race to games

- Skor besar = games won (contoh 4–1).
- Dalam game: 0 → 15 → 30 → 40; deuce `golden_point` / `advantage`.
- Dual-write: Official `matchScoring.mode = race_to` tetap mengisi `matchScoreMode` + `raceToGames`.

### 3.3 Ranking points (Official skill tier)

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

### 3.4 Americano / Mexicano (sesi)

- Poin match menambah total individu sesi (leaderboard live).
- Mexicano: round ≥ 2 memakai ranking poin sesi itu.

### 3.5 Standings group (Double Stage & Group only)

| Kolom | Arti |
| --- | --- |
| M / G | Matches played (setiap meeting pasangan dihitung) |
| W / L | Wins / Losses |
| Game atau +/- | Mode games vs points |
| PTS | Default klasemen 3 / 1 / 0 (bukan input form) |
| WR | Match win rate (lihat [Bab 3.8](#38-statistik-player-career--sesi)) |

Tie-breaker: sesuai sport (points sports vs padel/tennis ITF-ish).

### 3.6 Match scoring terpadu (`settings.matchScoring`)

| Mode | Perilaku | Jalur Live tablet |
| --- | --- | --- |
| `best_of` | Best of 3/5; set race-to `setTarget` | Classic sets engine (ITF/FIP-style) |
| `race_to` | First to N (points/games flat) | Games board · first to N |
| `total` | Exactly N games | Games board · `lengthMode: total` |
| `custom_score` | `large_score` / `one_match_winner`; `allowDraw` default false; `tiePolicy` | Flat points entry; `large_score` butuh host Complete |

Finalize live (non-paper) divalidasi server lewat `assertOfficialLiveGamesMatchComplete` untuk **group** dan **knockout**.

Resolver: `lib/tournaments/scoring/match-scoring.ts`. Series knockout: `resolveSeriesMajority`.

#### Stage overrides (Double Stage) — group ≠ knockout

Mirip partner **Short race-to-N**, Official Double Stage menyimpan **scoring leaf independen** untuk group dan knockout. Setiap stage bisa memilih tipe sendiri: Best of, Race to, Total, atau Custom.

| Field | Storage |
| --- | --- |
| Root (default = group) | `matchScoring.mode` + field mode |
| Group | `matchScoring.group` (full leaf: mode + options) |
| Knockout | `matchScoring.knockout` (full leaf: mode + options) |
| Legacy race dual-write | `raceToGamesGroup` / `raceToGamesKnockout` hanya jika stage tersebut mode `race_to` dan N ∈ {2,3,4,6} |

Runtime: `resolveMatchScoringForStage` → `getTournamentMatchScoreMode(t, stage)` / `getTournamentGameRules(t, stage)` / `isClassicSetsFormat(t, stage)` → live scoring, manage panels (group vs bracket), walkover/retirement, fullscreen display.

Stage leaves **hanya** untuk Double Stage: format lain di-strip saat create/edit (`matchScoringForFormat`) agar switch format tidak membocorkan scoring group/KO ke Elimination / Group only / lobby.

Contoh: Group Race to 4 + Knockout Best of 3; atau Group Custom + Knockout Race to 6.

Legacy Official tanpa `matchScoring` di-derive dari race-to / points / `raceToGamesGroup`+`Knockout` (`deriveMatchScoringFromLegacy`).

**Source of truth runtime**

- Official: `settings.matchScoring` (tersimpan). Race-to custom (mis. 8) dibaca lewat `getTournamentRaceToTarget` / `getTournamentGameRules` — **bukan** legacy `raceToGames` saja (yang terbatas 2/3/4/6).
- Dual-write legacy `matchScoreMode` / `raceToGames` hanya jika target termasuk preset, agar engine lama tetap aman.
- Fun Match / points flat: `matchScoreMode: points` menang — derive `matchScoring` **tidak** boleh memaksa mode games.

### 3.7 Leaderboard (sesi & bracket)

| Konteks | Sumber | Aturan |
| --- | --- | --- |
| **Americano / Mexicano** | Poin pemain sesi (`playerStats` / reclub) | Sort poin desc, lalu nama; Mexicano round ≥ 2 memakai ranking ini |
| **Group stage** | Standings per grup | Setiap meeting pasangan = 1 baris match; W/L/PTS/Game/WR |
| **Bracket Elimination / DS KO** | `buildTournamentLeaderboard` | Hanya **slot parent** (bukan child series legs). Multi-leg = 1 W/L setelah mayoritas |
| **Career ranking** | `rankingDeltaForMatch` | Official tier ±poin; **No Rank / open = 0**; Fun Match = 0; paid & free memakai skill tier yang sama |

Helper: `isBracketSeriesChildLeg` (`bracket-metadata.ts`) — child legs tidak menggelembungkan W/L leaderboard.

### 3.8 Statistik player (career + sesi)

| Lapisan | Kapan tersimpan | Sinkron ke |
| --- | --- | --- |
| **Sesi** (Live Score / manage / display) | Setiap update skor live + finalize | Payload `playerStats` lewat poll live/manage ([Bab 8](#8-realtime-public--manage-saat-live)) |
| **Career** (`player_matches` + wiki) | Hanya saat **finalize** match (bukan live ±) | Account history + wiki performance |

#### Win rate (WR)

**Definisi Gud Game:** match win rate = `wins ÷ matchesPlayed × 100` (1 desimal).

| Aturan | Detail |
| --- | --- |
| Denominator | Jumlah match yang sudah dimainkan (`played` / `G`), termasuk draw/tie jika format mengizinkan |
| Bukan | Set-win % atau game-win % — itu tetap di kolom **SET** / **GM** (dan dipakai tie-break ITF/FIP) |
| Ranking | Primer tetap **PTS** / wins; WR informatif (dan soft tie-break di beberapa board sesi) |
| Helper | `lib/tournaments/stats/win-rate.ts` → Groups, Fun Match, Official player, session `playerStats`, bracket leaderboard |
| Groups | Kolom **WR** di standings (# · Team · G · W · L · **WR** · SET/S · GM? · PTS); update real-time via poll |

#### Efek create-tournament terhadap career

| Setting turnamen | Efek career |
| --- | --- |
| Official Paid / Free | `statsTier` billing; poin ranking dari **skill tier** (sama untuk paid & free) |
| Tournament tier Bronze…International | ±1 / 3 / 5 / 8 / 10 per W/L |
| **No Rank** (`rankingMode: open`) | Poin ranking **0** |
| Fun Match / Partner | Tidak menambah ranking Gud Game |
| Match scoring / meetings / legs | Mempengaruhi kapan match selesai & berapa fixture; tiap fixture finalized = 1 baris history (kunci `·#matchId`) |

#### Finalize hooks

- Group / Group only / DS group → `recordGroupStageScore` → `syncOfficialMatchToPlayerHistory`
- Bracket / KO legs → `submitBracketMatchScore` → sync Official atau Fun
- Americano / Mexicano lobby → `completeReclubRound` → sync Fun dan/atau Official
- **Rematch** bracket → hapus baris history fixture + Champion placement, lalu wiki recompute

**Kunci anti-tabrakan:** `round` menyimpan label + `·#<fixtureId>` agar Custom meetings dan KO multi-leg tidak saling menimpa.

---

# Bagian B — Membuat & mengedit turnamen

## 4. Form create / edit Official

| | |
| --- | --- |
| Wizard | `components/admin/tournaments/tournament-create-wizard.tsx` |
| Validasi | `lib/validations/tournaments.ts` (`tournamentUpsertSchema`) |

Tanda **\*** = wajib.

### 4.1 Step Basics

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
| **Match scoring \*** | Ya (Official) | Best of / Race to / Total / Custom; Double Stage Race to → **Group + Knockout targets** terpisah |
| Max teams per group | Double Stage, Group only | |
| Teams advancing / 3rd place | Double Stage saja | |
| Allow draw | Double Stage, Group only | |
| Scoring type / Point / Duration | Americano & Mexicano | Points atau Timed (jam round) |
| Number of courts | Ya | 1–12; di-provision ke `tournament_courts` saat create/update & setiap manage/live poll |
| Number of session rounds | Official Americano (+ Fun Match / Mexicano) | `settings.maxRounds` (Mexicano: `mexicano.roundCount`) |
| Max teams / Players per team | Disarankan / default sport | |
| Summary / Description / Cover | Tidak | |
| **Venue \*** | Ya | + maps autocomplete |

### 4.2 Step Schedule & rules

| Field UI | Fungsi |
| --- | --- |
| Starts / Ends / Registration closes | Jadwal |
| **Structured match rules** (read-only) | Ringkasan family, format, tier, scoring, meetings/legs, Mexicano |
| Additional match notes (optional) | Catatan host saja |
| Equipment standards | Rich text |

### 4.3 Review

Seksi **Format & scoring** menampilkan family, format, tier/No Rank, match scoring, meetings/legs, Mexicano.

### 4.4 Validasi Official (penting)

- `categoryLabel` wajib Male | Female | Mix.
- `format` harus cocok `formatFamily`; Mexicano ditolak di Custom.
- Mexicano wajib payload `mexicano` (mode + roundCount).
- `officialBilling` paid | free; Paid → fee > 0; Free → fee tidak > 0.
- `rankingMode !== open` → tepat 1 `allowedTierLevels`; `open` → tier kosong diizinkan.
- Venue tidak boleh kosong (client).

---

## 5. Form create / edit Fun Match

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

**Tidak ada di Fun Match:** Category, billing Official, Double Stage / Mexicano / Group only, tournament tier, match family Custom.

---

## 6. Checklist field wajib

Gunakan checklist ini sebelum publish.

### 6.1 Official (Paid & Free)

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

### 6.2 Fun Match

- [ ] Name
- [ ] Match format (Americano / Elimination)
- [ ] Start & end
- [ ] Scoring + courts
- [ ] Tidak mengisi official billing / fee

---

# Bagian C — Operasional hari-H

## 7. Alur operasional per format

### 7.1 Official — Double Stage

1. Create (family, format, scoring, pool rules, tier/No Rank).
2. Publish; registrasi & konfirmasi tim.
3. **Live** → groups + fixtures (× meetings).
4. Manage **Groups**: standings (compact), Sync/Assign — tanpa daftar fixture panjang.
5. Manage **Match Schedule** (tab terpisah): Order of Play / By day / By court.
   - **Order of Play buckets:** Now (live / on court) · Next (called + next in queue) · Later · Done (disembunyikan jika kosong).
   - **Start** → buka Live scoring; start match di court otomatis set `callStatus=on_court` (Now).
   - Finalize match → `callStatus=done`.
   - **Schedule** → modal: Queue number, Court call (In queue / Called / On court / Finished), Scheduled start (opsional).
   - Validasi client + API (`playOrder` 0–9999, `callStatus` enum, `scheduledAt` ISO atau null).
   - Label stage & nama group ditampilkan di **baris terpisah** pada setiap match row.
6. Manage **Live scoring** — dual surface (command center + courtside):
   - **Command center:** sticky court strip (C1 … LIVE …); **hanya 1 scorepad expanded** (focus-one); court live lain = baris ringkas.
   - Saat ada court **live**, blok **Idle courts · start next** disembunyikan; host bisa buka lagi via “Show”. Idle otomatis tampil lagi jika tidak ada live.
   - Tab workspace: **Scoring | Standings | History**.
   - Leaderboard samping opsional; **Focus scoring** otomatis ON saat ≥2 court live.
   - **Courtside scorepad:** fullscreen opaque shell per court (`?section=scoring&court=<id>`). Tap **Courtside** / double-tap strip; Esc kembali.
   - Match rounds: Tabs/Stack; search; live matches di atas idle planning.
   - **Play again (rematch):** match yang sudah selesai hanya bisa di-start ulang lewat konfirmasi rematch (hasil lama masuk history; advancement slot di-rollback). Auto-assign idle court **tidak** mengantri match completed.
7. Publik: **Live Score** (timer), **Groups**, **Matches** (jadwal read-only), **Bracket** setelah KO.
8. Semua group selesai → knockout otomatis (retry **Generate knockout** di Groups jika perlu).
9. Score KO di Live scoring → juara; history & ranking sync.

**Catatan UI**

- Banner “Double stage settings” / “How double stage works” tidak ditampilkan.
- Lebar manage konsisten antar tab (`max-w-7xl`).
- Di desktop, sidebar section bisa di-collapse ke icon rail (preferensi tersimpan).
- **Reset knockout:** sebelum bracket di-score; regenerate hanya dari qualified.

### 7.2 Official — Group only

Langkah 1–5 sama group Double Stage.  
**Tidak** ada langkah knockout. Juara = standings akhir.

### 7.3 Official — Elimination

1. Create (+ Custom legs opsional).
2. Generate / seed bracket.
3. Live scoring bracket (series jika multi-leg).
4. Champion di final.

### 7.4 Official — Americano

1. Create + courts + points/timed + match scoring.
2. Join / assign.
3. Start rounds, score, finish / reshuffle.
4. Leaderboard individu.

### 7.5 Official — Mexicano

1. Create Original → Mexicano → Individual/Team + round count.
2. Live: planner Mexicano di manage scoring.
3. Publik melihat Live Score & history dari lobby rounds.
4. Round cap = `mexicano.roundCount`.

### 7.6 Fun Match — Americano / Elimination

Mirip di atas tanpa billing / category / ranking Official.

---

## 8. Realtime: public & manage saat Live

**Tujuan:** penonton di halaman publik dan host di manage melihat skor/standings yang sama tanpa hard refresh, dengan interval yang aman untuk Postgres.

### 8.1 Sumber data

| Surface | Hook / API | Isi utama |
| --- | --- | --- |
| Publik Live Score / Groups / History | `useTournamentLive` → `GET .../live` | `buildTournamentLivePayload` — matches, `doubleStage`, `matchHistory`, `playerStats` |
| Publik lobby Americano/Mexicano | `useTournamentLobby` (jika `hasLobbyRounds`) | Teams + reclub matches |
| Manage Live scoring | `useTournamentManageScoring` → `GET .../manage/scoring` | Courts, active matches, groups/bracket/rounds |
| Mutasi skor | Group / reclub / bracket score APIs | `invalidateQueries` live + manage-scoring (+ lobby jika relevan) |

### 8.2 Interval polling (aktif saat tab fokus)

| Query | Ada match `in_progress` | Live tanpa match aktif | Selesai / idle |
| --- | --- | --- | --- |
| Live publik | ~4s | ~6s | ~8–20s |
| Manage scoring | ~5s | ~15s | — |
| Lobby (jika enabled) | Lebih cepat | Lebih lambat | — |

Penulisan skor (±) **menjeda** poll manage sebentar agar GET stale tidak menimpa skor lokal (`isManageScoringWriteInFlight`).

### 8.3 Capabilities → tab & mode

`getFormatCapabilities(tournament)` mengontrol:

| Format | Groups | Match Schedule | Bracket | Manage scoring mode | Live payload |
| --- | --- | --- | --- | --- | --- |
| Double Stage (group) | ✅ | ✅ | Setelah KO | `groups` | Group matches + standings |
| Double Stage (KO) | ✅ (final standings) | ✅ | ✅ | `bracket` | Bracket live |
| Group only | ✅ | ✅ | ❌ | `groups` | Group only |
| Elimination | ❌ | ❌ | ✅ | `bracket` | Bracket |
| Americano / Mexicano | ❌ | ❌ | ❌ | `rounds` | Lobby rounds |

API menolak operasi ilegal (contoh: generate KO pada `group_only` / `mexicano`; generic bracket generate pada `double_stage`).

### 8.4 Apa yang harus sinkron

| Area | Perilaku yang diharapkan |
| --- | --- |
| **Settings → Live scoring** | `courtCount` / `maxRounds` / scoring rules persist saat upsert; `provisionTournamentCourts` di create/update + setiap `GET .../manage/scoring` dan `GET .../live`. Payload manage menyertakan `runtime` (`buildManageScoringRuntime`). |
| **Jumlah court** | Parallel capacity & idle courts mengikuti `tournament_courts` (= `settings.courtCount`). Bukan jumlah round RR. |
| **Round tabs** | Group RR dari `metadata.round` / `deriveGroupStageRoundNumber`. Lobby Americano/Mexicano memadatkan tab ke `maxRounds` / `mexicano.roundCount`. |
| **Skor court** | Live Score publik dalam interval poll berikutnya (atau segera setelah invalidate mutasi). |
| **Group round sync** | Live payload menyertakan `roundNumber` / `roundLabel`; fixture pending ikut agar tab Round publik = manage. |
| **Standings grup** | Tab Groups publik termasuk semua meetings + kolom WR. |
| **Knockout series** | Parent slot + legs; advance setelah mayoritas; pohon publik memakai parent slots. |
| **Schedule / Order of Play** | Host edit di manage **Match Schedule**; publik tab Matches read-only. |
| **Roster display** | `TeamPlayerList` (ikon + baris) di Groups / Matches / Live Score / History / bracket. |
| **Bracket tree roster** | Tinggi kartu menyesuaikan roster (hingga 6 pemain/side, sisanya `+N more`) agar connector tidak clipping. |
| **Live timer** | `LiveMatchTimer` di Live Score publik, manage, dan venue display. |
| **Live scoring dual surface** | Command center vs Courtside fullscreen; idle courts collapsed saat ada live; rematch completed hanya lewat konfirmasi Play again. |
| **Venue fullscreen display** | Tanpa Order of Play di TV. Multi-court max 6/halaman (hanya live). Kontrol Refresh / Fullscreen / Exit auto-hide. Sponsor strip di atas. |
| **Sponsor banners** | Manage → Display → max 6 logo; hanya di TV display, tidak di halaman publik. |
| **Score entry Live vs Paper** | Manage → Display: Live tablet atau paper pad lapangan; engine scoring sama. |

### 8.5 File acuan realtime

| Area | Path |
| --- | --- |
| Live payload | `lib/tournaments/live/build-payload.ts` |
| Poll intervals | `lib/tournaments/live/poll-intervals.ts` |
| Display scoring map | `lib/tournaments/live/display-scoring.ts` |
| Manage runtime snapshot | `lib/tournaments/manage/scoring-runtime.ts` |
| Court provision | `lib/tournaments/courts/service.ts` |
| Capabilities / guards | `lib/tournaments/format-capabilities.ts`, `lifecycle-guards.ts` |
| Group RR round | `lib/tournaments/double-stage/round-number.ts` |
| Hooks | `hooks/use-tournament-live.ts`, `use-tournament-manage-scoring.ts`, `use-double-stage-group-score.ts`, `use-tournament-lobby.ts`, `use-tournament-bracket.ts` |
| Public page | `components/tournaments/official-tournament-page.tsx` |
| Venue display | `tournament-display-client.tsx`, `display-multi-court-grid.tsx`, `display/display-venue-controls.tsx`, `display-session-leaderboard.tsx`, `display-bracket-slide.tsx`, `display-sponsor-strip.tsx` |
| Manage scoring UI | `fun-match-scoring-workspace.tsx`, `courtside-scorepad.tsx`, `fun-match-rounds-panel.tsx`, `match-round-tabs.tsx`, `fun-match-round-match-card.tsx` |
| Display config | `lib/tournaments/display-config-service.ts`, `upload-sponsor-banner.ts`, `manage/display-sponsor-banners-panel.tsx` |

**Smoke otomatis (tanpa DB):**

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

## 9. Registrasi Official (tim & klaim slot)

Alur Gud Game Official (free & paid) memakai **satu halaman** (bukan wizard 3 step). Hanya **captain** yang wajib login.

### 9.1 Satu layar daftar

1. **Team name** — wajib jika `playersPerTeam > 1`; singles boleh auto dari nama captain.
2. **Captain** — otomatis dari akun yang login.
3. **Partner slots** (0…`playersPerTeam - 1`), tiap slot bisa:
   - **Skip / solo** — kosongkan (underfill diizinkan)
   - **Search** — pilih player Gud Game yang sudah punya akun
   - **Invite email** — nama + email (+ phone opsional) untuk anggota yang belum punya akun
4. Satu CTA:
   - **Free:** Confirm registration → status langsung `confirmed`
   - **Paid:** Continue to payment → `pending_payment` + invoice Xendit → `confirmed` setelah bayar

**Kapasitas:** jika `maxTeams` penuh (termasuk hold `awaiting_confirmation` / `pending_payment`), tombol Register dinonaktifkan dan API menolak team baru.

**Anti-duplikat:** satu `userId` / email invite hanya boleh di **satu tim** dalam turnamen yang sama. Maksimum anggota = `playersPerTeam`.

**Edit roster:** captain boleh update daftar player selama status turnamen **upcoming** (belum live), termasuk setelah `confirmed`. Setelah live/completed, roster terkunci.

Edit sebelum bayar: `pending_payment` / legacy `awaiting_confirmation`.

### 9.2 Provisional roster + claim

| Mode slot | Data | Tampil di skor / roster | Ranking karier GG |
| --- | --- | --- | --- |
| Linked | `userId` | Ya | Langsung |
| Pending invite | nama + email + claim token | Ya (nama) | Setelah klaim akun |

Setelah registrasi **confirmed** (free) atau **paid**:

- Anggota linked mendapat email “team invitation”.
- Anggota pending mendapat email **Claim my spot** → `/sports/{sport}/tournaments/{slug}/claim?token=…`
- Klaim: login/daftar dengan **email yang sama** dengan invite → bind `userId`, hapus pending fields.
- Jika event sudah ada match selesai: history + poin di-backfill ke akun yang klaim.
- Deadline klaim: sampai akhir turnamen + 7 hari grace.
- Jika tidak pernah klaim: nama tetap di arsip event, **tanpa** masuk leaderboard karier.

Partner white-label guest tetap terpisah (tidak masuk ranking Gud Game) — jangan disamakan dengan Official claim.

### 9.3 URL & API terkait

| Item | Path |
| --- | --- |
| Form daftar | `/sports/{sport}/tournaments/{slug}/register` |
| Klaim slot | `/sports/{sport}/tournaments/{slug}/claim?token=…` |
| API register | `POST /api/tournaments/{sport}/{slug}/register` |
| API claim | `GET/POST /api/tournaments/{sport}/{slug}/claim` |

Manage Players menampilkan badge **Pending claim** untuk slot yang belum diklaim.

### 9.4 Tab Players (public)

Urutan sub-tab di halaman public **Players**:

1. **Leaderboard** (default) — ranking poin / W-L / diff
2. **Registered teams** — roster per tim

Overview menyediakan CTA **Leaderboard** dan **Registered teams**.

---

# Lampiran

## Lampiran A — Seed fixtures (local QA)

Dev-only scripts (bukan CI / bukan production). Dipakai untuk generate ulang data uji Official **FREE** di database local.

### A.1 Official FREE QA (`db:seed:fixtures`)

Perintah ini **selalu purge dulu** event seed lama (`qa-free-*` + slug fixture legacy), lalu recreate **54** turnamen Official free (Original + Custom × format × scoring). Status default **upcoming**, mulai ~14 hari ke depan, 8 tim, No Rank, billing free.

| Command | Kapan dipakai |
| --- | --- |
| `npm run db:seed:fixtures` | Local development. Host/creator = user **host** atau **super_admin** pertama yang aktif. |
| `npm run db:seed:fixtures -- --name you@email.com` | Creator dipaksa ke akun itu. Jika belum punya role host, script menambahkan host. |

```bash
npm run db:seed:fixtures
npm run db:seed:fixtures -- --name you@email.com
```

**Isi yang di-generate**

- 54 event, slug unik `qa-free-orig-*` dan `qa-free-cus-*`
- 8 tim per event (`QA Team 01` … `08`)
- Player dummy: `qa-p001@gudgame.local` … `qa-p016@gudgame.local`, password default `SeedPlayer1!` (override: `SEED_FIXTURE_PASSWORD`)
- Event completed / live / leftover slug ikut dihapus sebelum recreate → status kembali **upcoming**

**Flag tambahan**

| Command | Isi |
| --- | --- |
| `… -- --name you@email.com --go-live` | Recreate dengan status **live** (untuk tes scoring). Ditolak di production/CI. |
| `… -- --name you@email.com --ensure` | Create-if-missing saja (tidak mereset event yang sudah ada). |
| `npm run db:seed:fixtures:purge -- --players` | Hapus QA + legacy seed + semua `*@gudgame.local` tanpa recreate |

**Production:** setiap deploy CI/CD menjalankan `db:seed:fixtures:purge` dengan `DEPLOY_QA_FIXTURE_PURGE=true`. Script seed **tidak** dijalankan. Akun host/admin dan turnamen buatan user tidak dihapus.

### A.2 Double Stage per-tier (terpisah)

| Command | Isi |
| --- | --- |
| `npm run db:seed:double-stage -- --name you@email` | **5** Official Double Stage × 32 tim (satu per tier). Platinum & International = paid |
| `npm run db:seed:double-stage -- --name you@email --tier=gold --reset` | Satu tier |
| `npm run db:seed:double-stage -- --name you@email --go-live` | Langsung live (groups init) |
| `npm run db:seed:double-stage:purge -- --all` | Hapus fixture DS per-tier |

### A.3 Manual smoke saat Live (setelah seed `--go-live`)

1. Manage → Live scoring: ± skor / complete match.
2. Publik Live Score + Groups/Bracket (sesuai format) ter-update setelah poll / invalidate.
3. Fullscreen `/display`: race-to games memakai `live.scoring.raceToGames` (termasuk custom N).
4. Custom Double Stage: fixtures × meetings; KO slots × legs → advance mayoritas.
5. Original: pastikan meetings/legs tetap 1 meski event pernah Custom.
6. Rematch: pilih match completed di idle court → **Play again** → konfirmasi → court start tanpa error “Only pending matches…”.

---

## Lampiran B — Matriks uji otomatis

Status verifikasi terakhir: **2026-08-13** (`vitest` tournaments + player-performance = hijau).

| Dimensi | Kasus yang dikunci tes |
| --- | --- |
| Billing | Paid + fee; Free tanpa fee; Free+fee ditolak; Paid tanpa fee ditolak |
| Family | Original semua format; Custom tanpa Mexicano; Mexicano+Custom ditolak |
| Format | DS / Group only / Elimination / Americano / Mexicano capabilities + manage mode |
| Scoring | Race to 8, Best of, Total, Custom large, ±1 intra-game, labels live; **group vs KO independent modes** |
| Meetings / legs | RR × N; series majority; Original paksa 1; save Original hapus customMatch |
| Leaderboard | Series child di-skip; Mexicano sort poin |
| Ranking | Tier ±poin; No Rank = 0; Fun Match = 0; skill hilang = 0 (bukan fallback Gold) |
| Player history | Fixture key `·#matchId`; rematch membersihkan history; placement Official upsert |
| Realtime | Poll 4s/6s publik, 5s/15s manage; display clamp 5–120s; fullscreen games map |

---

## Lampiran C — Maintenance & referensi teknis

### C.1 Peta perubahan → bab dokumen

| Perubahan di kode | Perbarui bab |
| --- | --- |
| Format / family / meetings / legs / Mexicano / Group only | Bab 2, 7, 8 |
| Field form Official | Bab 4, 6 |
| Match scoring / No Rank / leaderboard / WR | Bab 3, 4 |
| Realtime / polling / capabilities / rematch start | Bab 7, 8 |
| Fun Match | Bab 5, 6 |
| Registrasi / claim | Bab 9 |
| Seed QA | Lampiran A |
| Matriks uji / regresi | Lampiran B |

### C.2 File kode acuan (non-exhaustive)

| Area | Path |
| --- | --- |
| Validasi | `lib/validations/tournaments.ts` |
| Match config / dual-read | `lib/tournaments/match-config.ts`, `settings.ts` |
| Scoring resolver | `lib/tournaments/scoring/match-scoring.ts` |
| Format options / capabilities / guards | `form/format-options.ts`, `format-capabilities.ts`, `format-guards.ts` |
| Wizard Official | `components/admin/tournaments/tournament-create-wizard.tsx` |
| Double Stage / group meetings | `lib/tournaments/double-stage/` |
| KO series | `brackets/series-legs.ts`, `bracket-metadata.ts` |
| Bracket leaderboard | `brackets/leaderboard.ts` |
| Mexicano | `lib/tournaments/mexicano/` |
| Ranking points | `lib/account/player-performance/points.ts` |
| Session stats | `stats/compute.ts`, `stats/win-rate.ts`, `stats/fun-match-standings.ts`, `stats/official-standings.ts` |
| Live / poll / display | `lib/tournaments/live/` |

---

*Gud Game — Panduan Pengguna Turnamen. Jaga dokumen ini selaras dengan aplikasi yang berjalan.*
