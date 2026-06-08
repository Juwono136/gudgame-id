# Court Pedia — Local Setup

## Prerequisites

- Node.js 22+
- PostgreSQL (`courtpedia_db`)
- Redis (`127.0.0.1:6379`)
- SeaweedFS via Docker (`storage_gateway` on `127.0.0.1:8333`)

## 1. Environment

```bash
cp .env.example .env
```

Fill in `DATABASE_URL`, `REDIS_URL`, and SeaweedFS credentials.

**Important (nginx + Windows/WSL):** The gateway on port **8333** uses **HTTP Basic Auth**. The AWS S3 SDK sends `Authorization: AWS4-HMAC-SHA256`, which nginx rejects (HTML 401). Court Pedia therefore defaults to:

```env
STORAGE_AUTH_MODE=nginx-basic
```

This uses the SeaweedFS **filer HTTP API** (`PUT /buckets/{bucket}/{key}`) with Basic auth — compatible with your nginx gateway.

- `USERNAME_STORAGE` / `PASSWORD_STORAGE` = nginx basic auth credentials (not AWS SigV4)
- `STORAGE_ENDPOINT="http://127.0.0.1:8333"` (from Windows → WSL Docker publish)
- `NEXT_PUBLIC_STORAGE_URL` = public URL for browser asset links

Use `STORAGE_AUTH_MODE=s3` only when connecting **directly** to the filer S3 port **without** nginx basic auth in front.

## 2. Database

```bash
npm run db:push:prod   # non-interactive schema sync
npm run db:seed        # inserts MVP sport: padel
```

## 3. Verify infrastructure

```bash
npm run infra:check
```

Expected when everything is configured:

- `postgresql`, `redis`, `drizzle` → healthy
- `seaweedfs` → healthy (after correct S3 credentials)

Or via HTTP while dev server is running:

```bash
curl http://localhost:3000/api/health
```

Skip storage in health check (e.g. DB-only CI):

```bash
curl "http://localhost:3000/api/health?skipStorage=1"
```

## 4. Authentication (Better Auth)

Set in `.env`:

```env
BETTER_AUTH_SECRET="at-least-32-random-characters-long"
BETTER_AUTH_URL="http://localhost:3000"
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your@gmail.com"
SMTP_PASS="your-app-password"
```

After schema changes (auth tables: `user`, `session`, `account`, `verification`):

```bash
npm run db:push:prod
```

- **Sign in:** `/login`
- **Contribute / sign up:** `/register` (email verification required before dashboard)
- **Dashboard:** `/dashboard` (protected)

Uses **Gmail SMTP** (`smtp.gmail.com:587` + TLS). Create an [App Password](https://myaccount.google.com/apppasswords) when 2FA is enabled.

In development, if `SMTP_USER` / `SMTP_PASS` are empty, verification emails are logged to the server console.

Profile photos are uploaded to **SeaweedFS** (`profiles/{email}/…`); Postgres stores only the public URL and `image_storage_key`.

## 5. Development

```bash
npm run dev
```

## 6. Scripts reference

| Script | Description |
|--------|-------------|
| `npm run db:push:prod` | Apply Drizzle schema |
| `npm run db:seed` | Seed padel + ensure storage bucket |
| `npm run infra:check` | CLI health report (exit 1 if not healthy) |
