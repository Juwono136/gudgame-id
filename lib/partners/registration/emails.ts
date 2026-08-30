import "server-only";

import { sendTemplatedEmailInBackground } from "@/lib/email/send";
import { siteConfig } from "@/lib/config/site";
import { partnerPublicRoutes } from "@/lib/constants/routes";
import { shouldSkipPartnerRegistrationEmail } from "@/lib/partners/registration/fixture-email";

function appBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

function formatIdr(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDateRange(starts: Date | null, ends: Date | null): string {
  if (!starts) return "Date TBA";
  const fmt = new Intl.DateTimeFormat("en", { dateStyle: "medium" });
  if (!ends) return fmt.format(starts);
  return `${fmt.format(starts)} – ${fmt.format(ends)}`;
}

export function buildPartnerRegistrationStatusUrl(
  partnerSlug: string,
  tournamentSlug: string,
  accessTokenPlain: string,
): string {
  return `${appBaseUrl()}${partnerPublicRoutes.tournamentRegisterSuccess(
    partnerSlug,
    tournamentSlug,
    accessTokenPlain,
  )}`;
}

export type PartnerPaymentEmailInput = {
  captainEmail: string;
  captainName: string;
  partnerName: string;
  partnerSlug: string;
  tournamentName: string;
  tournamentSlug: string;
  teamName: string;
  amountIdr: number;
  accessTokenPlain: string;
  paymentDueAt: Date;
};

export function sendPartnerRegistrationPaymentEmail(input: PartnerPaymentEmailInput): void {
  if (shouldSkipPartnerRegistrationEmail(input.captainEmail)) return;

  const payUrl = `${appBaseUrl()}${partnerPublicRoutes.tournamentRegisterPay(
    input.partnerSlug,
    input.tournamentSlug,
    input.accessTokenPlain,
  )}`;
  const statusUrl = buildPartnerRegistrationStatusUrl(
    input.partnerSlug,
    input.tournamentSlug,
    input.accessTokenPlain,
  );

  sendTemplatedEmailInBackground(
    {
      to: input.captainEmail,
      template: "partner-registration-payment",
      data: {
        appName: siteConfig.name,
        partnerName: input.partnerName,
        captainName: input.captainName,
        tournamentName: input.tournamentName,
        teamName: input.teamName,
        amountFormatted: formatIdr(input.amountIdr),
        payUrl,
        statusUrl,
        expiresAtFormatted: new Intl.DateTimeFormat("en", {
          dateStyle: "medium",
          timeStyle: "short",
        }).format(input.paymentDueAt),
      },
    },
    { module: "partner-registration" },
  );
}

export type PartnerPendingEmailInput = {
  captainEmail: string;
  captainName: string;
  partnerName: string;
  partnerSlug: string;
  tournamentName: string;
  tournamentSlug: string;
  teamName: string;
  roster: string[];
  accessTokenPlain: string;
};

export function sendPartnerRegistrationPendingEmail(input: PartnerPendingEmailInput): void {
  if (shouldSkipPartnerRegistrationEmail(input.captainEmail)) return;

  const tournamentUrl = `${appBaseUrl()}${partnerPublicRoutes.tournament(
    input.partnerSlug,
    input.tournamentSlug,
  )}`;
  const statusUrl = buildPartnerRegistrationStatusUrl(
    input.partnerSlug,
    input.tournamentSlug,
    input.accessTokenPlain,
  );

  sendTemplatedEmailInBackground(
    {
      to: input.captainEmail,
      template: "partner-registration-pending",
      data: {
        appName: siteConfig.name,
        partnerName: input.partnerName,
        captainName: input.captainName,
        tournamentName: input.tournamentName,
        teamName: input.teamName,
        roster: input.roster,
        tournamentUrl,
        statusUrl,
      },
    },
    { module: "partner-registration" },
  );
}

export type PartnerConfirmedEmailInput = {
  captainEmail: string;
  captainName: string;
  partnerName: string;
  partnerSlug: string;
  tournamentName: string;
  tournamentSlug: string;
  teamName: string;
  venue: string | null;
  startsAt: Date | null;
  endsAt: Date | null;
  roster: string[];
  /** Only available when confirming synchronously (free flow) or right after payment redirect. */
  accessTokenPlain?: string | null;
  /** Free registrations have no payment record — skip the receipt link/button. */
  hasPaidReceipt?: boolean;
};

export function sendPartnerRegistrationConfirmedEmail(input: PartnerConfirmedEmailInput): void {
  if (shouldSkipPartnerRegistrationEmail(input.captainEmail)) return;

  const tournamentUrl = `${appBaseUrl()}${partnerPublicRoutes.tournament(
    input.partnerSlug,
    input.tournamentSlug,
  )}`;
  const receiptUrl =
    input.accessTokenPlain && input.hasPaidReceipt
      ? `${appBaseUrl()}${partnerPublicRoutes.tournamentRegisterReceipt(
          input.partnerSlug,
          input.tournamentSlug,
          input.accessTokenPlain,
        )}`
      : null;

  sendTemplatedEmailInBackground(
    {
      to: input.captainEmail,
      template: "partner-registration-confirmed",
      data: {
        appName: siteConfig.name,
        partnerName: input.partnerName,
        captainName: input.captainName,
        tournamentName: input.tournamentName,
        teamName: input.teamName,
        venue: input.venue,
        dateRange: formatDateRange(input.startsAt, input.endsAt),
        roster: input.roster,
        tournamentUrl,
        receiptUrl,
      },
    },
    { module: "partner-registration" },
  );
}
