# AGENTS.md

## Purpose

This repository is a large Next.js project.

AI coding agents must use `docs/ai/` as the main technical memory before editing code.

RTK is configured globally through the user's global `RTK.md`. Do not create a local `RTK.md` unless explicitly requested.

## Required Reading Order

Before editing code, read:

1. `docs/ai/00_PROJECT_OVERVIEW.md`
2. `docs/ai/10_ARCHITECTURE.md`
3. `docs/ai/30_FEATURE_INDEX.md`
4. `docs/ai/40_DATA_FLOW.md`
5. `docs/ai/80_DEPENDENCY_GRAPH.md`
6. `docs/ai/99_CHANGELOG_AI.md`

If the task involves routes/pages/layouts, also read:

- `docs/ai/20_ROUTE_MAP.md`

If the task involves API/server actions, also read:

- `docs/ai/50_API_MAP.md`

If the task involves database, ORM, schema, Supabase, Prisma, Drizzle, or persistence, also read:

- `docs/ai/60_DATABASE_MAP.md`

If the task involves UI, components, hooks, providers, stores, or utilities, also read:

- `docs/ai/70_COMPONENT_MAP.md`
- relevant files under `docs/ai/shared/`

If the task involves a known feature, read the related file under:

- `docs/ai/features/`

If the task involves an end-to-end process, read the related file under:

- `docs/ai/workflows/`

## Working Rules

- Do not scan the whole repository unless the documentation is missing, stale, or insufficient.
- Before editing, identify affected features, files, routes, APIs, components, data flow, and risk level.
- Modify only necessary files.
- Do not refactor unrelated code.
- Preserve existing architecture.
- Preserve server/client component boundaries.
- Preserve existing auth, middleware, caching, and revalidation behavior.
- After every code change, update the relevant `docs/ai/` files.
- Always append an entry to `docs/ai/99_CHANGELOG_AI.md`.
- If documentation and code disagree, treat code as source of truth and update the documentation.
- Mark uncertain items as `Needs verification`.

## Next.js-Specific Rules

- Respect App Router or Pages Router structure.
- Be careful with `layout.tsx`, `template.tsx`, `loading.tsx`, `error.tsx`, `not-found.tsx`, `proxy.ts`, route handlers, and server actions.
- Do not add `"use client"` unless required.
- Do not move logic from server to client without clear reason.
- Check affected caching, revalidation, cookies, headers, auth/session, and environment variable usage.

## Documentation Update Requirement

After code changes, update only affected sections in:

- `docs/ai/00_PROJECT_OVERVIEW.md`
- `docs/ai/10_ARCHITECTURE.md`
- `docs/ai/20_ROUTE_MAP.md`
- `docs/ai/30_FEATURE_INDEX.md`
- `docs/ai/40_DATA_FLOW.md`
- `docs/ai/50_API_MAP.md`
- `docs/ai/60_DATABASE_MAP.md`
- `docs/ai/70_COMPONENT_MAP.md`
- `docs/ai/80_DEPENDENCY_GRAPH.md`
- `docs/ai/99_CHANGELOG_AI.md`
- `docs/ai/features/`
- `docs/ai/shared/`
- `docs/ai/workflows/`

Do not rewrite unrelated documentation.
