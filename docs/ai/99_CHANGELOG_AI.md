# AI Changelog

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
