# Legal/Official Paid Tournament Workflow

Last updated: 2026-06-26

## Scope

This document covers the end-to-end player registration and payment flow for legal/resmi paid tournaments, represented in code as `tournamentType: "official"` with `registrationFeeIdr > 0`.

It does not cover free Reclub/recreational joins except where the code explicitly separates official and recreational behavior.

## Entry Point

Primary public entry:

- `/sports/[sportSlug]/tournaments/[slug]/register`
- Page file: `app/sports/[sportSlug]/tournaments/[slug]/register/page.tsx`
- Component: `components/tournaments/official-registration-wizard.tsx`

Related flow pages:

- `/sports/[sportSlug]/tournaments/[slug]/register/confirm`
- `/sports/[sportSlug]/tournaments/[slug]/register/checkout`
- `/sports/[sportSlug]/tournaments/[slug]/register/success`

The register page requires an authenticated session. Unauthenticated users are redirected to `/register` with a callback back to the public tournament detail route.

## User Action

1. Player opens an official tournament registration page.
2. Player enters a team name.
3. Player optionally searches and adds partner user IDs.
4. Player reviews the order summary and submits registration.
5. Player confirms participation on the confirmation page.
6. Player chooses a checkout payment method.
7. Player completes payment through QRIS, virtual account, e-wallet, or card.
8. The app receives payment confirmation through webhook or polling.
9. Player lands on the success page and can view/download receipt.

## UI Component Sequence

Registration:

- `TournamentRegisterPage`
- `PageShell`
- `OfficialRegistrationWizard`
- `PlayerSearchPicker`
- `ConfirmDialogProvider` confirmation modal
- `LoadingOverlay`

Confirmation:

- `TournamentRegisterConfirmPage`
- `PageShell`
- `RegistrationConfirmClient`
- `OfficialRegistrationEditDialog` for pre-payment edits
- `useCancelRegistration` for decline/cancel before payment completion

Checkout:

- `TournamentRegisterCheckoutPage`
- `PageShell`
- `RegistrationCheckoutClient`
- `OrderSummaryCard`
- payment method buttons from `CHECKOUT_PAYMENT_METHODS`
- QRIS/VA/e-wallet/card instruction panels
- `PaymentReceiptActions` when payment is complete

Success:

- `RegistrationSuccessPage`
- `RegistrationSuccessContent`
- `PaymentReceiptActions`

## Validation

Tournament creation validation:

- `lib/validations/tournaments.ts`
- Official tournaments require `registrationFeeIdr > 0`.
- Recreational tournaments reject paid fees.
- Slug, name, status, type, format, team limits, dates, venue URLs, and rules fields are validated by `tournamentUpsertSchema`.

Registration submission validation:

- `app/api/tournaments/[sportSlug]/[slug]/register/route.ts`
- Body schema requires `teamName` length 2-120.
- `memberUserIds` is an array with max 8 entries.
- Account email is required before payment can be created.
- Rate limit key: `tournament-register:${userId}`.

Service validation:

- `startOfficialRegistration` rejects non-official tournaments.
- It rejects missing or non-positive registration fee.
- It requires Xendit configuration.
- It checks registration open/close windows.
- It prevents duplicate confirmed registration by the same user.
- It resumes existing `awaiting_confirmation` or `pending_payment` registrations.
- It checks `maxTeams` using active statuses: `confirmed`, `pending_payment`, `awaiting_confirmation`.
- It handles duplicate team names using the `tournament_teams_name_uidx` database constraint.

Confirmation validation:

- `app/api/tournaments/registrations/[id]/confirm/route.ts`
- Requires `sportSlug` and `slug` query params.
- Requires registration ownership by current user.
- Allows confirmation only from `awaiting_confirmation`.
- `pending_payment` returns the existing checkout URL.
- `confirmed`, `declined`, and `cancelled` are rejected as conflict/current-state errors.

Checkout validation:

- `app/api/tournaments/registrations/[id]/pay/route.ts`
- Body method must be one of `qris`, `bank_transfer`, `ewallet`, `card`.
- Registration ID must be a UUID.
- Registration must belong to current user.
- Registration status must be `pending_payment`.
- Paid payments cannot be paid again.
- Rate limit key: `checkout-pay:${userId}`.

## API/Server Action Call

No explicit Next.js server action is used for this workflow. Mutations use App Router route handlers.

Registration submit:

- Client: `OfficialRegistrationWizard.handleSubmit`
- API: `POST /api/tournaments/[sportSlug]/[slug]/register`
- Handler: `app/api/tournaments/[sportSlug]/[slug]/register/route.ts`
- Service: `startOfficialRegistration`
- Response: `{ registrationId, status, confirmUrl }` or existing checkout data

