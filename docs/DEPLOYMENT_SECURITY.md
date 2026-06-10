# Keamanan Production — TandingBase

Ringkasan mekanisme keamanan yang **sudah ada di codebase** dan **wajib dikonfigurasi di server**.

---

## 1. Keamanan aplikasi (built-in)

| Lapisan | Implementasi |
|---------|----------------|
| Security headers | `lib/security/headers.ts` — CSP, HSTS, COOP, CORP, `X-Frame-Options`, dll. Diterapkan di `proxy.ts` (halaman + API) |
| Fingerprint | `poweredByHeader: false` |
| Server boundary | `server-only` pada DB, Redis, storage, payments |
| Validasi env | Zod di `lib/config/env.server.ts` + boot check `instrumentation.ts` |
| Auth | Better Auth + Redis secondary storage, secure cookies production, `trustedOrigins` |
| Login lockout | `AUTH_LOCKOUT_ENABLED` — 5 gagal / 15 menit lock via Redis (`lib/security/auth-lockout.ts`) |
| Auth rate limit | Better Auth built-in + custom rules sign-in/sign-up/reset |
| API guard | `guardApiRequest()` — origin check + rate limit per IP (`lib/api/guard-request.ts`) |
| Rate limiting | Redis `enforceRateLimit`; **fail-closed** untuk auth/register/webhook jika Redis down |
| Webhook Xendit | `timingSafeEqual` pada token + rate limit |
| CSRF mitigasi | `assertTrustedOrigin()` pada mutasi API (production) |
| Health endpoint | Token `X-Health-Token` wajib di production |
| Error sanitization | Stack trace disembunyikan di production |
| Media storage | Browser tidak akses Seaweed langsung — proxy `/api/media/*` |
| SSRF | Wiki scrape host allowlist |
| Body size | `proxyClientMaxBodySize: 12mb` di `next.config.ts` |

---

## 2. Keamanan jaringan (VPS)

### Firewall (UFW)

Hanya **SSH (22)** ke internet. Semua layanan lain di `127.0.0.1`:

- App: `3000`
- PostgreSQL: `5432`
- Redis: `6379`
- Seaweed nginx: `8333`
- pgAdmin: `5050`

Akses publik hanya via **Cloudflare Tunnel** — tidak buka port HTTP/HTTPS di GCP firewall.

### Cloudflare

- Aktifkan **SSL/TLS Full (strict)** jika origin punya sertifikat, atau Full untuk HTTP origin di localhost
- WAF / Bot Fight Mode (sesuai plan)
- Rate limiting di edge untuk path sensitif (`/api/auth/*`, `/api/webhooks/*`)

---

## 3. Keamanan SSH

```bash
# /etc/ssh/sshd_config.d/99-hardening.conf
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
MaxAuthTries 3
```

```bash
sudo systemctl restart sshd
```

- **fail2ban** — otomatis dari `setup-vm.sh`
- Gunakan SSH key, bukan password
- Batasi source IP di GCP firewall rule

---

## 4. Secrets management

- **Jangan** commit `.env` — simpan production env sebagai GitHub Actions secrets per variabel
- Runtime env diinjeksi ke container via `docker compose` saat deploy (tanpa file `.env` manual di VPS)
- Rotasi berkala: `BETTER_AUTH_SECRET`, `HEALTH_CHECK_TOKEN`, `XENDIT_WEBHOOK_TOKEN`
- Xendit: gunakan **production keys** terpisah dari development
- Firebase service account: simpan private key di env, escape `\n` dengan benar

---

## 5. Database & Redis

**PostgreSQL**

- Listen hanya `127.0.0.1`
- User dedicated (`tandingbase`) dengan password kuat
- Backup harian (contoh cron):

```bash
0 3 * * * pg_dump -U tandingbase tandingbase_db | gzip > /var/backups/tandingbase_$(date +\%F).sql.gz
```

**Redis**

- `bind 127.0.0.1`
- `requirepass` wajib
- Jangan expose port ke internet

---

## 6. Docker

- App container pakai user non-root (`nextjs`)
- `network_mode: host` hanya di single-VM — isolasi via firewall host
- Image dari Docker Hub resmi build CI — scan vulnerability secara berkala
- Log rotation via `docker-compose.yml` (`max-size: 20m`)

---

## 7. Xendit & pembayaran production

Sebelum go-live:

1. Ganti `XENDIT_SECRET_KEY` → `xnd_production_…`
2. Webhook URL production di dashboard Xendit
3. Test webhook dari dashboard → harus `200`
4. XenPlatform KYC host selesai
5. Uji alur register → bayar → konfirmasi webhook → status `confirmed`

---

## 8. Monitoring

```bash
# Health (dari server)
curl -H "X-Health-Token: $HEALTH_CHECK_TOKEN" http://127.0.0.1:3000/api/health

# Infra lengkap
cd /opt/tandingbase/app && npm run infra:check
```

Pertimbangkan uptime monitor eksternal (UptimeRobot, Cloudflare health check) ke URL publik.

---

## 9. Update & patch

```bash
sudo apt update && sudo apt upgrade -y
docker compose pull && docker compose up -d
```

Aktifkan `unattended-upgrades` (sudah di `setup-vm.sh`).
