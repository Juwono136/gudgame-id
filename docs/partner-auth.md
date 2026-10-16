# Partner Player Authentication — User Manual

| | |
| --- | --- |
| **Dokumen** | Panduan autentikasi member/player partner |
| **Produk** | Gud Game white-label partners |
| **Versi konten** | 2026-08-27 (dual-session UX) |
| **Audiens** | Partner staff, player/member, developer |

> **Docs hub:** [README.md](./README.md) · Partner overview: [partners.md](./partners.md) · Platform auth/roles: [auth-and-roles.md](./auth-and-roles.md)

> Akun member partner **terpisah** dari akun Gud Game dan dari partner lain. Staff/owner partner tetap login lewat Gud Game.

---

## 1. Ringkasan

Setiap partner (`/{partnerSlug}`) punya:

- Halaman autentikasi sendiri (login, sign up, forgot/reset password, verify email)
- Tabel identitas sendiri (`partner_identities`) — email unik **per partner**
- Session cookie sendiri (`gg_pps_<slug>`) — tidak dipakai Gud Game
- Data player / turnamen / statistik tetap di scope `partnerId`

| Actor | Login di | Setelah login |
| --- | --- | --- |
| **Member / player** | `/{slug}/login` | Tetap di situs partner |
| **Staff / owner** | `/login` (Gud Game) | `/dashboard/partner` |

Tidak ada SSO antara Gud Game ↔ partner, atau antar partner.

---

## 2. Halaman member

| Halaman | URL |
| --- | --- |
| Sign in | `/{slug}/login` |
| Sign up | `/{slug}/signup` |
| Forgot password | `/{slug}/forgot-password` |
| Forgot sent | `/{slug}/forgot-password/sent` |
| Reset password | `/{slug}/reset-password?token=…` |
| Verify email | `/{slug}/verify-email?token=…` |
| Check email | `/{slug}/check-email` |
| My account | `/{slug}/account` |

Setelah login sukses, redirect hanya diizinkan ke path di bawah `/{slug}/…` (tidak ke `/dashboard` atau partner lain).  
Jika member sudah login, `/login` dan `/signup` dialihkan ke `/account`.

---

## 3. Alur member

### 3.1 Sign up

1. **Dengan Google** (tombol di bawah form): langsung akun verified + session — tidak perlu email verifikasi.
2. **Dengan email**: isi nama, email, phone, password (aturan password sama Gud Game).
3. Sistem membuat `partner_identities` + menghubungkan / membuat `partner_players` (claim guest lama dengan email yang sama jika ada).
4. Email verifikasi dikirim dengan **branding partner** (logo/nama, CTA ke situs partner, footer “Powered by Gud Game”).
5. User membuka link → email verified → session dibuat → home partner.

### 3.2 Sign in

1. Email + password di partner itu saja, **atau** Continue with Google (jika Firebase dikonfigurasi).
2. Email/password: email harus sudah verified.
3. Google: email Google harus verified di Google; akun partner langsung marked verified.
4. Player yang di-archive staff **tidak bisa** login (session lama juga dibatalkan).
5. Session cookie `gg_pps_<slug>` diset (HttpOnly, Secure di production, SameSite=Lax, Path=`/`).
6. Akun Google-only yang mencoba password mendapat pesan memakai Google / Forgot password untuk set password.

### 3.2.1 Sign in / Sign up with Google

Alur (sama di login & signup; endpoint tunggal):

1. Client: Firebase popup → ID token.
2. `POST /api/partner/public/{slug}/auth/google` dengan `{ idToken, callbackUrl? }`.
3. Server verifikasi token lewat Firebase Admin (`verifyFirebaseGoogleIdToken`).
4. Resolve identitas **hanya** di `partner_identities` untuk `partnerId` ini:
   - cocok `google_uid` → login
   - cocok email → link `google_uid` + verifikasi email → login
   - baru → buat identity (password null, email verified) + player row → login
5. Set cookie session partner (bukan Better Auth Gud Game).

| Aturan | Perilaku |
| --- | --- |
| Isolasi | Google UID unik per partner; email sama di partner lain / Gud Game = akun terpisah |
| Linking | Email + password yang sudah ada bisa di-link Google (membuktikan ownership inbox) |
| Password | Google-only: `password_hash` null; bisa ditambah lewat Forgot/Reset password |
| Non-interference | Link Google **tidak** menghapus/mengubah `password_hash`; signup/login email+password tetap utuh |
| Race | Insert baru yang bentrok unique → retry sebagai login (aman concurrent) |
| Firebase client | Setelah ID token didapat, client `signOut` Firebase — session app tetap cookie-based |
| Env | Butuh `NEXT_PUBLIC_FIREBASE_*` + `FIREBASE_*` Admin — jika belum ada, tombol Google disembunyikan |
| Rate limit | Tier `partnerPlayerAuth` + Origin check |

