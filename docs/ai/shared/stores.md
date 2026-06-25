# Shared: Stores

Last updated: 2026-06-25

## Zustand Stores

| Store | File | Purpose |
| --- | --- | --- |
| Auth UI store | `stores/auth-ui-store.ts` | Zustand store with `isSubmitting` and `setSubmitting(value)` for shared auth form submission UI state. |

## Guidance

- Prefer React Query for server state.
- Use stores for UI state that must be shared across distant client components.
- Avoid storing session/role truth in Zustand; use auth/session APIs and guards.

## Needs Verification

- Exact auth UI store consumers.
- Whether additional stores are planned.