Confirm participation:

- Client: `RegistrationConfirmClient.confirmParticipation`
- API: `POST /api/tournaments/registrations/[id]/confirm?sportSlug=...&slug=...`
- Handler: `app/api/tournaments/registrations/[id]/confirm/route.ts`
- Service: `confirmParticipation`
- Response: `{ registrationId, checkoutUrl, amountIdr }`

Cancel/decline:

- Client: `useCancelRegistration`
- API: `DELETE /api/tournaments/registrations/[id]/confirm?sportSlug=...&slug=...`
- Service: `declineParticipation`
- Response: `{ declined: true }`

Load checkout detail:

- Client: `RegistrationCheckoutClient.loadDetail`
- API: `GET /api/tournaments/registrations/[id]`
- Handler: `app/api/tournaments/registrations/[id]/route.ts`
- Service: `getRegistrationDetail`

Start payment:

- Client: `RegistrationCheckoutClient.initiatePayment`
- API: `POST /api/tournaments/registrations/[id]/pay`
- Handler: `app/api/tournaments/registrations/[id]/pay/route.ts`
- Service: `initiateCheckoutPayment`
- Payment services:
  - QRIS: `createQrisPayment`
  - Bank transfer: `createCallbackVirtualAccount`
  - E-wallet/card: `issueRegistrationInvoice`

Payment status polling:

- Client: `RegistrationCheckoutClient.pollPaymentStatus`
- API: `GET /api/tournaments/registrations/[id]/payment-status`
- Handler: `app/api/tournaments/registrations/[id]/payment-status/route.ts`
- Service: `expireRegistrationIfOverdue`

Provider callback:

- API: `POST /api/webhooks/xendit`
- Handler: `app/api/webhooks/xendit/route.ts`
- Services:
  - `confirmPaymentByRegistrationId`
  - `confirmPaymentByInvoiceId`
  - `failPaymentByInvoiceId`
  - `handleSplitPaymentWebhook`
  - `handlePayoutWebhook`

## Auth/Session Handling

Server pages:

- Register and confirm pages call `getServerSession()`.
- Checkout page calls `getServerSession()` and validates that `registrationId` belongs to the session user through `getUserRegistrationStatus`.
- Success page calls `requireSession()`.

API routes:

- Protected mutation/read handlers use `requireApiRoleGuardContext()`.
- Registration and payment route handlers use the returned `userId`.
- Ownership is checked against `tournamentRegistrations.registeredByUserId`.
- Webhook route skips normal origin checks but uses `guardApiRequest`, rate limiting, and `verifyXenditWebhookToken`.

Redirect behavior:

- Unauthenticated register page redirects to `/register?callbackUrl=...`.
- Unauthenticated confirm/checkout pages redirect to `/login?callbackUrl=...`.
- Invalid or foreign `registrationId` results in redirect or `notFound()` depending on page context.

## Database Interaction

Primary tables:

- `tournaments`
- `tournamentTeams`
- `tournamentTeamMembers`
- `tournamentRegistrations`
- `tournamentPayments`
- `platformSettings`
- `user`
- `notifications`

Creation phase:

- Insert `tournamentTeams` with `tournamentId`, `name`, and `captainUserId`.
- Insert `tournamentTeamMembers` for captain and selected partners.
- Insert `tournamentRegistrations` with status `awaiting_confirmation`.
- Create notifications/emails for the player, host, and invited team members.

Confirmation phase:

- Update `tournamentRegistrations`:
  - `status: "pending_payment"`
  - `confirmedAt`
  - `confirmedByUserId`
  - `paymentDueAt`
- Create or update `tournamentPayments` through `issueRegistrationInvoice`.
- Payment split is calculated by `calculateOfficialPaymentSplit` using `platformSettings`.
- Payment row stores:
  - `xenditInvoiceId`
  - `xenditExternalId`
  - `amountIdr`
  - `platformFeeIdr`
  - `processingFeeIdr`
  - `hostPayoutIdr`
  - `invoiceUrl`
  - `xenditSplitRuleId`
  - `hostPayoutStatus`
  - `metadata`

Checkout method phase:

- QRIS and virtual account update `tournamentPayments.metadata` with method-specific references and expiry.
- E-wallet/card uses the Xendit invoice URL.

Payment success phase:

- `finalizePaidPayment` updates `tournamentPayments.status` to `paid` and sets `paidAt`.
- It updates `tournamentRegistrations.status` to `confirmed`.
- It sends registration confirmed emails and notifications.
- Public official roster reads only rows with registration `confirmed` and payment `paid`.

