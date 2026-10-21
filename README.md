# Gud Game
<img width="1280" height="720" alt="gudgame-id" src="https://github.com/user-attachments/assets/d12a05e1-1b9e-4869-8e7a-b22a571b071f" />

Modern, community-driven court-sports platform (padel-first MVP): tournaments, live scores, TV venue displays, player profiles, wiki, partner white-label, and Xendit payments.

Built with Next.js, PostgreSQL, Redis, and SeaweedFS object storage.

> Full documentation lives in **[docs/](./docs/README.md)** — start with [overview](./docs/overview.md) or the [portfolio brief](./docs/portfolio.md).

## Stack

- **Framework:** Next.js 16 (App Router), TypeScript, Tailwind CSS, shadcn/ui
- **Data:** PostgreSQL 18 + Drizzle ORM
- **Cache:** Redis (ioredis)
- **Auth:** better-auth + Firebase Google
- **Payments:** Xendit (+ XenPlatform)
- **Media:** SeaweedFS (filer via nginx `storage_gateway`)
- **Deploy:** VPS + Docker Compose + Cloudflare Tunnel

## Project structure

```
app/                 # Routes, layouts, API handlers
components/          # UI (layout, sections, shadcn, tournament display)
db/                  # Drizzle schema, migrations, seeds
lib/                 # Domain: auth, tournaments, payments, wiki, storage
ops/                 # Cron, storage gateway, pgAdmin, DB restore
scripts/             # CLI: infra check, env validation, seeds
docs/                # Product, architecture, ops (portfolio-ready)
```

## Local development

```bash
cp .env.example .env
npm install
npm run db:push:prod
npm run db:seed
npm run infra:check
npm run dev
```

Details: [docs/SETUP.md](./docs/SETUP.md)

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` / `start` | Production build & server |
| `npm run typecheck` / `lint` / `test` | Quality gates |
| `npm run validate:env` | Validate `.env` (`STRICT_PRODUCTION_ENV=true` in CI) |
| `npm run infra:check` | PostgreSQL, Redis, SeaweedFS health |
| `npm run db:migrate:prod` | Apply SQL migrations (production path) |
| `npm run db:seed` | Seed MVP sport (padel) |

## Production checklist

- `NODE_ENV=production`
- `BETTER_AUTH_SECRET` (≥32 chars) and `BETTER_AUTH_URL=https://gudgame.id`
- `DATABASE_URL` → host `postgres`, database **`gudgame_db`**
- `HEALTH_CHECK_TOKEN` for `/api/health`; `CRON_SECRET` for cron routes
- Docker network `tunnel` with Postgres 18, Redis, SeaweedFS, `storage_gateway`, app, `payout-cron`
- `NEXT_PUBLIC_STORAGE_URL=https://storage.gudgame.id`
- Secrets in **GitHub Actions Secrets** — never baked into the image

## Documentation

| Doc | Description |
| --- | --- |
| [docs/README.md](./docs/README.md) | **Documentation hub** |
| [docs/USER-MANUAL.md](./docs/USER-MANUAL.md) | **User manual (end-user, English)** |
| [docs/DEVELOPER-HANDOVER.md](./docs/DEVELOPER-HANDOVER.md) | **Developer handover (Gud Game, English)** |
| [docs/overview.md](./docs/overview.md) | Product overview |
| [docs/portfolio.md](./docs/portfolio.md) | Portfolio narrative |
| [docs/architecture.md](./docs/architecture.md) | System architecture |
| [docs/features.md](./docs/features.md) | Feature catalog |
| [docs/SETUP.md](./docs/SETUP.md) | Local setup |
| [docs/DEPLOYMENT-VPS.md](./docs/DEPLOYMENT-VPS.md) | VPS deployment |
| [docs/DATABASE-RESTORE.md](./docs/DATABASE-RESTORE.md) | DB restore (PG18) |
| [docs/tournament-guide.md](./docs/tournament-guide.md) | Tournament ops (ID) |
| [docs/partner-auth.md](./docs/partner-auth.md) | Partner member auth |
| [docs/bestie-cup-guide.md](./docs/bestie-cup-guide.md) | Bestie Cup playbook |

