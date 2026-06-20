# Deploy TandingBase on Google Cloud Compute Engine

Panduan lengkap deploy **TandingBase** ke satu VM (VPS) di GCP dengan arsitektur:

| Komponen | Cara install |
|----------|----------------|
| Next.js app | Docker + Docker Hub |
| PostgreSQL + pgAdmin | Native di VM |
| Redis | Native di VM |
| SeaweedFS + nginx | Docker terpisah (`deploy/docker-compose.seaweedfs.yml`) |
| Cloudflare Tunnel | Docker terpisah (`deploy/docker-compose.cloudflared.yml`) |
| CI/CD | GitHub Actions + self-hosted runner di VM |

**Domain produksi:** `https://tandingbase.portproject.my.id`

---

## 1. Spesifikasi VM yang disarankan

| Resource | Minimum | Disarankan |
|----------|---------|------------|
| Machine type | `e2-medium` (2 vCPU, 4 GB) | `e2-standard-2` (2 vCPU, 8 GB) |
| Boot disk | 50 GB SSD | 80–100 GB SSD |
| OS | Ubuntu 22.04 LTS | Ubuntu 24.04 LTS |
| Region | `asia-southeast2` (Jakarta) | dekat pengguna |

Stack ini menjalankan app + PostgreSQL + Redis + SeaweedFS + tunnel di satu VM. Untuk traffic tinggi, pisahkan database ke Cloud SQL.

---

## 2. Buat VM di Google Cloud Console

### 2.1 Persiapan project