Failure/expiry phase:

- `expireRegistrationIfOverdue` changes registration to `cancelled`, payment to `expired`, deletes team members and team, then notifies the player.
- `markPaymentAttemptFailed` updates payment status to `failed` when the payment window is still active.
- Decline/cancel before payment completion uses `rollbackDraftRegistration` when a team exists, deleting payment, registration, team members, and team.

## Response Handling

Registration wizard:

- On `confirmUrl`, shows success toast and pushes to confirm page.
- On `checkoutUrl`, pushes directly to checkout.
- On missing redirect URLs, pushes back to public tournament detail.
- On error, displays `json.error.message` via toast.

Confirm client:

- On success, pushes to returned `checkoutUrl` or a constructed checkout URL.
- On error, shows toast.
- Cancel flow shows toast and redirects to tournament detail when configured.

Checkout client:

- Loads checkout detail from `GET /api/tournaments/registrations/[id]`.
- Displays terminal panels for paid, confirmed, cancelled, failed, or expired states.
- For QRIS/VA, starts polling every 4 seconds after instructions are created.
- For e-wallet/card, opens a Xendit invoice URL in a new browser tab/window.
- On paid status, pushes to `/register/success?registrationId=...`.
- On expiry/cancelled status, reloads details and shows an error toast.

Success content:

- Loads registration detail.
- Polls up to 12 times at 5 second intervals while payment is still pending.
- Shows official receipt actions when `paymentStatus === "paid"` and `paymentId` exists.

Webhook:

- Returns `{ received: true }` after supported events.
- Ignores unknown but valid webhook shapes after logging.
- Converts Xendit invoice, QRIS, and VA success events into internal payment finalization.

## Redirect/Navigation

Main navigation path:

1. `/sports/[sportSlug]/tournaments/[slug]/register`
2. `/sports/[sportSlug]/tournaments/[slug]/register/confirm?registrationId=...`
3. `/sports/[sportSlug]/tournaments/[slug]/register/checkout?registrationId=...`
4. `/sports/[sportSlug]/tournaments/[slug]/register/success?registrationId=...`

Other redirects:

- Invalid checkout `registrationId` redirects back to `/register`.
- Checkout redirects cancelled/declined registrations back to `/register`.
- Checkout redirects `awaiting_confirmation` registrations to the confirm URL.
- Confirm page redirects `pending_payment` registrations to checkout.
- Confirm page redirects `confirmed` registrations to tournament detail.
- Xendit invoice success URL points to the success page.
- Xendit invoice failure URL points back to checkout with `failed=1`.

## Error Handling

User-facing:

- Client components use `toast.error(...)`.
- Loading states use `LoadingOverlay` and `LoadingSpinner`.
- Cancel/confirm/payment actions use `ConfirmDialogProvider`.
- Checkout presents specific UI for failed, expired, cancelled, and paid states.

API:

- Handlers catch errors and return `jsonError(error)`.
- Domain errors use `AppError` with status codes such as 400, 401, 403, 404, 409, 422, and 503.
- Rate limits protect registration, confirmation, payment initiation, and webhook entrypoints.

Payment:

- `confirmPaymentByInvoiceId` and `confirmPaymentByRegistrationId` are idempotent when already paid.
- Failed/expired invoice events call `failPaymentByInvoiceId`.
- Overdue registrations are expired on checkout page load and status polling.
- QRIS setup wraps provider failures with a clearer `PAYMENT_GATEWAY_ERROR` message.

Data consistency:

- If invoice creation fails after confirmation, `confirmParticipation` reverts the registration back to `awaiting_confirmation`.
- Cancellation before payment completion rolls back draft records.
- Paid payments block tournament deletion in admin/host manage handlers.

## Files Involved

Pages:

- `app/sports/[sportSlug]/tournaments/[slug]/register/page.tsx`
- `app/sports/[sportSlug]/tournaments/[slug]/register/confirm/page.tsx`
- `app/sports/[sportSlug]/tournaments/[slug]/register/checkout/page.tsx`
- `app/sports/[sportSlug]/tournaments/[slug]/register/success/page.tsx`

Components/hooks:

- `components/tournaments/official-registration-wizard.tsx`
- `components/tournaments/registration-confirm-client.tsx`
- `components/tournaments/official-registration-edit-dialog.tsx`
- `components/tournaments/registration-checkout-client.tsx`
- `components/tournaments/registration-success-content.tsx`
- `components/tournaments/player-search-picker.tsx`
- `components/payments/payment-receipt-actions.tsx`
- `hooks/use-cancel-registration.ts`

