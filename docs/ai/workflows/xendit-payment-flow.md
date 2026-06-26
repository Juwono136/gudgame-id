# Xendit Payment Gateway Workflow For Official Paid Tournaments

Last updated: 2026-06-26

## Scope

This document covers the Xendit payment gateway schema and end-to-end payment lifecycle for legal/resmi paid tournaments.

In code, this is the payment segment of an `official` tournament registration after the user has confirmed participation and the registration status becomes `pending_payment`.

It does not cover Reclub/free tournaments. Reclub must not create `tournamentPayments` rows.

## Entry Point

Checkout entry:

- `/sports/[sportSlug]/tournaments/[slug]/register/checkout?registrationId=...`
- Page file: `app/sports/[sportSlug]/tournaments/[slug]/register/checkout/page.tsx`
- Client component: `components/tournaments/registration-checkout-client.tsx`

Payment API entry:

- `POST /api/tournaments/registrations/[id]/pay`
- Handler: `app/api/tournaments/registrations/[id]/pay/route.ts`
- Service: `lib/tournaments/payments/checkout-payment.ts`

Webhook entry:

- `POST /api/webhooks/xendit`
- Handler: `app/api/webhooks/xendit/route.ts`

Payment row creation entry:

- `confirmParticipation`
- `issueRegistrationInvoice`
- `createRegistrationInvoiceWithSplit`

## User Action

1. Player submits official tournament registration.
2. Player confirms participation.
3. Server creates or updates a pending Xendit invoice and stores a `tournamentPayments` row.
4. Player opens checkout.
5. Player chooses a method: QRIS, bank transfer, e-wallet, or card.
6. Server creates method-specific Xendit instructions:
   - QRIS dynamic QR code.
   - Bank transfer callback virtual account.
   - E-wallet/card hosted Xendit invoice URL.
7. Player pays through Xendit.
8. Xendit sends webhook events to `/api/webhooks/xendit`.
9. Server marks payment `paid`, registration `confirmed`, and sends receipt/notifications.
10. Client polling or Xendit redirect sends player to success/receipt UI.

## UI Component Sequence

Checkout page:

- `TournamentRegisterCheckoutPage`
- `PageShell`
- `RegistrationCheckoutClient`
- `OrderSummaryCard`
- `CHECKOUT_PAYMENT_METHODS`
- `ConfirmDialogProvider`
- QRIS instruction panel
- Bank transfer instruction panel
- E-wallet/card secure window confirmation
- `LoadingOverlay`
- `PaymentReceiptActions`

Success page:

- `RegistrationSuccessPage`
- `RegistrationSuccessContent`
- `PaymentReceiptActions`

Supporting UI states:

- `CheckoutStatusPanel` for paid, cancelled, failed, and expired states.
- `LoadingSpinner` while loading checkout detail.
- Toast notifications for setup, failure, expiry, and payment received.

## Validation

Checkout page validation:

- `registrationId` query param must exist and be a UUID.
- Page requires authenticated session via `getServerSession()`.
- Sport must exist and be live.
- Tournament must exist and be `tournamentType === "official"`.
- `getUserRegistrationStatus` must show the `registrationId` belongs to the current user.
- `expireRegistrationIfOverdue` runs before rendering.
- Cancelled/declined registrations redirect to register.
- `awaiting_confirmation` redirects back to confirm URL.

Payment API validation:

- `app/api/tournaments/registrations/[id]/pay/route.ts`
- Requires `requireApiRoleGuardContext()`.
- Path `id` must parse as registration UUID.
- Rate limit key: `checkout-pay:${userId}`, limit 15 per 60 seconds.
- Body schema requires:
  - `method`: `qris`, `bank_transfer`, `ewallet`, or `card`
  - `sportSlug`
  - `slug`
  - optional `bankCode`
- Tournament must be found by slug.

Payment service validation:

- `initiateCheckoutPayment` requires registration detail to exist.
- Registration must belong to current user.
- Registration status must be `pending_payment`.
- Already-paid payments are rejected with conflict.
- A `tournamentPayments` row must exist before method setup.
- QRIS and bank transfer reuse existing metadata instructions when available.
- E-wallet/card require payer email.

Gateway validation:

- `isXenditConfigured()` must be true before official registration can start.
- `getXenditSecretKey()` throws `PAYMENT_NOT_CONFIGURED` when `XENDIT_SECRET_KEY` is absent.
- QRIS requires an HTTPS, non-localhost callback URL derived from `NEXT_PUBLIC_APP_URL`.
- Webhook requires valid `x-callback-token` matching `XENDIT_WEBHOOK_TOKEN`.

Payment split validation:

- `calculateOfficialPaymentSplit` clamps registration fee to non-negative.
- Platform fee is capped at registration fee.
- Processing fee is calculated from `processingFeePercent`.
- Host payout is `registrationFeeIdr - platformFeeIdr`.
- Total charge is `registrationFeeIdr + processingFeeIdr`.

## API/Server Action Call

No explicit Next.js server action is used. Mutations use route handlers and server-only services.

Confirm participation creates payment:

- API: `POST /api/tournaments/registrations/[id]/confirm?sportSlug=...&slug=...`
- Handler: `app/api/tournaments/registrations/[id]/confirm/route.ts`
- Service: `confirmParticipation`
- Payment service: `issueRegistrationInvoice`
- Gateway bridge: `createRegistrationInvoiceWithSplit`
- Xendit API: `POST /v2/invoices`

Start checkout method:

- Client: `RegistrationCheckoutClient.initiatePayment`
- API: `POST /api/tournaments/registrations/[id]/pay`
- Handler: `app/api/tournaments/registrations/[id]/pay/route.ts`
- Service: `initiateCheckoutPayment`

QRIS:

- Service: `createQrisPayment`
- Xendit API: `POST /qr_codes`
- Internal response: `{ method, amountIdr, expiresAt, qris: { qrId, qrString } }`

Bank transfer:

- Service: `createCallbackVirtualAccount`
- Xendit API: `POST /callback_virtual_accounts`
- Internal response: `{ method, amountIdr, expiresAt, bankTransfer }`

E-wallet/card:

- Service: `issueRegistrationInvoice`
- Xendit API: `POST /v2/invoices`
- Internal response: `{ method, amountIdr, expiresAt: null, ewalletRedirectUrl: invoiceUrl }`

Payment status polling:

- API: `GET /api/tournaments/registrations/[id]/payment-status`
- Handler: `app/api/tournaments/registrations/[id]/payment-status/route.ts`
- Services:
  - `expireRegistrationIfOverdue`
  - direct read from `tournamentPayments`

Webhook:

- API: `POST /api/webhooks/xendit`
- Handler: `app/api/webhooks/xendit/route.ts`
- Services:
  - `confirmPaymentByRegistrationId`
  - `confirmPaymentByInvoiceId`
  - `failPaymentByInvoiceId`
  - `handleSplitPaymentWebhook`
  - `handlePayoutWebhook`

## Auth/Session Handling

User checkout:

- Checkout page requires `getServerSession()`.
- Success page requires `requireSession()`.
- Payment detail/status APIs require `requireApiRoleGuardContext()`.
- Ownership is enforced by comparing `tournamentRegistrations.registeredByUserId` or registration detail user ID to current `userId`.

Gateway calls:

- Outbound Xendit calls use Basic auth from `XENDIT_SECRET_KEY`.
- The auth header is generated by `xenditAuthHeader()`.
- Xendit client functions are `server-only`.

Webhook:

- Uses `guardApiRequest(request, { tier: "webhook", skipOriginCheck: true })`.
- Uses `enforceRateLimit` with key `xendit-webhook`, limit 120 per 60 seconds, fail closed in production.
- Verifies `x-callback-token` with timing-safe comparison against `XENDIT_WEBHOOK_TOKEN`.
- Does not require a user session.

XenPlatform:

- `isXenPlatformEnabled()` requires Xendit configured, not staging mode, not development key, and `XENDIT_XENPLATFORM_ENABLED` not false/0.
- Production live-key split failures are not silently skipped when `isXenPlatformProductionSplitRequired()` is true.

## Database Interaction

Primary payment tables:

- `tournamentPayments`
- `platformSettings`
- `hostXenditAccounts`
- `tournamentRegistrations`
- `tournamentTeams`
- `tournamentTeamMembers`
- `notifications`

`tournamentPayments` schema:

- `id`
- `tournamentId`
- `registrationId`
- `payerUserId`
- `xenditInvoiceId`
- `xenditExternalId`
- `amountIdr`
- `platformFeeIdr`
- `hostPayoutIdr`
- `processingFeeIdr`
- `status`: `pending`, `paid`, `expired`, `failed`, `refunded`
- `invoiceUrl`
- `xenditSplitRuleId`
- `hostPayoutStatus`
- `hostPayoutCompletedAt`
- `paidAt`
- `metadata`
- `createdAt`
- `updatedAt`

Indexes/constraints:

- `tnmt_payments_reg_fk` restricts delete of linked registration.
- Indexes exist for tournament, registration, Xendit invoice ID, and payer.

Platform settings:

- Table: `platformSettings`
- Key: `tournament_payment`
- Shape:
  - `platformFeeIdr`
  - `processingFeePercent`
- Defaults:
  - `platformFeeIdr: 2000`
  - `processingFeePercent: 1.25`

Host account:

- Table: `hostXenditAccounts`
- Used for XenPlatform split destination.
- Relevant fields:
  - `userId`
  - `xenditAccountId`
  - `status`
  - `accountEmail`
  - bank/payout metadata

Invoice creation:

- `issueRegistrationInvoice` computes split.
- Xendit `external_id` format: `tnd-${tournament.id}-reg-${registrationId}`.
- Creates Xendit invoice with:
  - amount = `split.totalChargeIdr`
  - payer email
  - success redirect URL
  - failure redirect URL
  - `should_send_email: false`
  - items for registration fee and optional processing fee
  - metadata for tournament ID, registration ID, platform fee, host payout
- Upserts existing payment by `registrationId`.
- Stores invoice ID, external ID, amount, split amounts, pending status, invoice URL, split rule ID, host payout status, and metadata.

QRIS:

- Does not create a new `tournamentPayments` row.
- Updates existing payment metadata:
  - `paymentMethod: "qris"`
  - `qris.qrId`
  - `qris.qrString`
  - `expiresAt`

Bank transfer:

- Does not create a new `tournamentPayments` row.
- Updates existing payment metadata:
  - `paymentMethod: "bank_transfer"`
  - `bankTransfer.accountNumber`
  - `bankTransfer.bankCode`
  - `bankTransfer.accountName`
  - `bankTransfer.vaId`
  - `expiresAt`

E-wallet/card:

- Reissues/updates invoice through `issueRegistrationInvoice`.
- Stores `metadata.paymentMethod` as selected method label.
- Returns invoice URL as redirect URL.

Paid finalization:

- `finalizePaidPayment` updates `tournamentPayments.status = "paid"` and sets `paidAt`.
- Updates `tournamentRegistrations.status = "confirmed"`.
- Sends receipt/confirmation emails and in-app notifications.
- Host payment notification is triggered.

Failure/expiry:

- `failPaymentByInvoiceId(..., "failed")` marks payment failed if registration is still pending.
- `failPaymentByInvoiceId(..., "expired")` expires registration and payment.
- `expireRegistrationIfOverdue` cancels registration, marks payment expired, deletes team members and team, and notifies the player.

XenPlatform split:

- When enabled and host account is active/live, creates a split rule before invoice.
- Invoice request includes `with-split-rule` header.
- Payment row stores `xenditSplitRuleId` and `hostPayoutStatus: "pending"`.
- Split webhook updates host payout status to `completed` or `failed` and stores webhook payload in metadata.

## Response Handling

Checkout load:

- Client fetches `GET /api/tournaments/registrations/[id]`.
- Paid or confirmed state displays receipt actions.
- Cancelled/expired state displays register-again CTA.
- Failed state displays retry UI.

Method setup:

- `POST /pay` returns `jsonSuccess({ instructions })`.
- QRIS shows QR string and starts polling.
- Bank transfer shows VA account number and starts polling.
- E-wallet/card opens Xendit invoice URL in a new browser window/tab after user confirmation.
- On setup error, client clears selected method and shows toast.

Polling:

- QRIS/VA polling runs every 4 seconds.
- On `paid`, polling stops, success toast appears, and router pushes to success page.
- On expired/cancelled, polling stops, details reload, and error toast appears.
- Poll errors are ignored client-side to avoid noisy UX.

Webhook:

- Valid handled webhooks return `{ received: true }`.
- QRIS `COMPLETED` confirms by registration ID from metadata or reference ID.
- VA `PAID` confirms by registration ID parsed from external ID.
- Invoice `PAID` confirms by Xendit invoice ID.
- Invoice `EXPIRED` marks expired.
- Invoice `FAILED` or `VOIDED` marks failed.
- Split events update host payout status only.
- Payout events are delegated to host payout webhook handling.

