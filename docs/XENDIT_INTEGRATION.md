# Xendit Payment Integration — TandingBase

This guide walks you through connecting Xendit for **official (paid) tournament registration**, including XenPlatform split payouts to hosts, webhook confirmation, and platform fee (bagi hasil) configuration.

## 1. Prerequisites

- Active [Xendit](https://www.xendit.co/) account (Test mode for development)
- **XenPlatform activated** on your master account (Dashboard → xenPlatform)
- Public HTTPS URL for webhooks (use [ngrok](https://ngrok.com/) locally)
- Redis running (`REDIS_URL`) for caching and rate limiting under load

## 2. Environment variables

Add to `.env` (see `.env.example`):

```env
# Xendit — use Test Secret Key from Dashboard → Developers → API Keys
XENDIT_SECRET_KEY="xnd_development_xxxxxxxx"

# Webhook verification token (you define this; must match Xendit dashboard)
XENDIT_WEBHOOK_TOKEN="your_long_random_webhook_token"

# XenPlatform split payouts (default on when Xendit is configured)
XENDIT_XENPLATFORM_ENABLED="true"

# App URL used for payment redirect URLs
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Redis — required for tournament page cache + API rate limits
REDIS_URL="redis://127.0.0.1:6379"
```

**Never commit real secret keys.** Use Test keys until production go-live.

### Deployed app, still testing payments (staging)

You can run `NODE_ENV=production` on a public URL while keeping Xendit **Test** keys:

```env
XENDIT_STAGING_MODE=true
XENDIT_SECRET_KEY=xnd_development_…
XENDIT_WEBHOOK_TOKEN=…   # from Xendit Test dashboard; escape $ as $$ in APP_ENV_FILE
STRICT_PRODUCTION_ENV=true
```

Configure webhooks in the Xendit dashboard while in **Test mode** pointing to your public URL.

Before real go-live: set `XENDIT_STAGING_MODE=false`, replace with `xnd_production_…`, and reconfigure webhooks in **Live mode**.

Set `XENDIT_XENPLATFORM_ENABLED="false"` only if you want invoice payments without automatic host routing (legacy mode).

## 3. Xendit Dashboard setup

### API Keys

1. Open **Developers → API Keys**
2. Copy **Secret API Key** (Test) → `XENDIT_SECRET_KEY`
3. Public key is not required for server-side Invoice API

### XenPlatform

1. Activate xenPlatform on your master account
2. Hosts click **Enable payout account** in the Host dashboard (`POST /api/host/payout`)
3. App creates a **managed sub-account** per host and stores it in `host_xendit_accounts`
4. Complete any KYC / verification steps in the Xendit dashboard for the sub-account

### Webhooks (Settings → Webhooks)

1. Toggle **Enable Webhooks** ON (green)
2. Click **Copy Webhook Verification Token** → paste into `.env` as `XENDIT_WEBHOOK_TOKEN`
3. Set URL for all events to:

   ```
   https://YOUR_DOMAIN/api/webhooks/xendit
   ```

   Production (GCP VM + Cloudflare): `https://tandingbase.portproject.my.id/api/webhooks/xendit` — see [DEPLOYMENT_GCP.md](./DEPLOYMENT_GCP.md).

4. Configure these events (minimum):
   - **Invoice paid** → same URL
   - **Invoice expired** → same URL
   - **Invoice failed** → same URL (recommended)
   - **Split payment status** (`split.payment`) → same URL (XenPlatform host payout tracking)

5. Click **Test webhook** next to each URL to verify `200` response

> The app reads `x-callback-token` header and matches it against `XENDIT_WEBHOOK_TOKEN`.

### Payment methods

Xendit Invoices automatically offer enabled methods in your account (VA, e-wallets, QRIS, etc.). Enable methods under **Payment Methods** in the Xendit dashboard.

## 4. Platform fee (bagi hasil) + XenPlatform split

Admin configures the platform cut via API:

```
PATCH /api/admin/platform/payment-settings
Authorization: super_admin session

{
  "platformFeeIdr": 2000,
  "processingFeePercent": 1.25
}
```

Example: Registration Rp 10.000

| Line | Amount |
|------|--------|
| Registration fee | Rp 10.000 |
| Platform fee (TandingBase) | Rp 2.000 |
| Host payout (organizer) | Rp 8.000 |
| Processing fee (shown on invoice) | Rp 125 |
| **Total charged to player** | **Rp 10.125** |

### How XenPlatform routing works

1. Host enables payout account (creates XenPlatform managed sub-account)
2. On registration, app creates a **split rule** routing `hostPayoutIdr` to the host sub-account
3. Invoice is created with `with-split-rule` header
4. After settlement, Xendit sends `split.payment` webhook → `host_payout_status` updated on `tournament_payments`
5. Platform fee + processing fee remain on the master account

If XenPlatform is disabled or host has not set up payouts, paid registration returns `HOST_PAYOUT_NOT_CONFIGURED` (503).

## 5. Registration flow (how it works)

1. Player opens official tournament → **Register & pay**
2. App creates team + registration (`pending_payment`)
3. App creates XenPlatform split rule (when enabled) + Xendit `POST /v2/invoices`
4. Player redirected to `invoice_url` (Xendit hosted page)
5. Player pays via any enabled method
6. Xendit sends webhook → `POST /api/webhooks/xendit`
7. App marks payment `paid` and registration `confirmed`
8. Split webhook marks `host_payout_status` = `completed` when funds route to host
9. If invoice **expires** or **fails**, webhook downgrades payment + cancels registration

**Resume payment:** Pending registrations return the existing `invoiceUrl` (no duplicate charge).

**Check status:** `GET /api/tournaments/{sportSlug}/{slug}/registration-status` (authenticated)

## 6. Local testing checklist

1. `npm run db:push` — apply tournament/payment/host_xendit tables
2. Set `.env` variables above (including Redis)
3. Start app: `npm run dev`
4. Start ngrok: `ngrok http 3000`
5. Register webhook URLs in Xendit (Test mode)
6. As **host**, open Host dashboard → **Enable payout account**
7. As **super_admin**, create an **official** tournament with `registrationFeeIdr` > 0
8. Sign in as a **player**, open tournament → Register & pay
9. Use [Xendit test payment credentials](https://docs.xendit.co/docs/testing-payments)
10. Confirm webhooks in server logs
11. Verify DB:
    - `tournament_registrations.status` = `confirmed`
    - `tournament_payments.status` = `paid`
    - `tournament_payments.host_payout_status` = `completed` (after split webhook)

## 7. Troubleshooting

| Issue | Fix |
|-------|-----|
| `PAYMENT_NOT_CONFIGURED` | Set `XENDIT_SECRET_KEY` |
| `HOST_PAYOUT_NOT_CONFIGURED` | Host must click **Enable payout account** in Host dashboard |
| Webhook 401 | Match `X-CALLBACK-TOKEN` header with `XENDIT_WEBHOOK_TOKEN` |
| Invoice created but status not updating | Check ngrok URL, webhook events enabled, server logs |
| Host payout stuck `pending` | Enable `split.payment` webhook; check XenPlatform settlement time |
| `db:push` NOTICE about identifier truncation | Harmless PostgreSQL notice (63-char limit); schema uses short FK names |
| Redirect after pay fails | Set correct `NEXT_PUBLIC_APP_URL` |

## 8. Security notes

- Webhook endpoint validates `x-callback-token` header
- Secret key only used server-side (`lib/payments/xendit/*` has `server-only`)
- Registration requires authenticated user (no guest checkout)
- Payment amounts computed server-side — never trust client-submitted totals
- API rate limits on registration (10/min per user) and webhooks (120/min) via Redis
- Tournament public pages cached in Redis (30–60s TTL) with invalidation on mutations

## 9. Related code

| Area | Path |
|------|------|
| Xendit HTTP client | `lib/payments/xendit/client.ts` |
| Invoices | `lib/payments/xendit/invoices.ts` |
| XenPlatform accounts | `lib/payments/xenplatform/accounts.ts` |
| Split rules | `lib/payments/xenplatform/split-rules.ts` |
| Host payout setup | `lib/payments/xenplatform/host-account-service.ts` |
| Registration invoice | `lib/payments/xenplatform/registration-invoice.ts` |
| Split webhook | `lib/payments/xenplatform/split-webhook.ts` |
| Host payout API | `app/api/host/payout/route.ts` |
| Fee split | `lib/tournaments/payments/split.ts` |
| Registration | `lib/tournaments/registration/service.ts` |
| Webhook | `app/api/webhooks/xendit/route.ts` |
| Redis cache | `lib/cache/redis-cache.ts` |
| Rate limiting | `lib/api/rate-limit.ts` |
| Admin fee config | `app/api/admin/platform/payment-settings/route.ts` |