**Naming:** product is **Gud Game**; production DB is **`gudgame_db`**. The repo folder may still be named `court-pedia` locally — that is legacy path naming only.

## License

Copyright © 2026 **PT Aplikasi Wong Kito Galo**. All rights reserved.

Gud Game is **proprietary software**. A public repository does not grant any right to copy, download, clone, fork, modify, or redistribute it. See [LICENSE](./LICENSE) and [docs/LICENSE.md](./docs/LICENSE.md).

## Screenshots

### Home Page
<img width="1920" height="2166" alt="image" src="https://github.com/user-attachments/assets/c2cd0a3f-ca65-4649-9b86-ca198fa8ab83" />

<img width="1920" height="2166" alt="image" src="https://github.com/user-attachments/assets/7f04b054-cc03-4cdc-ac54-7e374cf96d30" />

<img width="1920" height="1681" alt="image" src="https://github.com/user-attachments/assets/9aa66309-3fce-4d6c-b0b5-3aea148ad556" />

<img width="1920" height="1825" alt="image" src="https://github.com/user-attachments/assets/5034d531-d052-4e0f-b8d6-15d178356286" />


### Login Page
<img width="1920" height="869" alt="image" src="https://github.com/user-attachments/assets/13534c2d-d42f-4195-813d-ac5eb9dc8299" />

### Signup Page
<img width="1920" height="994" alt="image" src="https://github.com/user-attachments/assets/1a353331-1cbc-44b1-be3f-a2caf5853715" />

### Home page (After Login)
<img width="1920" height="1852" alt="image" src="https://github.com/user-attachments/assets/9e1bb868-3ac5-4de4-8dd5-d25dedd6073e" />

### Admin Dashboard
<img width="1920" height="2673" alt="image" src="https://github.com/user-attachments/assets/9136dc33-fa32-47f1-9619-11043d7b4d59" />

<img width="1920" height="1622" alt="image" src="https://github.com/user-attachments/assets/d3852335-21f8-487c-88fa-85563431733c" />

<img width="1920" height="879" alt="image" src="https://github.com/user-attachments/assets/b3403a84-3bd5-4fbf-b60f-2d7c5dda4aa1" />

<img width="1920" height="1688" alt="image" src="https://github.com/user-attachments/assets/348e7d52-30e8-4b9a-bc0e-c4f2d426e2b4" />

<img width="1920" height="869" alt="image" src="https://github.com/user-attachments/assets/eea8aa17-a41a-4227-92aa-b9bd95620baf" />

<img width="1920" height="1025" alt="image" src="https://github.com/user-attachments/assets/f459b6ed-840e-4316-a1a7-65dc437419d2" />

<img width="1920" height="1661" alt="image" src="https://github.com/user-attachments/assets/480344e8-e9f6-48d4-904e-e4d531f32f41" />

### Host Dashboard
<img width="1920" height="2223" alt="image" src="https://github.com/user-attachments/assets/ad76fa60-7756-491a-b01b-35ead94fa729" />

<img width="1920" height="3031" alt="image" src="https://github.com/user-attachments/assets/dba82108-ddcd-4bb4-a7bb-6f187a1d6751" />

<img width="1920" height="1612" alt="image" src="https://github.com/user-attachments/assets/67e7bb8a-b4ee-4e78-9816-7554ac2dd120" />

<img width="1920" height="2405" alt="image" src="https://github.com/user-attachments/assets/afa8f5a5-9646-4345-893a-d0352ab87944" />

### Player Dashboard
<img width="1920" height="3549" alt="image" src="https://github.com/user-attachments/assets/5add6429-6dd5-49cc-90b8-a2c3338199a2" />

<img width="1920" height="2140" alt="image" src="https://github.com/user-attachments/assets/8310d4c1-8064-4e7d-92bd-d5c2ca56bab4" />

<img width="1920" height="1790" alt="image" src="https://github.com/user-attachments/assets/30dbb042-c873-4a70-9bb4-10c572f9e3f7" />

<img width="1920" height="3968" alt="image" src="https://github.com/user-attachments/assets/d7b609d4-b89e-4588-9973-00256bb3d216" />

