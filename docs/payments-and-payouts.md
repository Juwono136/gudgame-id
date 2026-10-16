# Payments & Host Payouts

Gud Game uses **Xendit** for registration invoices and optional **XenPlatform** flows for host settlement. Automated disbursements run from the Docker **payout-cron** sidecar.

---

## Registration payments

```text
Player checkout  →  create Xendit invoice  →  player pays
                         ↓
                   webhook / status sync
                         ↓
              registration marked paid / confirmed
```

| Piece | Location |
| --- | --- |
| Payment schema | `db/schema/tournament-payments.ts` |
| Xendit client / helpers | `lib/payments/` |
| Checkout UI | tournament `register` → `checkout` / `success` routes |
| Host payment views | `/dashboard/host/.../payments` |

Env (see `.env.production.example`):

- `XENDIT_SECRET_KEY`
- `XENDIT_WEBHOOK_TOKEN`
- `XENDIT_XENPLATFORM_ENABLED`
- `XENDIT_STAGING_MODE` (safer testing)

---

## Host XenPlatform & bank accounts

Hosts can connect platform accounts and store bank destinations for payouts:

| Schema | Purpose |
| --- | --- |
| `host-xendit.ts` | Connected account / platform linkage |
| `host-bank-accounts.ts` | Payout destinations |
| `host-payout-disbursements.ts` | Disbursement records |

UI: host dashboard payments / settings.

---

## Automated payouts (cron)

| Item | Detail |
| --- | --- |
| Sidecar | `ops/cron` → Compose service `payout-cron` |
| Endpoint | `POST /api/cron/host-payouts` |
| Auth | `CRON_SECRET` |
| Sibling job | `POST /api/cron/timed-matches` (Fun Match hard-stop) |

The Next.js app does not rely on external cron SaaS; the Alpine container calls internal Docker DNS (`http://app:3000`).

---

## Operational guidelines

1. Prefer **staging mode** keys until webhook + invoice flows are verified.  
2. Webhook URL must be reachable on the public domain (`gudgame.id`).  
3. Never commit secret keys; use GitHub Actions secrets / server `.env`.  
4. After deploy, confirm cron logs show successful authenticated calls.  
5. Partner paid events follow the same payment engine under partner routes — confirm tenant context in receipts.

---

## Related

- [tournaments.md](./tournaments.md)
- [cicd-and-ops.md](./cicd-and-ops.md)
- [DEPLOYMENT-VPS.md](./DEPLOYMENT-VPS.md)
