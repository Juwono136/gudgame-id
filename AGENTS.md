# AGENTS.md

## Purpose

This repository is a large Next.js project.

AI coding agents must use `docs/ai/` as the primary technical memory before editing code.

RTK is configured globally through the user's global `RTK.md`. Do not create a local `RTK.md` unless explicitly requested.

---

# Required Reading Strategy

Use progressive context loading.

Always start with:

- `docs/ai/00_PROJECT_OVERVIEW.md`

Then read only the documentation required for the current task.

| Task                                         | Read                                                           |
| -------------------------------------------- | -------------------------------------------------------------- |
| Feature implementation                       | `30_FEATURE_INDEX.md` + related file under `docs/ai/features/` |
| Routes / Pages / Layouts                     | `20_ROUTE_MAP.md`                                              |
| Architecture change                          | `10_ARCHITECTURE.md`                                           |
| Data flow                                    | `40_DATA_FLOW.md`                                              |
| API / Route Handlers / Server Actions        | `50_API_MAP.md`                                                |
| Database / ORM / Supabase / Prisma / Drizzle | `60_DATABASE_MAP.md`                                           |
| UI / Components / Hooks / Providers / Stores | `70_COMPONENT_MAP.md` + relevant file under `docs/ai/shared/`  |
| End-to-end workflow                          | related file under `docs/ai/workflows/`                        |
| Dependency change                            | `80_DEPENDENCY_GRAPH.md`                                       |

Read `99_CHANGELOG_AI.md` only when:

- updating documentation after code changes
- reviewing previous AI modifications

Never load documentation that is unrelated to the current task.

---

# Working Rules

Before editing:

1. Identify the affected feature.
2. Identify the affected files.
3. Identify whether routes, APIs, database, UI, or architecture are impacted.
4. Read only the required documentation.

General rules:

- Modify only necessary files.
- Do not refactor unrelated code.
- Preserve existing architecture.
- Preserve server/client boundaries.
- Preserve auth, middleware, caching and revalidation.
- Treat source code as the source of truth.
- Update documentation only after code changes.
- Mark uncertain information as `Needs verification`.

---

# Token Efficiency Rules

Minimize token usage while maintaining correctness.

## Documentation

- Never load every document by default.
- Load documentation progressively.
- Read only the documents required by the current task.
- Never reread files already loaded during the same session unless they changed.
- Do not recursively inspect documentation folders.
- Read only the specific feature, workflow, component or shared document involved.
- Skip architecture, database and dependency documentation unless affected.
- Keep context limited to the current task.

## Repository Search

Prefer targeted searches.

Use:

- `rg "keyword"`
- `rg --files path`
- filename search
- symbol search

Avoid:

- recursive repository scans
- broad `find`
- loading entire directories
- repeatedly listing the same folders

Only inspect files likely to be modified.

## Command Usage

Prefer RTK commands whenever practical.

Examples:

- `rtk rg`
- `rtk git status`
- `rtk git diff`
- `rtk ls`

Avoid commands that generate excessive output unless required.

If using lint or tests:

- prefer running only affected files
- avoid full-project lint unless requested
- avoid full-project test runs unless requested

Examples:

- `npm run lint path/to/file`
- project-specific targeted lint commands

## Context Management

Reuse information already available in the current conversation.

Do not:

- reread identical files
- repeat repository exploration
- inspect unrelated modules
- inspect unrelated APIs
- inspect unrelated routes

Expand context only when necessary.

---

# Next.js Rules

- Respect the existing routing architecture.
- Preserve server components whenever possible.
- Do not introduce `"use client"` unless required.
- Do not move server logic to the client without justification.
- Review caching, cookies, headers, auth, middleware and revalidation when affected.

Be careful when modifying:

- `layout.tsx`
- `template.tsx`
- `loading.tsx`
- `error.tsx`
- `not-found.tsx`
- `proxy.ts`
- Route Handlers
- Server Actions

---

# Documentation Update

After code changes, update only affected documentation.

Possible files include:

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

Update only documentation directly affected by the change.

Do not rewrite unrelated documentation.

---

# RTK Notes

When executing commands through RTK:

- Prefer targeted commands over repository-wide commands.
- Verify command output before issuing additional commands.
- Avoid repeating identical commands.
- If a command fails before execution, report the failure instead of retrying automatically.
- When requested, verify whether the attempted command appears in `rtk gain`.
- Do not assume failed commands are recorded by `rtk gain`.

---

# Preferred Workflow

For most tasks:

1. Read `00_PROJECT_OVERVIEW.md`
2. Identify affected feature
3. Read only relevant documentation
4. Locate target files with targeted search
5. Edit only necessary files
6. Update only affected documentation
7. Append to `99_CHANGELOG_AI.md`

Avoid unnecessary repository exploration throughout the process.