UI: tombol outline + ikon Google di bawah divider “or” pada `/{slug}/login` dan `/{slug}/signup` (`PartnerGoogleAuthButton`).

### 3.2.2 Jaminan tidak mengganggu auth email/password

| Mekanisme existing | Dampak Google |
| --- | --- |
| Signup email + password | Tidak berubah; konflik email → 409 (pakai Google atau Forgot password) |
| Login email + password | Tidak berubah; akun Google-only diarahkan ke Google / set password |
| Verify email / resend | Tidak dipakai oleh Google signup (sudah verified); alur email tetap untuk akun password |
| Forgot / reset password | Tetap jalan untuk Google-only (menambah password tanpa melepas Google) |
| Cookie `gg_pps_<slug>` | Sama untuk kedua metode; tidak menulis cookie Gud Game |
| Session Gud Game staff | Tidak diubah oleh Google member |
| Partner A vs B | `partnerId` + `google_uid` scoped — tidak ada SSO antar partner |

### 3.3 Forgot / reset password

1. Request reset — respons selalu generik (anti email enumeration); akun archived tidak dikirimi email.
2. Link sekali pakai, berlaku 1 jam, bound ke `partnerId`.
3. Reset password **mencabut semua session** identity itu.
4. Email “password changed” dikirim (branded partner).

### 3.4 Guest → akun

Jika email sudah ada di `partner_players` (registrasi guest turnamen) tanpa `identityId`, sign up akan **claim** baris itu ke akun baru setelah dibuat.

### 3.5 Sign out

Halaman `/account` → konfirmasi modal → `POST …/auth/logout` + clear cookie + event navbar.

---

## 4. Isolasi & keamanan