## Redirect/Navigation

Checkout route:

- Invalid/missing registration ID redirects to `/register`.
- Unauthenticated checkout redirects to `/login?callbackUrl=...`.
- Foreign registration ID returns `notFound()`.
- Cancelled/declined registration redirects to `/register`.
- Awaiting-confirmation registration redirects to confirm page.

Xendit invoice redirects:

- Success URL:
  - `/sports/[sportSlug]/tournaments/[slug]/register/success?registrationId=...`
- Failure URL:
  - `/sports/[sportSlug]/tournaments/[slug]/register/checkout?registrationId=...&failed=1`

Client navigation:

- QRIS/VA paid polling pushes to success page.
- E-wallet/card opens Xendit invoice URL in a new tab/window.
- Success page loads registration detail and receipt actions.

## Error Handling

User-facing:

- Checkout setup errors display toast messages.
- `failed=1` query displays payment-not-completed toast, then removes the flag with `router.replace`.
- Expired/cancelled states show a dedicated panel.
- Previous failed payment state shows retry UI.

API:

- Route handlers return `jsonError(error)`.
- Zod validation failures return `VALIDATION_ERROR`.
- Missing payment row returns 404.
- Already paid payment returns 409.
- Gateway failure becomes `PAYMENT_GATEWAY_ERROR` with HTTP 502.
- Missing Xendit config becomes `PAYMENT_NOT_CONFIGURED` with HTTP 503.

Gateway:

- `xenditRequest` logs Xendit status, path, error code, and errors.
- QRIS local/non-HTTPS callback returns service unavailable with a local-testing hint.
- QRIS gateway errors are wrapped with a clearer QRIS setup message.
- Webhook invalid token returns 401.

Idempotency:

- `confirmPaymentByRegistrationId` and `confirmPaymentByInvoiceId` return early when no payment exists or already paid.
- Existing QRIS/VA metadata is reused instead of creating duplicate instructions.
- Existing payment row is updated when invoice is reissued for a registration.

Rollback:

- If invoice creation fails after participation confirmation, `confirmParticipation` restores registration to `awaiting_confirmation`.
- Cancel/decline before payment completion can delete payment, registration, team members, and team through draft rollback.

## Files Involved

Pages/components:

- `app/sports/[sportSlug]/tournaments/[slug]/register/checkout/page.tsx`
- `app/sports/[sportSlug]/tournaments/[slug]/register/success/page.tsx`
- `components/tournaments/registration-checkout-client.tsx`
- `components/tournaments/registration-success-content.tsx`
- `components/payments/payment-receipt-actions.tsx`

Payment APIs:

- `app/api/tournaments/registrations/[id]/pay/route.ts`
- `app/api/tournaments/registrations/[id]/payment-status/route.ts`
- `app/api/tournaments/registrations/[id]/route.ts`
- `app/api/tournaments/registrations/[id]/confirm/route.ts`
- `app/api/webhooks/xendit/route.ts`

Registration/payment services:

- `lib/tournaments/registration/confirmation.ts`
- `lib/tournaments/registration/service.ts`
- `lib/tournaments/registration/payment-expiry.ts`
- `lib/tournaments/registration/notify-flow.ts`
- `lib/tournaments/registration/notify-confirmed.ts`
- `lib/tournaments/payments/checkout-payment.ts`
- `lib/tournaments/payments/checkout-methods.ts`
- `lib/tournaments/payments/platform-settings.ts`
- `lib/tournaments/payments/split.ts`

Xendit/XenPlatform:

- `lib/payments/xendit.ts`
- `lib/payments/xendit/client.ts`
- `lib/payments/xendit/invoices.ts`
- `lib/payments/xendit/qrcode.ts`
- `lib/payments/xendit/virtual-accounts.ts`
- `lib/payments/xenplatform/config.ts`
- `lib/payments/xenplatform/registration-invoice.ts`
- `lib/payments/xenplatform/split-rules.ts`
- `lib/payments/xenplatform/split-webhook.ts`
- `lib/payments/xenplatform/accounts.ts`
- `lib/payments/xenplatform/host-account-service.ts`

Schema:

- `db/schema/tournament-payments.ts`
- `db/schema/tournament-registration.ts`
- `db/schema/tournaments.ts`
- `db/schema/host-xendit.ts`
- `db/schema/notifications.ts`

Supporting:

- `lib/api/guard-request.ts`
- `lib/api/rate-limit.ts`
- `lib/api/response.ts`
- `lib/errors.ts`
- `lib/config/xendit-env.ts`
- `lib/constants/routes.ts`

## Risk If Modified

High risk:

- Webhook token validation, rate limiting, or origin handling changes can expose payment finalization to forged requests.
- Changing invoice external ID/reference formats can break webhook registration ID parsing.
- Changing payment status transitions can confirm unpaid registrations or lose paid registrations.
- Changing split calculation can misallocate platform fee, processing fee, or host payout.
- Changing XenPlatform fallback rules can silently skip required host payouts or block production checkout.
- Changing QRIS callback URL behavior can make QRIS unusable in production or appear available locally when it cannot work.
- Changing payment ownership checks can expose another player's payment or receipt.
- Changing expiry cleanup can leave reserved teams after unpaid registrations expire.

Medium risk:

- Reissuing invoices can overwrite metadata used by QRIS/VA instructions.
- Changing polling response shape can make checkout appear stuck.
- Changing `should_send_email` can duplicate provider and app emails.
- Changing invoice success/failure URLs can strand users after Xendit hosted checkout.
- Changing host payout status values can break host payment dashboards and payout jobs.

Low risk:

- UI copy changes that do not alter route paths, payment method IDs, response field names, status names, or metadata shape.

## Recommended Tests

Unit/service:

- `calculateOfficialPaymentSplit` with normal, zero, and platform-fee-greater-than-fee cases.
- `issueRegistrationInvoice` inserts payment row with expected split fields.
- `issueRegistrationInvoice` updates existing payment row for same registration.
- `issueRegistrationInvoice` passes success/failure redirects and `shouldSendEmail: false`.
- XenPlatform disabled creates invoice without split and stores `hostPayoutStatus: "skipped"`.
- XenPlatform enabled with active host account creates split rule and invoice with split header.
- Production split-rule failure blocks checkout.
- Non-production split-rule failure falls back to invoice without split.
- `initiateCheckoutPayment` rejects non-owner registration.
- `initiateCheckoutPayment` rejects non-`pending_payment`.
- `initiateCheckoutPayment` rejects already paid payment.
- QRIS setup stores `qris`, `paymentMethod`, and `expiresAt` metadata.
- Bank transfer setup stores `bankTransfer`, `paymentMethod`, and `expiresAt` metadata.
- Existing QRIS/VA metadata is reused.
- E-wallet/card returns invoice URL.

API:

- `POST /pay` validates method enum and registration UUID.
- `POST /pay` rate-limits repeated attempts.
- `GET /payment-status` rejects another user's registration.
- `GET /payment-status` expires overdue registrations.
- Webhook rejects missing/invalid callback token.
- Webhook handles QRIS `COMPLETED`.
- Webhook handles VA `PAID`.
- Webhook handles invoice `PAID`, `EXPIRED`, `FAILED`, and `VOIDED`.
- Webhook finalization is idempotent for already-paid payments.
- Split webhook marks `hostPayoutStatus` completed/failed.

Integration:

- Full flow: confirm participation -> invoice/payment row pending -> choose QRIS -> mock webhook -> registration confirmed.
- Full flow: confirm participation -> choose VA -> mock webhook -> success page.
- Full flow: e-wallet/card opens invoice URL and Xendit success redirect lands on success page.
- Failure redirect with `failed=1` shows retry state and strips query flag.
- Overdue payment cancels registration and releases team slot.
- Paid registration appears in public official roster and payment history.
- Paid registration cannot be deleted by tournament delete routes.

Security:

- Outbound Xendit calls require `XENDIT_SECRET_KEY`.
- QRIS rejects localhost/non-HTTPS callback URLs.
- Webhook works without user session but only with valid Xendit token.
- Payment/receipt APIs do not leak data across users.

UI:

- Checkout displays correct totals from `amountIdr`, `registrationFeeIdr`, and `processingFeeIdr`.
- QRIS/VA instructions render and copy actions work.
- Polling navigates to success on paid status.
- Expired, cancelled, failed, and paid panels render correctly.
