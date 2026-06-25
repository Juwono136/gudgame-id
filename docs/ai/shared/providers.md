# Shared: Providers

Last updated: 2026-06-25

## Provider Files

| File | Purpose |
| --- | --- |
| `providers/app-providers.tsx` | Client wrapper composing all global providers. |
| `providers/theme-provider.tsx` | Theme provider, likely `next-themes`. |
| `providers/query-provider.tsx` | TanStack React Query provider. |
| `providers/confirm-dialog-provider.tsx` | App-level confirmation dialog context. |

## Provider Order

```text
ThemeProvider
  QueryProvider
    ConfirmDialogProvider
      DashboardLayoutClient
        children
    Toaster
```

## Notes

- `AppProviders` is a client component imported by server `app/layout.tsx`.
- `DashboardLayoutClient` is global, so dashboard/mobile layout behavior may affect all pages.
- Changing provider order can break hooks, theme hydration, toast placement, or confirmation dialogs.

## Needs Verification

- Exact defaults for `QueryClient`.
- Whether `DashboardLayoutClient` intentionally wraps public pages.