API routes:

- `app/api/tournaments/[sportSlug]/[slug]/register/route.ts`
- `app/api/tournaments/registrations/[id]/route.ts`
- `app/api/tournaments/registrations/[id]/confirm/route.ts`
- `app/api/tournaments/registrations/[id]/pay/route.ts`
- `app/api/tournaments/registrations/[id]/payment-status/route.ts`
- `app/api/webhooks/xendit/route.ts`

Services:

- `lib/tournaments/registration/service.ts`
- `lib/tournaments/registration/confirmation.ts`
- `lib/tournaments/registration/payment-expiry.ts`
- `lib/tournaments/registration/notify-flow.ts`
- `lib/tournaments/registration/notify-confirmed.ts`
- `lib/tournaments/payments/checkout-payment.ts`
- `lib/tournaments/payments/checkout-methods.ts`
- `lib/tournaments/payments/split.ts`
- `lib/tournaments/payments/platform-settings.ts`
- `lib/payments/xenplatform/registration-invoice.ts`
- `lib/payments/xenplatform/split-webhook.ts`
- `lib/payments/xendit/*`

Validation/schema:

- `lib/validations/tournaments.ts`
- `lib/validations/official-registration.ts`
- `db/schema/tournaments.ts`
- `db/schema/tournament-registration.ts`
- `db/schema/tournament-payments.ts`

Routing/constants:

- `lib/constants/routes.ts`

## Risk If Modified

High risk:

- Payment finalization can double-confirm or fail to confirm registrations if idempotency is changed.
- Webhook token/origin/rate-limit behavior is security critical.
- Registration status transitions affect roster visibility, payment history, receipts, host payouts, and tournament deletion constraints.
- Changing rollback behavior can leave orphaned teams, members, registrations, or payments.
- Changing `registrationId` ownership checks can expose another player's checkout or receipt.
- Changing payment split logic can misallocate platform fees, host payout amounts, or processing fees.
- Changing redirect URLs can break Xendit return flow or send users to stale registration states.

Medium risk:

- UI step changes can desync client expectations from server statuses.
- Polling interval/status shape changes can make QRIS/VA checkout appear stuck.
- Team member edits can break slot uniqueness or invite notifications.
- Tournament validation changes can allow official tournaments without payable fees.

Low risk:

- Copy-only UI changes that do not change status handling, fetch paths, payment method IDs, or route query params.

## Recommended Tests

API/unit:

- `startOfficialRegistration` rejects non-official tournaments.
- Official tournament without `registrationFeeIdr` fails validation.
- Registration outside open/close window fails.
- Duplicate confirmed registration returns conflict.
- Existing `awaiting_confirmation` returns confirm URL instead of creating a second registration.
- Existing `pending_payment` resumes checkout/payment.
- `maxTeams` counts active statuses and rejects full tournaments.
- Duplicate team name returns a conflict or existing registration resume.
- `confirmParticipation` moves `awaiting_confirmation` to `pending_payment` and creates payment.
- Invoice creation failure reverts confirmation state.
- `initiateCheckoutPayment` rejects non-owner registration IDs.
- `initiateCheckoutPayment` rejects statuses other than `pending_payment`.
- QRIS and VA initiation update `tournamentPayments.metadata`.
- `confirmPaymentByInvoiceId` and `confirmPaymentByRegistrationId` are idempotent.
- `failPaymentByInvoiceId` marks pending payments as failed/expired.
- `expireRegistrationIfOverdue` cancels registration and removes team/member rows.

Integration:

- Full player flow: register -> confirm -> checkout -> mock webhook paid -> success page detail.
- QRIS/VA polling transitions from pending to success.
- E-wallet/card failure redirects back to checkout with `failed=1`.
- Cancel from confirm rolls back team, members, registration, and payment if present.
- Cancel/expiry releases team slot and allows re-registration when capacity remains.
- Public official roster includes only `confirmed` + `paid` registrations.
- Paid registration blocks tournament deletion.

Auth/security:

- Unauthenticated pages redirect with callback URLs.
- Unauthenticated API calls fail through role guard.
- A user cannot load, pay, poll, or cancel another user's registration.
- Webhook rejects missing/invalid `x-callback-token`.
- Webhook rate limiting fails closed in production.

UI:

- `OfficialRegistrationWizard` validates required team name and max partner count.
- `RegistrationConfirmClient` handles edit, confirm, and cancel states.
- `RegistrationCheckoutClient` displays paid, pending, failed, expired, and cancelled states.
- `RegistrationSuccessContent` polls pending payment and shows receipt when paid.