1. Buka [Google Cloud Console](https://console.cloud.google.com/)
2. Buat project baru (mis. `tandingbase-prod`)
3. Aktifkan **Compute Engine API**

### 2.2 Create VM Instance

1. **Compute Engine → VM instances → Create instance**
2. Isi:
   - **Name:** `tandingbase-prod-1`
   - **Region / Zone:** `asia-southeast2-a` (atau zone terdekat)
   - **Machine type:** `e2-standard-2`
   - **Boot disk:** Ubuntu 22.04 LTS, 80 GB Balanced persistent disk
3. **Networking → Firewall:**
   - Centang hanya **Allow HTTP/HTTPS traffic** jika tidak pakai tunnel (kita pakai Cloudflare Tunnel → **tidak perlu** buka port 80/443)
   - Pastikan **SSH (port 22)** bisa diakses (default)
4. **Security → SSH Keys:** tambahkan **public key** laptop Anda (lihat §3)
5. **Create**

### 2.3 Firewall GCP (VPC)

1. **VPC network → Firewall → Create rule**
2. Contoh rule SSH terbatas IP Anda:
   - Target: `tandingbase-prod-1` (network tag)
   - Source: `YOUR_HOME_IP/32`
   - Protocol: `tcp:22`
3. **Jangan** buka port `3000`, `5432`, `6379`, `8333` ke internet — tunnel + localhost only.

---

## 3. Remote SSH dari laptop

### Generate key (jika belum ada)

```bash
ssh-keygen -t ed25519 -C "you@laptop" -f ~/.ssh/tandingbase_gcp
```

Tambahkan isi `~/.ssh/tandingbase_gcp.pub` ke metadata VM (SSH keys).

### Connect

```bash
# Ganti EXTERNAL_IP dengan IP VM di GCP console
ssh -i ~/.ssh/tandingbase_gcp deploy@EXTERNAL_IP
```

Tambahkan ke `~/.ssh/config`:

```
Host tandingbase-prod
  HostName EXTERNAL_IP
  User deploy
  IdentityFile ~/.ssh/tandingbase_gcp
```

Lalu: `ssh tandingbase-prod`

---

## 4. Bootstrap server

Login sebagai root atau user dengan sudo:

```bash
sudo bash deploy/scripts/setup-vm.sh
```

Script ini menginstall: Docker, UFW, fail2ban, user `deploy`, folder `/opt/tandingbase`.

Lanjutkan sebagai user `deploy`:

```bash
sudo bash deploy/scripts/setup-postgres.sh   # DB + pgAdmin compose
sudo bash deploy/scripts/setup-redis.sh      # Redis localhost + password
```

Clone repository ke server:

```bash
sudo mkdir -p /opt/tandingbase/app
sudo chown deploy:deploy /opt/tandingbase/app
git clone https://github.com/YOUR_ORG/court-pedia.git /opt/tandingbase/app
cd /opt/tandingbase/app
```

---

## 5. Environment production (GitHub Secrets)

**Jangan** menyimpan `.env` secara manual di VPS. Setiap variabel production disimpan sebagai **GitHub Actions secret** terpisah (repo private).

### 5.1 Siapkan template

1. Salin `.env.production.example` → `.env.production` (lokal, jangan commit)
2. Isi semua nilai; untuk Docker gunakan `host.docker.internal` untuk DB/Redis/SeaweedFS
3. Validasi:

```bash
set -a && source .env.production && set +a
STRICT_PRODUCTION_ENV=true npm run validate:env
```

### 5.2 GitHub Secrets (wajib)

Repo → **Settings → Secrets and variables → Actions**

| Secret | Contoh / catatan |
|--------|------------------|
| `DOCKER_USERNAME` | Username Docker Hub |
| `DOCKER_PASSWORD` | Access token Docker Hub |
| `TUNNEL_NAME` | `tunnel` (nama Docker network eksternal) |
| `NODE_ENV` | `production` |
| `NEXT_PUBLIC_APP_URL` | `https://tandingbase.portproject.my.id` |
| `NEXT_PUBLIC_SITE_URL` | sama |
| `DATABASE_URL` | `postgresql://user:pass@host.docker.internal:5432/db` |
| `REDIS_URL` | `redis://:pass@host.docker.internal:6379` |
| `BETTER_AUTH_SECRET` | min 32 karakter |
| `BETTER_AUTH_URL` | URL HTTPS publik |
| `AUTH_LOCKOUT_ENABLED` | `true` |
| `FIREBASE_*` / `NEXT_PUBLIC_FIREBASE_*` | dari Firebase console |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` | SMTP production |
| `STORAGE_*`, `USERNAME_STORAGE`, `PASSWORD_STORAGE` | SeaweedFS |
| `XENDIT_STAGING_MODE` | `true` (testing) / `false` (go-live) |
| `XENDIT_SECRET_KEY` | `xnd_development_…` atau `xnd_production_…` |
| `XENDIT_WEBHOOK_TOKEN` | dari dashboard Xendit |
| `XENDIT_XENPLATFORM_ENABLED` | `true` |
| `GOOGLE_MAPS_API_KEY` | Places API |
| `HEALTH_CHECK_TOKEN` | string acak ≥16 karakter |
| `CRON_SECRET` | string acak ≥16 karakter — auth `/api/cron/host-payouts` + sidecar `payout-cron` |
| `LOG_LEVEL` | `info` |
| `STRICT_PRODUCTION_ENV` | `true` |
| `WIKI_SCRAPE_ALLOWED_HOSTS` | opsional |

Build job (GitHub-hosted) membake `NEXT_PUBLIC_*` ke image. Deploy job (self-hosted runner) menjalankan migrate + `docker compose up -d --no-deps app payout-cron`.

Sidecar **`payout-cron`** (Alpine + `crond`) memanggil `GET /api/cron/host-payouts` setiap hari **08:00 WIB** lewat jaringan internal Docker (`http://app:3000`). Jadwal: `ops/cron/host-payouts.crontab`. Manual test di VPS:

```bash
docker compose exec payout-cron /cron/run-host-payouts.sh
```

**DB migrate di CI/CD** menjalankan `scripts/run-db-migrate.ts`, yang sebelum `drizzle migrate` selalu menerapkan `db/migrations/prerequisites/ensure-host-payout-prerequisites.sql` (tabel `host_bank_accounts`, kolom payout di `host_xendit_accounts`). Ini mencegah gagal deploy bila migrasi `0003` pernah di-baseline tanpa dieksekusi.

### Variabel penting produksi

| Variable | Nilai contoh |
|----------|----------------|
| `NEXT_PUBLIC_APP_URL` | `https://tandingbase.portproject.my.id` |
| `BETTER_AUTH_URL` | sama dengan di atas |
| `XENDIT_SECRET_KEY` | `xnd_production_…` (live) atau `xnd_development_…` (testing) |
| `XENDIT_STAGING_MODE` | `true` jika pakai Test key di deploy publik; hapus/false saat go-live |
| `XENDIT_WEBHOOK_TOKEN` | token dari dashboard Xendit (Test/Live sesuai mode) |
| `STORAGE_ALLOW_LOCALHOST` | `true` (single-VM) |
| `STORAGE_ENDPOINT` | `http://127.0.0.1:8333` |
| `HEALTH_CHECK_TOKEN` | string acak ≥16 karakter |
| `CRON_SECRET` | string acak ≥16 karakter (scheduled host payouts) |

Webhook Xendit production:

```
https://tandingbase.portproject.my.id/api/webhooks/xendit
```

Lihat juga [XENDIT_INTEGRATION.md](./XENDIT_INTEGRATION.md).

---

## 6. SeaweedFS + nginx

```bash
cd /opt/tandingbase/app
bash deploy/scripts/setup-seaweedfs.sh
```

Ini membuat `deploy/nginx/.htpasswd` dan menjalankan stack di `127.0.0.1:8333`.

Pastikan `USERNAME_STORAGE` / `PASSWORD_STORAGE` di `.env` cocok dengan htpasswd.

---

## 7. Cloudflare Tunnel

1. Di [Cloudflare Zero Trust](https://one.dash.cloudflare.com/) → **Networks → Tunnels** — tunnel sudah dibuat
2. **Public hostname:** `tandingbase.portproject.my.id` → `http://localhost:3000`
3. Simpan **tunnel token**

```bash
cat > /opt/tandingbase/.env.cloudflare <<EOF
CLOUDFLARE_TUNNEL_TOKEN=paste_token_here
EOF
chmod 600 /opt/tandingbase/.env.cloudflare

cd /opt/tandingbase/app
docker compose -f deploy/docker-compose.cloudflared.yml \
  --env-file /opt/tandingbase/.env.cloudflare up -d
```

---

## 8. Database migrate & seed awal

```bash
cd /opt/tandingbase/app
set -a && source /opt/tandingbase/.env && set +a
npm ci
npm run db:migrate:prod
npm run db:seed          # sport default + data awal
npm run db:promote-user -- --email you@example.com --role admin
```

---

## 9. Docker Hub & manual deploy pertama

```bash
# Di laptop atau VM
export DOCKERHUB_USERNAME=youruser
docker build -t ${DOCKERHUB_USERNAME}/tandingbase:latest .
docker push ${DOCKERHUB_USERNAME}/tandingbase:latest

# Di VM
cd /opt/tandingbase/app
export DOCKER_IMAGE=youruser/tandingbase:latest
docker compose up -d
```

Cek:

```bash
curl -H "X-Health-Token: $HEALTH_CHECK_TOKEN" http://127.0.0.1:3000/api/health | jq
```

Buka browser: `https://tandingbase.portproject.my.id`

---

## 10. GitHub Actions self-hosted runner

1. GitHub repo → **Settings → Actions → Runners → New self-hosted runner**
2. Di VM sebagai `deploy`:

```bash
export RUNNER_URL="https://github.com/YOUR_ORG/court-pedia"
export RUNNER_TOKEN="..."   # token sekali pakai dari GitHub UI
bash /opt/tandingbase/app/deploy/scripts/install-github-runner.sh
```

3. GitHub repo → **Settings → Secrets** (lihat §5.2)

Setiap push ke `main` → workflow `.github/workflows/cicd.yml` akan:
1. Typecheck + lint (GitHub-hosted)
2. Build & push image ke Docker Hub (dengan layer cache)
3. Self-hosted: `docker compose --profile migrate run db-migrate`
4. `docker compose pull app && docker compose up -d --no-deps app`
5. Smoke test `/api/health`

---

## 11. pgAdmin via browser

pgAdmin listen di `127.0.0.1:5050` saja (aman).

**Opsi A — SSH tunnel dari laptop:**

```bash
ssh -L 5050:127.0.0.1:5050 tandingbase-prod
```

Buka `http://localhost:5050`

**Opsi B — hostname private di Cloudflare Tunnel** (disarankan untuk tim):
Tambah route `pgadmin.portproject.my.id` → `http://localhost:5050` + Access policy.

---

## 12. Development vs production

| Aspek | Development (`npm run dev`) | Production (Docker VM) |
|-------|----------------------------|-------------------------|
| `NODE_ENV` | `development` | `production` |
| URL | `http://localhost:3000` | `https://tandingbase.portproject.my.id` |
| Xendit | `xnd_development_…` | `xnd_production_…` |
| Storage | localhost / WSL Docker | `127.0.0.1:8333` + `STORAGE_ALLOW_LOCALHOST=true` |
| Validasi ketat | opsional | `STRICT_PRODUCTION_ENV=true` |
| Email | boleh log ke console | SMTP wajib |

File `.env` lokal **tidak** ikut deploy. Runtime env diinjeksikan dari **GitHub Secrets** ke `docker compose` saat deploy.

---

## 13. Troubleshooting

| Gejala | Solusi |
|--------|--------|
| Build gagal `localhost storage` | Set `STORAGE_ALLOW_LOCALHOST=true` di production single-VM |
| Xendit webhook 401 | Samakan `XENDIT_WEBHOOK_TOKEN` dengan dashboard |
| Health 401 | Kirim header `X-Health-Token` |
| App tidak bisa ke DB | `DATABASE_URL` harus `127.0.0.1`, PostgreSQL running |
| 502 di Cloudflare | Cek `docker ps`, tunnel token, app di port 3000 |

```bash
docker logs tandingbase-app -f
docker logs tandingbase-cloudflared -f
sudo journalctl -u postgresql -f
```

---

## 14. Dokumen terkait

- [DEPLOYMENT_SECURITY.md](./DEPLOYMENT_SECURITY.md) — hardening & anti-serangan
- [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md) — checklist go-live
- [XENDIT_INTEGRATION.md](./XENDIT_INTEGRATION.md) — payment gateway
