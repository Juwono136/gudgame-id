# AI Changelog

## 2026-06-26

- Added `docs/ai/workflows/xendit-payment-flow.md` documenting the Xendit payment gateway schema and lifecycle for official/legal paid tournaments.
- Covered checkout entry points, method-specific Xendit calls, XenPlatform split handling, webhook processing, auth/session checks, database schema interactions, response/navigation behavior, error handling, risks, and recommended tests.
- Scope: documentation only; no application code changed.

- Added `docs/ai/workflows/reclub-tournament-flow.md` documenting the end-to-end free Reclub tournament/session workflow.
- Covered creation, public lobby participation, squad actions, match lifecycle, optional bracket handling, auth/session checks, database writes, response/navigation behavior, risks, and recommended tests.
- Scope: documentation only; no application code changed.

- Added `docs/ai/workflows/legal-tournament-flow.md` documenting the end-to-end official/legal paid tournament registration and payment workflow.
- Covered entry points, user actions, UI sequence, validation, API route handlers, auth/session checks, database writes, response and navigation handling, error handling, files involved, risks, and recommended tests.
- Scope: documentation only; no application code changed.

- Added `docs/ai/features/authentication.md` as the dedicated Authentication feature document.
- Documented auth purpose, user and technical flows, routes, layouts, components, hooks, providers/stores, APIs, database models, validation, error handling, dependency graph, high-risk files, safe modification guide, and recommended tests.
- Scope: documentation only; no application code changed.

## 2026-06-25

- Created the initial AI-readable technical map under `docs/ai/`.
- Documented project overview, architecture, routes, features, data flow, API groups, database map, component map, dependency graph, and inferred decisions.
- Added shared maps for API client helpers, UI components, hooks, providers, stores, and utilities.
- Scope: documentation only; no application code changed.
- Needs verification: deployment topology, complete env list, exact route-by-route guards, webhook signature details, migration status, and some feature ownership notes.

## 2026-06-25 Review Pass

- Reviewed the generated `docs/ai` map against current route, API, schema, hook/provider/store, and component inventories.
- Added missing/under-documented behavior for legacy contributor redirects, auth API security wrapper, direct DB access hotspots, scraper host management, admin sport context, player competition components, and higher-risk shared files.
- Confirmed no explicit `"use server"` server actions were found in `app`, `components`, or `lib` during this pass.
- Scope: documentation only; no application code changed.
