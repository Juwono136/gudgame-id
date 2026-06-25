# Shared: API Client

Last updated: 2026-06-25

## Server Response Helpers

| File | Purpose |
| --- | --- |
| `lib/api/response.ts` | `jsonSuccess`, `jsonError`, `assertFound`; standard API envelope and error conversion. |
| `lib/api/parse-request-json.ts` | Shared JSON request parsing. |
| `lib/api/parse-json-response.ts` | Shared JSON response parsing for fetch clients. |
| `lib/api/extract-error-message.ts` | Extracts error messages from unknown responses. |
| `lib/api/extract-api-error.ts` | Client-side helper for API error payloads. |
| `lib/api/guard-request.ts` | Request guard helpers. |
| `lib/api/rate-limit.ts` | Rate-limit utilities. Needs verification for active usage. |

## Pattern

```text
hook/client component
  -> fetch("/api/...")
  -> parse JSON / extract error
  -> API route handler
  -> jsonSuccess/jsonError
```

## Notes

- Prefer using existing helpers instead of open-coded JSON envelopes.
- Preserve auth/session cookie behavior when calling internal APIs.
- For high-risk mutations, document cache invalidation in the hook.

## Needs Verification

- Complete inventory of routes that do not use `jsonSuccess/jsonError`.
- Whether `rate-limit.ts` is applied broadly or only for selected routes.
