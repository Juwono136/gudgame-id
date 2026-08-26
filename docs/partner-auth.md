# Partner Player Authentication — User Manual

| | |
| --- | --- |
| **Dokumen** | Panduan autentikasi member/player partner |
| **Produk** | Gud Game white-label partners |
| **Versi konten** | 2026-08-26 (security hardening) |
| **Audiens** | Partner staff, player/member, developer |

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

1. Isi nama, email, phone, password (aturan password sama Gud Game).
2. Sistem membuat `partner_identities` + menghubungkan / membuat `partner_players` (claim guest lama dengan email yang sama jika ada).
3. Email verifikasi dikirim dengan **branding partner** (logo/nama, CTA ke situs partner, footer “Powered by Gud Game”).
4. User membuka link → email verified → session dibuat → home partner.

### 3.2 Sign in

1. Email + password di partner itu saja.
2. Email harus sudah verified.
3. Player yang di-archive staff **tidak bisa** login (session lama juga dibatalkan).
4. Session cookie `gg_pps_<slug>` diset (HttpOnly, Secure di production, SameSite=Lax, Path=`/`).

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
| Password | Hash `better-auth/crypto` (scrypt) |
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

**Staff Gud Game** (role `partner` / `super_admin`): pada situs publik partner, tombol Sign in diganti **avatar profil** → menu **Open Partner Console** (`/dashboard/partner`). Member sign-in tetap tersedia dari menu yang sama.

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
| POST | `logout` | Clear session |
| GET | `me` | Session saat ini |
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
| Migration | `db/migrations/0025_partner_player_auth.sql` |
| Service | `lib/partners/auth/service.ts` |
| Session / events | `lib/partners/auth/session.ts`, `client-events.ts` |
| Cookies / tokens | `cookies.ts`, `tokens.ts`, `constants.ts` |
| Emails | `lib/partners/auth/emails.ts` |
| UI forms | `components/partners/auth/*` |
| Loading | `components/partners/partner-loading.tsx` |
| Players UI | `partner-players-directory.tsx`, `partner-edit-player-dialog.tsx` |
| Nav CTA | `components/partners/partner-public-nav.tsx` |
| Unit tests | `lib/partners/auth/__tests__/urls.test.ts` |

---

## 12. Checklist QA

- [ ] Sign up Partner A → email berlogo partner → verify → auto session → home
- [ ] Login/signup saat sudah session → redirect `/account`
- [ ] Email sama di Partner B / Gud Game = akun terpisah
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

Jika member sudah login, form registrasi turnamen mengisi captain dari session; API menempelkan `partnerPlayerId` / `identityId` yang sama (email harus cocok) agar statistik tidak terpecah ke baris guest baru.

---

*Lihat juga [tournament-guide.md](./tournament-guide.md) §1.3 Partner white-label.*
