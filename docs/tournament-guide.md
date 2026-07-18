# Panduan Turnamen Gud Game

> **Dokumen hidup.** Perbarui file ini setiap kali ada perubahan, penambahan, atau rombak fitur seputar turnamen (format match, scoring, form create/edit, aturan lifecycle, dsb.).  
> Terakhir diselaraskan dengan aplikasi: **2026-07-18**.  
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
8. [Catatan maintenance dokumen](#8-catatan-maintenance-dokumen)

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
| Match format | **Wajib**: Double Stage / Elimination / Americano | Sama |
| Ranking / stats tier | `official_paid` | `official_free` |
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
| Jadwal | Start & end **wajib** |
| Ranking | Tidak masuk tier official |

Fun Match biasanya dibuat lewat wizard Fun Match / Reclub (UI terpisah dari wizard Official).

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
| Win / Draw / Loss points | `standingsScoring.winPoints` dkk. | Poin klasemen |
| Allow draw results | `standingsScoring.allowDraw` | Izinkan skor imbang di group |
| Include 3rd place match | `doubleStage.thirdPlaceEnabled` | Bracket juara 3 |
| Match score format | `matchScoreMode` | `games` (Race to N) atau `points` (flat) |
| Race to | `raceToGames` | Target game (umum: 4 atau 6) untuk mode games |

**Aturan group stage**

- Fixture round-robin digenerate saat turnamen live + tim cukup.
- Skor live di court; finalize menulis hasil ke history & standings.
- Draw hanya jika `allowDraw` aktif; jika tidak, skor imbang ditolak saat finalize.
- Qualifikasi (Qualified / Eliminated) baru bermakna setelah semua fixture grup selesai.
- Setelah semua match group selesai → host dapat **advance** ke knockout (bracket di-seed dari standings).

**Aturan knockout (setelah advance)**

- Pemenang maju; yang kalah tersisih (kecuali bracket 3rd place jika diaktifkan).
- Live scoring di court / manage scoring mode bracket.
- Mode skor mengikuti settings turnamen yang sama (points atau race-to-games).

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
| **Match format \*** | Ya (Official) | Double Stage / Elimination / Americano — harus dipilih sadar |
| Max teams per group | Double Stage | Lihat §2.1 |
| Teams advancing per group | Double Stage | Tidak boleh > max/group |
| Win / Draw / Loss points | Double Stage | Poin klasemen |
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

**Tidak ada:** Category, Official billing, Double Stage settings, registration fee.

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

### 5.3 Americano points

- Poin match menambah total individu (bukan hanya win/loss 3-1-0 klasik).
- Leaderboard sesi berbasis agregat poin pemain.

### 5.4 Standings Double Stage (group)

Kolom umum:

| Kolom | Arti |
| --- | --- |
| M | Matches played |
| W / L | Wins / Losses |
| Game atau +/- | Games won–lost (mode games) atau selisih skor (mode points) |
| PTS | Poin klasemen dari win/draw/loss points |

Tie-breaker (default): points → wins → scoreDiff → scoreFor → head-to-head → manual.

---

## 6. Alur operasional per format

### 6.1 Official — Double Stage

1. Create (isi Category \*, Format Double Stage \*, billing, venue, dsb.).
2. Publish / set jadwal; buka registrasi.
3. Konfirmasi tim; saat **Live**, generate groups + fixtures.
4. **Live scoring** group di court (multi-court).
5. Setelah semua group selesai → **Advance to knockout**.
6. Seed & mainkan bracket; finalize juara.
7. History, standings, stats pemain tersinkron sesuai aturan sync aplikasi.

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

## 8. Catatan maintenance dokumen

Saat mengubah fitur turnamen, update bagian terkait di file ini:

| Perubahan | Bagian docs yang harus diubah |
| --- | --- |
| Format baru / rename | §2, §6, tabel ketersediaan |
| Field form create/edit | §3 atau §4 + §7 |
| Scoring (race-to, deuce, timed) | §5 |
| Aturan group / bracket / americano | §2 + §6 |
| Validasi Zod / field wajib | §3.4 + §7 |
| Official vs Fun Match policy | §1 |

**File kode acuan (non-exhaustive)**

- Validasi: `lib/validations/tournaments.ts`
- Settings / race-to: `lib/tournaments/settings.ts`, `lib/tournaments/scoring/game-mode.ts`
- Format options: `lib/tournaments/form/format-options.ts`
- Capabilities: `lib/tournaments/format-capabilities.ts`
- Wizard Official: `components/admin/tournaments/tournament-create-wizard.tsx`
- Wizard Fun Match: `components/tournaments/reclub/reclub-tournament-wizard.tsx`
- Double Stage service: `lib/tournaments/double-stage/`

---

*Gud Game tournament product documentation — keep in sync with the running app.*