### Player Public Page
<img width="1920" height="2921" alt="image" src="https://github.com/user-attachments/assets/935bf888-9f68-422d-95c2-84e914358320" />

### Tournaments List Page
<img width="1920" height="4192" alt="image" src="https://github.com/user-attachments/assets/9f3374d4-ab04-4353-bbff-d5f57044ab47" />

### Tournament Detail Page
<img width="1920" height="3380" alt="image" src="https://github.com/user-attachments/assets/618d9480-9f1b-4ea5-8cf6-aaf975c49f91" />

<img width="1920" height="1935" alt="image" src="https://github.com/user-attachments/assets/6bca354a-61f3-4dfa-8e36-328aeea12f32" />

<img width="1920" height="869" alt="image" src="https://github.com/user-attachments/assets/7c47cbb5-9450-4c92-88c8-9acab71dee48" />

<img width="1920" height="869" alt="image" src="https://github.com/user-attachments/assets/f6938e72-b458-4141-b40e-fb08b41f0291" />

<img width="1920" height="1935" alt="image" src="https://github.com/user-attachments/assets/607d4ddc-00ee-4b16-a90e-0afcfa639c14" />

<img width="1920" height="2438" alt="image" src="https://github.com/user-attachments/assets/400196e3-efce-4bfc-b29f-b4b8677908a1" />

<img width="1920" height="3328" alt="image" src="https://github.com/user-attachments/assets/1ed874b1-64bb-4d2b-a909-924222c5cceb" />

<img width="1920" height="3437" alt="image" src="https://github.com/user-attachments/assets/87da8a14-6dd4-4133-8ab7-cfb58796d6d1" />

<img width="1920" height="1257" alt="image" src="https://github.com/user-attachments/assets/1829ecfc-93d8-4fc4-b0be-2ffad63ec5c9" />

<img width="1915" height="865" alt="image" src="https://github.com/user-attachments/assets/21a94723-2e7f-4739-a492-85f32a88c9b4" />


### Manage Tournament Page (Host or admin only)
<img width="1920" height="1448" alt="image" src="https://github.com/user-attachments/assets/08ce77ef-27f4-4ac8-bed9-5d788642f84f" />

<img width="1920" height="2854" alt="image" src="https://github.com/user-attachments/assets/a1cf4dfd-42d1-4350-bd97-008ad3b7202c" />

<img width="1920" height="2563" alt="image" src="https://github.com/user-attachments/assets/0b5e145a-e29a-4c9e-a6f2-4eeea3ab38e2" />

<img width="1920" height="1042" alt="image" src="https://github.com/user-attachments/assets/41893951-ad77-4922-bc58-4cdaf789b069" />

<img width="1920" height="2656" alt="image" src="https://github.com/user-attachments/assets/6360337e-8e45-42eb-a12f-d7b8193309b5" />

<img width="1920" height="3399" alt="image" src="https://github.com/user-attachments/assets/adf6cd57-4a8f-4c37-933d-c6aff77d738e" />

<img width="1920" height="2118" alt="image" src="https://github.com/user-attachments/assets/437a6021-ced7-498e-8213-8da26f9758d9" />

<img width="1920" height="3206" alt="image" src="https://github.com/user-attachments/assets/591bb363-2f30-46f0-8a64-60a13537a7fa" />

### Partner Home Page
<img width="1920" height="2468" alt="image" src="https://github.com/user-attachments/assets/92353906-5a9e-4b24-975b-bc2ffed2624e" />

<img width="1920" height="1620" alt="image" src="https://github.com/user-attachments/assets/e6afbeef-61f2-4fcc-9fcc-e0f2c2cc9b6a" />

<img width="1920" height="1294" alt="image" src="https://github.com/user-attachments/assets/88e536b5-e58f-49ae-9ecc-22726f460534" />

<img width="1920" height="1067" alt="image" src="https://github.com/user-attachments/assets/0d51e162-9b11-4778-b207-9d1f4e213599" />

<img width="1920" height="2801" alt="image" src="https://github.com/user-attachments/assets/01a056a6-c833-4fc2-9761-34e1b3e209cc" />
