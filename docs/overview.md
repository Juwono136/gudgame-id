# Gud Game — Product Overview

**Gud Game** is a modern platform for court sports — starting with **padel** — that connects players, hosts, venues, and partner brands in one product.

> *Your home for court sports — tournaments, live scores, player profiles, wiki, and community.*  
> — `lib/config/site.ts`

---

## Problem it solves

Court sports communities often juggle spreadsheets, WhatsApp groups, paper score sheets, and separate payment apps. Gud Game consolidates:

1. **Discover** — sports wiki, players, gear, rules, and search  
2. **Compete** — register, pay, play brackets / pools / Fun Matches  
3. **Operate** — live scoring, multi-court TV boards, host payouts  
4. **Brand** — partner white-label sites that feel independent, powered by Gud Game  

---

## Who uses it

| Persona | What they do |
| --- | --- |
| **Player** | Register, complete profile, join tournaments, track career |
| **Host** | Create Official / Fun Match events, manage brackets, receive payouts |
| **Partner staff** | Run white-label tournaments & leagues under their brand |
| **Partner members** | Sign in only on the partner site (isolated auth) |
| **Venue / TV operator** | Open display mode on big screens during match day |
| **Super Admin** | Platform settings, users, wiki moderation, host requests |

---

## Product pillars

### 1. Sport hub & wiki
Per-sport hubs (`/sports/padel/…`) for players, teams, gear, rules, and tournaments. Content can be curated in the Master Console with optional scrape imports behind a host allowlist.

### 2. Tournaments & live ops
Official (ranked, paid/free) and Fun Match (unranked community play) with many formats — including double-stage / Bestie Cup style pools. Day-of tools: manage UI, live polling, score revisions, courts, and TV display.

### 3. Payments & host payouts
Registration fees via **Xendit** invoices. Hosts can connect XenPlatform accounts and receive automated disbursements via a cron sidecar.

### 4. Partner white-label
Tenants at `/{partnerSlug}` with their own branding, tournaments, leagues, and **separate member authentication**. Staff still use Gud Game accounts with the `partner` role.

### 5. Platform & ops
Dockerized Postgres 18, Redis, SeaweedFS, nginx storage gateway, pgAdmin, Next.js app, and payout/timed-match cron — typically exposed through Cloudflare Tunnel on `gudgame.id`.

---

## Brand

| Token | Value |
| --- | --- |
| Name | Gud Game |
| Logo | `/images/logo-gud-game.png` |
| Palette | Forest `#032921`, emerald `#0a9e76`, mint `#a8dcc4` |
| Default sport | `padel` |
| Theme key | `gudgame-theme` |

Partner surfaces intentionally avoid looking like the Gud Game marketing site; they show **“Powered by Gud Game”** where appropriate.

---

## Repository note

The git workspace folder may still be named `court-pedia`. That is a **legacy local path**. Production naming is Gud Game / `gudgame` / `gudgame_db`. Prefer “Gud Game” in all user-facing and portfolio copy.

---

## Next reads

- [features.md](./features.md) — what ships today  
- [architecture.md](./architecture.md) — how it is built  
- [portfolio.md](./portfolio.md) — concise portfolio narrative  
