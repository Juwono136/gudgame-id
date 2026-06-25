# Project Overview

Last updated: 2026-06-25

## Purpose

TandingBase / Court Pedia is a large Next.js sports platform for public sport directories, wiki-style player/team/gear pages, tournament discovery and registration, player and host dashboards, admin operations, payments, notifications, and host payouts.

## Tech Stack

| Area | Stack |
| --- | --- |
| Runtime | Next.js 16.2.6, React 19.2.4, TypeScript |
| Router | Next.js App Router under `app/` |
| Styling/UI | Tailwind CSS 4, shadcn/Radix-style local `components/ui`, lucide-react, framer-motion |
| Data fetching | Server components/services, API route handlers, TanStack React Query hooks |
| Auth | Better Auth with Drizzle adapter, email/password, Firebase Google plugin, role guards |
| Database | PostgreSQL via Drizzle ORM and `postgres` driver |
| Cache/secondary storage | Redis / ioredis |
| Payments | Xendit/XenPlatform, QRIS, VA/invoices, payouts; Iluma for bank validation |
| Storage/media | S3-compatible storage helpers plus media proxy route |
| Email | Nodemailer templated email flow |
| Validation | Zod schemas in `lib/validations` and feature-specific validators |

## Repository Shape

| Path | Purpose |
| --- | --- |
| `app/` | App Router pages, layouts, loading states, route handlers |
| `components/` | Client/server UI by feature and shared UI primitives |
| `hooks/` | Client hooks, mostly React Query wrappers around API routes |
| `lib/` | Domain services, auth, payments, storage, validation, roles, config |
| `db/` | Drizzle client, schema modules, migrations, seed |
| `providers/` | Global client providers |
| `stores/` | Zustand stores |
| `docs/ai/` | AI-readable technical map and change memory |

## Commands

Use RTK for terminal commands because global `RTK.md` requires it.

| Command | Purpose |
| --- | --- |
| `rtk npm run lint` | ESLint |
| `rtk npm run typecheck` | TypeScript no-emit check |
| `rtk npm run build` | Next build |
| `rtk npm run dev` | Local development |
| `rtk npm run db:generate` | Generate Drizzle migrations |
| `rtk npm run db:migrate` | Run Drizzle migrations |
| `rtk npm run db:seed` | Seed database |

## Current Notes

- The docs were empty before this pass.
- Worktree had many existing non-doc changes when this map was generated; this pass did not inspect every changed diff.
- Needs verification: exact production deployment topology, complete environment variable list, and runtime status of every payment provider integration.
