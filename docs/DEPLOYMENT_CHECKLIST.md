# Checklist Go-Live — TandingBase

Gunakan checklist ini sebelum membuka akses publik penuh.

## Infrastruktur GCP

- [ ] VM `e2-standard-2` (atau lebih) di region terdekat
- [ ] Disk ≥ 80 GB SSD
- [ ] SSH key-only, fail2ban aktif
- [ ] UFW: hanya port 22 terbuka
- [ ] Tidak ada port 3000/5432/6379/8333 publik

## Layanan di VM

- [ ] PostgreSQL 16 running, database migrated
- [ ] Redis running dengan password
- [ ] SeaweedFS stack running (`127.0.0.1:8333`)
- [ ] Cloudflare Tunnel running
- [ ] Hostname `tandingbase.portproject.my.id` → `localhost:3000`

## Environment

- [ ] Semua GitHub Secrets terisi (lihat `docs/DEPLOYMENT_GCP.md` §5.2)
- [ ] Secret `TUNNEL_NAME=tunnel` + network `docker network create tunnel` ada di VPS
- [ ] `STRICT_PRODUCTION_ENV=true npm run validate:env` lulus (validasi lokal sebelum paste ke secret)
- [ ] `npm run infra:check` status healthy
- [ ] `NEXT_PUBLIC_APP_URL` & `BETTER_AUTH_URL` HTTPS
- [ ] `STORAGE_ALLOW_LOCALHOST=true` (single VM)

## Xendit

- [ ] Testing di deploy publik: `XENDIT_STAGING_MODE=true` + `xnd_development_…`
- [ ] Go-live: `XENDIT_STAGING_MODE=false` + `xnd_production_…`
- [ ] Webhook token cocok dengan dashboard (Test atau Live sesuai mode)
- [ ] Token dengan karakter `$` di-escape `$$` di `APP_ENV_FILE`
- [ ] Webhook URL: `https://tandingbase.portproject.my.id/api/webhooks/xendit`
- [ ] Test pembayaran end-to-end

## Auth & email

- [ ] Firebase Google OAuth domain production dikonfigurasi
- [ ] SMTP production (bukan console log)
- [ ] Test register, login, reset password
- [ ] `AUTH_LOCKOUT_ENABLED=true` — uji 5x login gagal → lock 15 menit
- [ ] Response header CSP/HSTS ada di halaman & API (DevTools → Network)

## Keamanan aplikasi

- [ ] Cloudflare: SSL Full, Bot Fight / WAF aktif (sesuai plan)
- [ ] Rate limit edge untuk `/api/auth/*` (opsional, lapisan tambahan)
- [ ] `HEALTH_CHECK_TOKEN` kuat & tidak dipublikasikan
- [ ] Rotasi secret jika pernah ter-expose di log/chat

## CI/CD

- [ ] GitHub secrets: `DOCKERHUB_USERNAME`, `DOCKERHUB_TOKEN`
- [ ] Self-hosted runner online dengan label `tandingbase`
- [ ] Push ke `main` → deploy otomatis sukses

## Smoke test

- [ ] Homepage load via domain publik
- [ ] Login player / host / admin
- [ ] Buat reclub session, join lobby, bracket
- [ ] Official tournament register + payment (staging amount)
- [ ] Upload gambar (cover / profile) → SeaweedFS
- [ ] Google Maps autocomplete venue

## Backup

- [ ] Cron `pg_dump` harian
- [ ] Volume SeaweedFS di-backup atau snapshot disk GCP