| Kontrol | Perilaku |
| --- | --- |
| Password | Hash `better-auth/crypto` (scrypt); nullable untuk Google-only |
| Google token | Firebase Admin `verifyIdToken` (revocation check); email Google wajib verified |
| Token session / verify / reset | Opaque random; disimpan sebagai **SHA-256** di DB |
| Cookie | Per slug; resolve selalu cek `session.partnerId === partner.id` |
| Rate limit | `partnerPlayerAuth`, `partnerPlayerRegister`, `passwordReset` (+ Origin check) |
| Callback URL | Hanya path `/{slug}/…`; tolak `//`, `\`, `..`, URL asing |
| Timing login | Verify password tetap dijalankan meski email tidak ada (dummy hash) |
| Archived player | Login/verify-session/reset ditolak; session aktif dihapus |
| Data | Turnamen / liga / player scoped `partnerId` — tidak di discovery Gud Game / partner lain |

Ranking karier Gud Game **tidak** menerima data partner.

---

## 5. Email branding (member)

Template auth (`verify-email`, `reset-password`, `password-changed`) menerima `brand`:

| Field | Efek |
| --- | --- |
| `name` / `logoUrl` | Header email = identitas partner |
| `siteUrl` | Link “Open {Partner}” → `/{slug}` |
| `accentColor` | Warna aksen CTA |
| `isPartner` | Copy langkah berikutnya ke partner; expiry verify memakai konstanta partner (24 jam) |

Implementasi: `lib/partners/auth/emails.ts` + `lib/email/templates/base-layout.ts`.

---

## 6. Navbar session real-time

Hook `usePartnerPlayerSession`:

1. Fetch `/auth/me` saat mount (`credentials: include`)
2. Dengarkan `CustomEvent` + `BroadcastChannel` (`gg-partner-player-auth`) setelah login / logout / verify
3. Refresh saat window focus

Sehingga CTA navbar (Sign in ↔ nama user) berubah tanpa hard refresh.

**Staff Gud Game** (role `partner` / `super_admin`): pada situs publik partner, tombol Sign in diganti **avatar profil** → menu **Open Partner Console**.

### Dual session (staff + member) — aman by design

| Cookie | Siapa | Privilege |
| --- | --- | --- |
| Better Auth (Gud Game) | Staff / owner | Partner Console, manage turnamen |
| `gg_pps_<slug>` | Member / player | Register, account, stats sync |

Keduanya **boleh** aktif di browser yang sama: ini disengaja (realm terpisah), bukan bug. Staff cookie **tidak** bisa dipakai sebagai member, dan sebaliknya.

**UX profesional:**

- Menu staff **tidak** lagi menampilkan “Member sign in” generik (membingungkan).
- Diganti **“Also sign in as player…”** → Dialog konfirmasi menjelaskan sesi terpisah → baru ke `/{slug}/login`.
- Jika member juga sudah login: badge “Also signed in as player {name}” + link **Player account**.
- Sign-out member (`/account`) **tidak** logout staff Gud Game; logout staff tidak clear cookie member.

Untuk uji cepat member tanpa dual session: gunakan jendela privat / browser lain.

---

## 7. Loading UI partner

Gunakan `components/partners/partner-loading.tsx` (`PartnerLoadingSpinner`, `PartnerLoadingOverlay`, `PartnerListFetchingOverlay`, `PartnerPageLoader`) — **bukan** PageLoader Gud Game.

Form auth memakai overlay lokal; konfirmasi destructive memakai Dialog / confirm provider.

---

## 8. User management (Players list)

Staff partner (console) dapat:

| Aksi | Endpoint | Catatan |
| --- | --- | --- |
| List / search | `GET …/players` | Hanya `partnerId` ini |
| Detail | `GET …/players/{id}` | + match history |
| Edit nama/email/phone | `PATCH …/players/{id}` | Sync identity; ganti email → unverify + revoke session |
| Remove (archive) | `DELETE …/players/{id}` | Soft-archive; revoke session; history match tetap |

Registrasi / login member otomatis membuat atau menghubungkan baris `partner_players`.

---

## 9. Hapus turnamen (partner console)

`DELETE /api/partner/tournaments/{id}`: ownership check → tolak jika `paid` / bracket aktif → hapus payment non-paid → delete + konfirmasi UI.

---

## 10. API (public partner)

Base: `/api/partner/public/{partnerSlug}/auth/`

| Method | Path | Fungsi |
| --- | --- | --- |
| POST | `login` | Sign in + Set-Cookie |
| POST | `signup` | Create account + send verify |
| POST | `google` | Sign in / sign up with Firebase Google ID token + Set-Cookie |
| POST | `logout` | Clear session |
| GET | `me` | Session saat ini (`hasPassword`, `googleLinked`) |
| POST | `forgot-password` | Request reset (respons generik) |
| POST | `reset-password` | Apply new password |
| POST | `verify-email` | Verify + auto sign-in |
| POST | `resend-verification` | Resend verify email |

Players (staff): `GET\|PATCH\|DELETE /api/partner/public/{partnerSlug}/players/{playerId}`

---

## 11. File kode acuan

| Area | Path |
| --- | --- |
| Schema | `db/schema/partner-auth.ts`, `partner-players.identityId` |
| Migration | `db/migrations/0025_partner_player_auth.sql`, `0026_partner_google_auth.sql` |
| Service | `lib/partners/auth/service.ts`, `google.ts`, `db-errors.ts` |
| Session / events | `lib/partners/auth/session.ts`, `client-events.ts` |
| Cookies / tokens | `cookies.ts`, `tokens.ts`, `constants.ts` |
| Emails | `lib/partners/auth/emails.ts` |
| Firebase | `lib/firebase/admin.ts`, `lib/firebase/client.ts` (sign-out setelah token) |
| UI forms | `components/partners/auth/*` (+ `partner-google-auth-button.tsx`) |
| Loading | `components/partners/partner-loading.tsx` |
| Players UI | `partner-players-directory.tsx`, `partner-edit-player-dialog.tsx` |
| Nav CTA | `components/partners/partner-public-nav.tsx`, `partner-mobile-bottom-nav.tsx` (mobile bottom bar) |
| Unit tests | `lib/partners/auth/__tests__/urls.test.ts`, `google.test.ts` |

---

## 12. Checklist QA

- [ ] Sign up Partner A → email berlogo partner → verify → auto session → home
- [ ] Login/signup saat sudah session → redirect `/account`
- [ ] Email sama di Partner B / Gud Game = akun terpisah
- [ ] **Google sign-in/up** → session partner (bukan Gud Game); akun baru langsung verified
- [ ] Google link ke akun email+password → password tetap bisa dipakai
- [ ] Google-only + password login → pesan Continue with Google / Forgot password
- [ ] Concurrent Google signup (race) → tidak 500; login berhasil
- [ ] Tanpa Firebase env → tombol Google tidak tampil; email/password tetap jalan
- [ ] Login/signup email+password tanpa Google tetap normal (verify, forgot, reset)
- [ ] Staff avatar → Partner Console; “Also sign in as player…” → dialog penjelasan dual session
- [ ] Staff + member bersamaan: badge player di menu; logout salah satu ≠ logout yang lain
- [ ] Staff `/login` → console; avatar di situs publik → Partner Console
- [ ] Forgot/reset hanya slug yang sama; archived tidak bisa reset/login
- [ ] Navbar update tanpa hard refresh (login/logout)
- [ ] Logout member ≠ logout session Gud Game staff
- [ ] Callback `//evil`, `../`, partner lain → fallback home partner
- [ ] Guest claim email → `identityId` terhubung
- [ ] Edit / Remove player; ganti email → harus verify ulang
- [ ] Delete turnamen (unpaid OK; paid ditolak)
- [ ] Data Partner A tidak muncul di Gud Game / Partner B

---

## 13. Statistik player (turnamen & liga)

### Turnamen

Setiap match selesai (group / bracket / Americano / reclub) pada turnamen `partnerId`:

1. `syncPartnerMatchResult` menulis/mengganti baris di `partner_player_matches` (fixture id di round key → idempotent)
2. Draw dicatat sebagai `draw` (bukan loss ganda)
3. Override skor & rematch ikut sync / hapus history fixture
4. Detail player memanggil `rebuildPartnerPlayerStatsFromCompletedMatches`
5. Players list memakai reconcile throttled (~20s) agar W/L mengikuti fixture

### Liga

- Standings tim (P/W/D/L/Pts) dihitung dari `partner_league_matches` (real-time setelah skor)
- Opsional: **Team rosters** (Players list → `settings.teamRosters`) agar skor liga ikut masuk W/L player
- Turnamen yang di-link ke liga tetap sync lewat jalur turnamen di atas

### Registrasi & identitas

Jika member sudah login, form registrasi turnamen:

1. **Signed-in member (parity Gud Game Official):** Kartu captain menampilkan nama saja — **tanpa** input Full name / Email / Phone — hanya bila session memiliki `playerId` + email. Kontak diambil dari session `/auth/me` + baris `partner_players` di server (body palsu diabaikan bila session cocok). Session tanpa `playerId` tetap memakai form guest (nama/email/phone).
2. Email tetap terikat identitas member agar sync statistik valid.
3. Akun Google tanpa nomor nyata: hint opsional ke `/{partnerSlug}/account`; registrasi tetap jalan memakai baris player yang ada.
4. API menempelkan `partnerPlayerId` / `identityId` yang sama (email harus cocok) agar statistik tidak terpecah ke baris guest baru.
5. **Guest:** Full name, email, dan phone tetap wajib di form.
6. Copy section captain membedakan guest vs member (bukan “No Gud Game account…” saat sudah login member).

### Email konfirmasi registrasi turnamen

Setelah submit (guest atau member captain), kapten **selalu** menerima email konfirmasi (kecuali email fixture seed dev):

| Billing | Email | CTA utama |
| --- | --- | --- |
| Free | `partner-registration-pending` | **View registration status** (link token) |
| Paid | `partner-registration-payment` | **Pay now** + link status |
| Setelah bayar | `partner-registration-pending` (token baru) | Link status aktif |
| Staff confirm spot | `partner-registration-confirmed` | Tournament page (+ receipt jika paid) |

URL status: `/{slug}/tournaments/{tournamentSlug}/register/success?token=…` — tidak perlu login (parity Gud Game confirm/checkout URL). Detail teknis: [`tournament-guide.md`](./tournament-guide.md) §9.5.

### Teammate claimable (default)

Setiap anggota roster (bukan hanya kapten) di-upsert ke `partner_players` **hanya** untuk `partnerId` situs itu — tidak pernah menulis ke tabel `user` Gud Game.

| Mode | Input | `partner_players` | Klaim member |
| --- | --- | --- | --- |
| Search | Pilih hasil `GET /api/partner/public/{slug}/players/search` | `preferPlayerId` → baris existing | Sudah / siap |
| Invite contact | Nama + email **atau** phone | Kontak nyata disimpan; sisi yang kosong diisi sintetis internal | Email/phone match saat signup/login |
| Name only | Nama + `softProfile: true` | Email/phone sintetis `@partner.invalid` | Belum bisa di-claim |

Search debounce 300ms, min 2 karakter, mengecualikan kontak sintetis dan player yang sudah dipilih / kapten session. Soft profile tidak menimpa kontak member yang sudah punya `identityId`.

UI register partner mengikuti layout Official (`max-w-5xl`, sidebar Entry, mode pills per slot) dengan copy & mekanisme partner-native.

---

*Lihat juga [tournament-guide.md](./tournament-guide.md) §1.3 Partner white-label dan §9.5.*
