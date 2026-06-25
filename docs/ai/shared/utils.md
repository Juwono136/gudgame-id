# Shared: Utils

Last updated: 2026-06-25

## Utility Areas

| Folder/file | Purpose |
| --- | --- |
| `lib/utils.ts` | General utilities, likely class merging. |
| `lib/config/*` | Environment, site, build-time, and provider config. |
| `lib/constants/*` | Routes, navigation, pages, layout constants, auth backgrounds, phone countries. |
| `lib/validations/*` | Zod and validation schemas by feature. |
| `lib/security/*` | Security headers, origin checks, client IP, auth lockout. |
| `lib/format/currency.ts` | Currency formatting. |
| `lib/html/strip-html.ts` | HTML text utility. |
| `lib/logger.ts` | Shared logger. |
| `lib/cache/redis-cache.ts` | Redis cache helpers. |
| `lib/redis.ts` | Redis client/ping lifecycle. |
| `lib/storage/*` | Storage clients, object lifecycle, media URL resolution. |
| `lib/email/*` | Email transport, config, templated send, templates. |
| `lib/maps/*` | Google Places/Maps helpers. |
| `lib/firebase/*` | Firebase client/admin/config. |
| `lib/styles/*` | Shared style class helpers. |
| `lib/domain/*` | Domain-specific type/UUID helpers. |
| `lib/pagination/constants.ts` | Pagination defaults. |

## Guidance

- Reuse existing utility modules and validation schemas before adding new ones.
- Keep server-only utilities out of client components.
- For env/config changes, verify build-time behavior and Docker constraints.

## Needs Verification

- Exact runtime safety of each utility in client/server bundles.
- Whether `lib/env.ts` is legacy or still used.
