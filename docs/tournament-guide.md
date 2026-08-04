# Panduan Turnamen Gud Game

> **Dokumen hidup.** Perbarui file ini setiap kali ada perubahan, penambahan, atau rombak fitur seputar turnamen (format match, scoring, form create/edit, aturan lifecycle, dsb.).  
> Terakhir diselaraskan dengan aplikasi: **2026-08-04**.  
> Rule agen: `.cursor/rules/tournament-docs.mdc` — sync otomatis saat file turnamen terkait diubah.

Dokumen ini menjelaskan:

1. Jenis turnamen (**Official** vs **Fun Match**)
2. Format pertandingan (**Double Stage**, **Elimination**, **Americano**)
3. Setiap input form saat **create / edit** turnamen
4. Aturan scoring & alur operasional per format

Nama field di UI umumnya berbahasa Inggris; penjelasan di sini berbahasa Indonesia agar mudah dipakai sebagai panduan operasional.

---

## Daftar isi

1. [Jenis turnamen](#1-jenis-turnamen)
2. [Format pertandingan (match format)](#2-format-pertandingan-match-format)
3. [Form create Official](#3-form-create--edit-official)
4. [Form create Fun Match](#4-form-create--edit-fun-match)
5. [Aturan scoring](#5-aturan-scoring)
6. [Alur operasional per format](#6-alur-operasional-per-format)
7. [Checklist field wajib](#7-checklist-field-wajib)
8. [Seed fixtures (local QA)](#8-seed-fixtures-local-qa)
9. [Catatan maintenance dokumen](#9-catatan-maintenance-dokumen)

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
| **Tournament tier \*** | **Wajib** satu tier: Bronze / Silver / Gold / Platinum / International·National | Sama |
| Match format | **Wajib**: Double Stage / Elimination / Americano | Sama |
| Eligibility | Player tier **harus sama** dengan tournament tier | Sama |
| Ranking points | ± poin sesuai tier turnamen (lihat §5.3) | Sama |
| Double Stage | Tersedia | Tersedia |
| Registrasi | Checkout / konfirmasi sesuai billing | Konfirmasi tanpa bayar |

**Karakteristik umum Official**

- Ada halaman publik turnamen, registrasi tim, manage panel (scoring, bracket, groups, staff).
- Aturan dapat dipisah: match format rules, equipment standards, eligibility (rich text).
- Status publik: Draft → Upcoming / Live / Completed (otomatis dari tanggal jika published).

### 1.2 Fun Match (`tournamentType: fun_match`)

Sesi komunitas / rekreasi. **Tidak** memengaruhi ranking official.

| Aspek | Nilai |
| --- | --- |
| Billing | Tidak dipakai (`officialBilling` harus kosong) |
| Fee | Harus 0 / tidak ada |
| Category | Tidak ditampilkan di form Fun Match |
| Format | Americano atau Elimination (bukan Double Stage) |
| Tier gate | **Tidak ada** — semua player boleh join |
| Jadwal | Start & end **wajib** |
| Ranking | **Tidak** memengaruhi tier, ranking, win rate, atau poin karier |

Fun Match biasanya dibuat lewat wizard Fun Match / Reclub (UI terpisah dari wizard Official).

### 1.3 Partner white-label (`partnerTenant`)

Partner organizations create events on their own site (`/{partnerSlug}`). Stats stay **off Gud Game career rankings**.

| Aspek | Partner white-label |
| --- | --- |
| Surface type | Disimpan sebagai `fun_match` + `partnerId` (bukan Official Gud Game) |
| Billing | Free / Paid (`officialBilling` + `registrationFeeIdr`) untuk guest checkout |
| Prize pool | Opsional (`prizePoolIdr`) — tampil di halaman public turnamen |
| Skill / tournament tier | **Tidak ada** — `partnerTenant` melewati validasi tier |
| Format | Double Stage / Elimination / Americano (wizard partner) |
| Guest registration | Status `registered` (setelah daftar / bayar) → partner **kurasi Confirm** → `confirmed` (+ squad). Public Players hanya menampilkan yang `confirmed`. |
| Player history (`/{slug}/players`) | **Staff partner saja** — tidak dipublish ke visitor publik |

Wizard: `components/partners/partner-tournament-wizard.tsx`. Payload mengirim `tournamentType`, `officialBilling`, `registrationFeeIdr`, `prizePoolIdr` opsional (+ `partnerTenant: true` di API).

---

## 2. Format pertandingan (match format)

Ketersediaan format bergantung pada jenis turnamen dan (sebagian) sport defaults.

| Format | Kode | Official | Fun Match | Ringkas |
| --- | --- | --- | --- | --- |
| **Double Stage** | `double_stage` | ✅ | ❌ | Group stage (round-robin) → knockout |
| **Elimination** | `single_elimination` | ✅ | ✅ | Bracket knockout |
| **Americano** | `americano` | ✅ | ✅ | Rotasi pasangan/lawan, poin per pemain |

### 2.1 Double Stage (hanya Official)

**Alur**

1. **Group stage** — tim dibagi ke grup; bermain round-robin dalam grup.
2. Standings dihitung (W/L/PTS + Game atau +/- sesuai mode skor).
3. Top N per grup **advance** ke knockout.
4. **Knockout** — single elimination hingga juara (opsional laga juara 3).

**Setting khusus Double Stage (form)**

| Field UI | Setting key | Fungsi |
| --- | --- | --- |
| Max teams per group | `doubleStage.maxTeamsPerGroup` | Batas ukuran grup (2–8) |
| Teams advancing per group | `doubleStage.teamsAdvancePerGroup` | Berapa tim lolos per grup (≤ max/group) |
| Best runner-up slots | `doubleStage.bestRunnerUpSlots` | Slot ekstra knockout dari runner-up terbaik lintas grup (0 = off) |
| Allow draw results | `standingsScoring.allowDraw` | Izinkan skor imbang di group |
| Include 3rd place match | `doubleStage.thirdPlaceEnabled` | Bracket juara 3 |
| Match score format | `matchScoreMode` | `games` (Race to N) atau `points` (flat) |
| Race to | `raceToGames` | Target game (umum: 4 atau 6) untuk mode games |

> **Catatan:** Win / Draw / Loss points **tidak** lagi diedit di form. Klasemen grup memakai default tetap (3 / 1 / 0). Poin ranking player memakai skema tier turnamen (§5.3), bukan input W/D/L.

**Aturan group stage**

- Fixture round-robin digenerate saat turnamen live + tim cukup.
- Skor live di court; finalize menulis hasil ke history & standings.
- Draw hanya jika `allowDraw` aktif; jika tidak, skor imbang ditolak saat finalize.
- Qualifikasi (Qualified / Eliminated) baru bermakna setelah **semua** fixture grup di seluruh turnamen selesai (bukan per-grup di tengah jalan), dan hanya jika sudah ada hasil yang benar-benar dimainkan. Badge tidak muncul sebelum turnamen / group stage dimulai.
- Setelah top N per grup, opsional **best runner-up**: tim peringkat `teamsAdvance+1` dari tiap grup diurutkan lintas pool dengan tie-breaker yang sama; `bestRunnerUpSlots` terbaik ikut **qualified**.
- Setelah semua match group selesai → knockout bracket **di-generate otomatis** dari tim yang lolos saja (tombol Generate di Groups tetap ada sebagai retry). Generic “generate bracket” untuk semua tim **dilarang** pada format double stage.
- **Match schedule**: host mengatur kickoff (`scheduledAt`) di manage → Groups (FIFA-style schedule board). Jadwal yang sama tampil di halaman publik tab **Matches**.
- Reset bracket knockout: menghapus pohon bracket, mengembalikan `phase` ke `group`, membersihkan seed knockout — **tidak** membuka lagi semua tim ke elimination; regenerate harus lewat advance/auto dari qualified teams.

**Aturan knockout (setelah advance)**

- Hanya tim **qualified** yang masuk bracket (bukan seluruh field).
- Pemenang maju; yang kalah tersisih (kecuali bracket 3rd place jika diaktifkan).
- Live scoring di court / manage scoring mode bracket.
- Mode skor mengikuti settings turnamen yang sama (points atau race-to-games); skor games sinkron di manage, public Matches, Groups, Live Score, dan History.

### 2.2 Elimination (`single_elimination`)

**Alur**

1. Bracket digenerate / di-seed (random atau manual, tergantung konfigurasi seeding).
2. Match dimainkan di court; pemenang maju ke slot berikutnya.
3. Final menentukan juara.

**Aturan**

- Tidak ada group stage.
- Bye / walkover mungkin muncul jika jumlah tim bukan power-of-two (tergantung engine bracket).
- Rematch / re-score mengikuti aturan manage bracket (hasil sebelumnya bisa masuk history).
- Fun Match Elimination: fokus sesi komunitas, tanpa fee/category official.

### 2.3 Americano (`americano`)

**Alur**

1. Pemain/tim masuk lobby.
2. Setiap round: pasangan & lawan di-rotasi (planner Americano).
3. Skor per match; agregat poin per pemain untuk leaderboard sesi.
4. Round bisa di-reshuffle / finish sesuai manage panel.

**Aturan**

- Tidak memakai bracket elimination klasik.
- Scoring: **points** (first to N) atau **timed** (durasi round).
- Pemenang sesi = total poin individu tertinggi (bukan “juara bracket”).
- Parallel courts: jumlah court membatasi match yang jalan bersamaan.

---

## 3. Form create / edit Official

Wizard: `components/admin/tournaments/tournament-create-wizard.tsx`  
Validasi server: `lib/validations/tournaments.ts` (`tournamentUpsertSchema`).

Tanda **\*** di UI = field wajib.

### 3.1 Step Basics

| Field UI | Wajib? | Fungsi / catatan |
| --- | --- | --- |
| **Name \*** | Ya | Nama publik turnamen |
| Visibility | Ya (default) | Draft (tersembunyi) atau Published (status otomatis dari tanggal) |
| **Registration billing \*** | Ya (Official) | Paid atau Free |
| **Registration fee (IDR) \*** | Ya jika Paid | Harus > 0; ditolak jika Free + fee > 0 |
| Prize pool (IDR) | Tidak | Opsional (Free ditandai optional di UI) |
| **Category \*** | Ya (Official paid & free) | Male / Female / Mix — menentukan kategori peserta |
| **Tournament tier \*** | Ya (Official paid & free) | Satu tier: Bronze / Silver / Gold / Platinum / International·National — eligibility exact-match + ranking ±poin |
| **Match format \*** | Ya (Official) | Double Stage / Elimination / Americano — harus dipilih sadar |
| Max teams per group | Double Stage | Lihat §2.1 |
| Teams advancing per group | Double Stage | Tidak boleh > max/group |
| Allow draw | Double Stage | Toggle |
| Include 3rd place match | Double Stage | Toggle |
| Match score format | Double Stage | Race to games vs flat points |
| Race to | Jika games mode | 4 atau 6 (opsi umum) |
| Scoring type | Ya | Points atau Timed rounds |
| Point per match / Round duration | Ya (sesuai type) | Target skor flat atau menit per round |
| Number of courts | Ya | 1–12 |
| Max teams | Disarankan | Kapasitas registrasi |
| Players per team | Ya (default sport) | Mis. padel = 2 |
| Short summary | Tidak | Rich text singkat untuk listing |
| Description | Tidak | Deskripsi panjang |
| Cover image | Tidak | Upload cover |
| **Venue \*** | Ya | Lokasi + autocomplete / maps |

### 3.2 Step Schedule & rules

| Field UI | Wajib? | Fungsi |
| --- | --- | --- |
| Starts at / Ends at | Disarankan Official; Fun Match wajib | Jadwal event |
| Registration closes | Tidak | Batas daftar |
| Match format rules | Tidak | Rich text aturan format pertandingan |
| Equipment standards | Tidak | Standar peralatan |

### 3.3 Review

Ringkasan semua pilihan sebelum submit. Submit menjalankan validasi seluruh step + schema Zod di API.

### 3.4 Validasi Official (penting)

- `categoryLabel` **wajib** Male | Female | Mix.
- `format` **wajib** salah satu format yang diizinkan; Double Stage hanya untuk `official`.
- `officialBilling` wajib paid | free.
- Paid → `registrationFeeIdr` > 0.
- Free → fee tidak boleh > 0.
- `allowedTierLevels` **wajib tepat 1** skill tier (Bronze…International).
- Venue tidak boleh kosong (client wizard).

---

## 4. Form create / edit Fun Match

Wizard: `components/tournaments/reclub/reclub-tournament-wizard.tsx`.

| Field UI | Wajib? | Fungsi |
| --- | --- | --- |
| **Fun Match name \*** | Ya | Nama sesi |
| Short summary | Tidak | Card / header |
| **Match format** | Ya (default tersedia) | Americano atau Elimination saja |
| Players per team | Ya | Ukuran squad |
| Max teams / squads | Ya | Kapasitas lobby |
| Number of rounds | Opsional | Batas round (Americano / sesi) |
| Scoring type | Ya | Points / Timed |
| Point per match / Round duration | Ya | Sesuai scoring type |
| Number of courts | Ya | Parallel courts |
| **Start / End \*** | Ya (schema) | Waktu sesi |
| Full description | Tidak | Detail |
| House rules | Tidak | Aturan rumah opsional |
| Venue | Sesuai UI wizard | Lokasi sesi |

**Tidak ada:** Category, Official billing, Double Stage settings, registration fee, tournament tier gate.

---

## 5. Aturan scoring

### 5.1 Flat points (`matchScoreMode: points` atau default non-games)

- Skor match = angka poin langsung (contoh 21–18).
- **First to N** dari `pointsPerMatch` (11 / 15 / 21 / 25 / 30).
- Deuce mengikuti `deuceConfig` (threshold, max score, win-by).
- **Timed**: match berjalan sesuai `roundDurationMinutes`; skor di-finalize saat round selesai.

### 5.2 Race to games (`matchScoreMode: games`)

Digunakan terutama Double Stage olahraga raket (mis. padel).

- **Skor besar** = jumlah game dimenangkan (contoh **4–1**).
- Dalam 1 game: progres rally **0 → 15 → 30 → 40**, lalu game +1.
- Deuce dalam game: `golden_point` (poin berikutnya menang) atau `advantage` (harus unggul 2).
- Match selesai saat satu sisi mencapai `raceToGames` (umum **4** atau **6**).
- Standings menampilkan kolom **Game** (agregat won–lost), bukan hanya +/- poin flat.
- History / live score menampilkan label **Games**.

### 5.3 Ranking points (Official skill tier)

Setiap Official tournament punya **satu** skill tier. Setelah match selesai (semua format Official):

| Tournament tier | Win | Loss |
| --- | --- | --- |
| Bronze | +1 | −1 |
| Silver | +3 | −3 |
| Gold | +5 | −5 |
| Platinum | +8 | −8 |
| International / National | +10 | −10 |

- Poin net memengaruhi **tier player**, ranking, dan win rate karier (hanya match Official).
- Eligibility: player hanya boleh register turnamen dengan **tier yang sama** (exact match).
- Fun Match: **0** poin ranking; tidak memengaruhi tier / win rate / ranking.

### 5.4 Americano points (sesi)

- Poin match menambah total individu sesi (bukan ranking karier).
- Leaderboard sesi berbasis agregat poin pemain.

### 5.5 Standings Double Stage (group)

Kolom umum:

| Kolom | Arti |
| --- | --- |
| M / G | Matches / Games played (label UI) |
| W / L | Wins / Losses |
| Game atau +/- | Games won–lost (mode games) atau selisih skor (mode points) |
| PTS | Poin klasemen grup (default tetap 3 / 1 / 0 — bukan input form) |

Tie-breaker default (points/goals sports): points → wins → scoreDiff → scoreFor → head-to-head → manual.

Tie-breaker padel / tennis (games/sets, ITF-ish): points → wins → matchesPlayed → head-to-head → setWinPct (wins/played) → gameWinPct (scoreFor/(scoreFor+scoreAgainst)) → manual.

---

## 6. Alur operasional per format

### 6.1 Official — Double Stage

1. Create (isi Category \*, Format Double Stage \*, billing, venue, dsb.).
2. Publish / set jadwal; buka registrasi.
3. Konfirmasi tim; saat **Live**, generate groups + fixtures.
4. (Opsional) Atur **match schedule** / kickoff di manage → Groups; tampil di publik tab Matches.
5. **Live scoring** group di court (multi-court) — mode Race to N jika diaktifkan.
6. Setelah semua group selesai → knockout **otomatis** dari tim qualified (retry Generate di Groups jika perlu).
7. Seed & mainkan bracket; finalize juara.
8. History, standings, stats pemain tersinkron sesuai aturan sync aplikasi.

**Reset knockout:** hanya sebelum match bracket di-score. Setelah reset, phase kembali ke group; regenerate lagi hanya dari standings (bukan semua tim).

### 6.2 Official — Elimination

1. Create dengan format Elimination.
2. Registrasi & konfirmasi tim.
3. Generate / seed bracket (random atau manual).
4. Live scoring bracket di court.
5. Champion ditentukan di final.

### 6.3 Official — Americano

1. Create format Americano + courts + points/timed.
2. Pemain join / di-assign.
3. Start rounds, score, finish round, optional reshuffle.
4. Leaderboard individu.

### 6.4 Fun Match — Americano / Elimination

Mirip di atas, tanpa billing/category/ranking official. Fokus sesi komunitas + history sesi.

---

## 7. Checklist field wajib

### Official (Paid & Free)

- [ ] Name
- [ ] Registration billing (Paid / Free)
- [ ] Registration fee (hanya Paid)
- [ ] **Category (Male / Female / Mix)**
- [ ] **Match format**
- [ ] Scoring type + point/duration terkait
- [ ] Number of courts
- [ ] Venue
- [ ] Double Stage extras jika format = Double Stage (max/group, advance ≤ max/group, dll.)

### Fun Match

- [ ] Name
- [ ] Match format (Americano / Elimination)
- [ ] Start & end datetime
- [ ] Scoring + courts (sesuai form)
- [ ] Tidak mengisi official billing / fee

---

## 8. Seed fixtures (local QA)

Dev-only scripts (bukan CI). Creator harus sudah ada di DB.

| Command | Isi |
| --- | --- |
| `npm run db:seed:double-stage -- --name you@email` | **5** Official Double Stage × 32 tim (satu per tier Bronze→International). Platinum & International = paid; sisanya free. |
| `npm run db:seed:double-stage -- --name you@email --tier=gold --reset` | Hanya satu tier |
| `npm run db:seed:double-stage -- --name you@email --go-live` | Langsung status live (groups init) |
| `npm run db:seed:double-stage:purge -- --all` | Hapus semua fixture DS per-tier |
| `npm run db:seed:fixtures -- --name you@email` | Matrix: Official free/paid × Americano/Elimination + Fun Match Americano/Elimination (16 tim, Official = Gold tier) |
| `npm run db:seed:fixtures:purge` | Hapus matrix fixtures |

**Deploy (CI/CD):** setelah migrate + bootstrap-admin, job `Ensure QA tournament fixtures (idempotent)` menjalankan:

- `db:seed:double-stage -- --ensure --tier=gold --name <host>`
- `db:seed:fixtures -- --ensure --name <host>`

Dengan `ALLOW_DEPLOY_FIXTURE_SEED=true`. Mode **ensure** hanya membuat fixture yang belum ada; **tidak** memakai `--reset` / purge. Host default `juwonoindonesia@gmail.com` (override secret `SEED_FIXTURE_HOST_EMAIL`). Jika akun host belum ada, seed di-skip tanpa gagalkan deploy.

Player dummy: `*@gudgame.local`, password default `SeedPlayer1!` (override via `SEED_DOUBLE_STAGE_PASSWORD` / `SEED_FIXTURE_PASSWORD`).

---

## 9. Catatan maintenance dokumen

Saat mengubah fitur turnamen, update bagian terkait di file ini:

| Perubahan | Bagian docs yang harus diubah |
| --- | --- |
| Format baru / rename | §2, §6, tabel ketersediaan |
| Field form create/edit | §3 atau §4 + §7 |
| Scoring (race-to, deuce, timed) | §5 |
| Aturan group / bracket / americano / schedule | §2 + §6 |
| Validasi Zod / field wajib | §3.4 + §7 |
| Official vs Fun Match policy | §1 |
| Seed QA fixtures | §8 |

**File kode acuan (non-exhaustive)**

- Validasi: `lib/validations/tournaments.ts`
- Settings / race-to: `lib/tournaments/settings.ts`, `lib/tournaments/scoring/game-mode.ts`
- Format options: `lib/tournaments/form/format-options.ts`
- Capabilities: `lib/tournaments/format-capabilities.ts`
- Wizard Official: `components/admin/tournaments/tournament-create-wizard.tsx`
- Wizard Fun Match: `components/tournaments/reclub/reclub-tournament-wizard.tsx`
- Wizard Partner: `components/partners/partner-tournament-wizard.tsx`
- Double Stage service: `lib/tournaments/double-stage/`
- Match schedule: `lib/tournaments/double-stage/schedule.ts`, `components/tournaments/double-stage/match-schedule-board.tsx`
- Bracket reset (double stage): `lib/tournaments/brackets/reset.ts`

---

*Gud Game tournament product documentation — keep in sync with the running app.*
