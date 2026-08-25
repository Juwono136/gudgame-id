import type { RegistrationRosterClaimTemplateData } from "@/lib/email/types";
import { renderEmailBaseLayout } from "./base-layout";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function renderRegistrationRosterClaimTemplate(
  data: RegistrationRosterClaimTemplateData,
): { subject: string; html: string; text: string } {
  const subject = `Claim your spot — ${data.sportName} · ${data.tournamentName}`;
  const claimUrl = escapeHtml(data.claimUrl);

  const bodyHtml = `
    <h1 class="email-hero-title" style="margin:0 0 12px;font-size:26px;font-weight:700;line-height:1.3;color:#0B0E14;">You're on the roster</h1>
    <p style="margin:0 0 8px;font-size:16px;line-height:1.65;color:#374151;">
      Hi <strong style="color:#00BF8B;">${escapeHtml(data.userName)}</strong>,
      <strong>${escapeHtml(data.captainName)}</strong> registered you on team
      <strong>${escapeHtml(data.teamName)}</strong> for
      <strong>${escapeHtml(data.tournamentName)}</strong>.
    </p>
    <p style="margin:0 0 24px;font-size:15px;line-height:1.65;color:#4B5563;">
      Create a Gud Game account (or sign in) with <strong>${escapeHtml(data.inviteEmail)}</strong>,
      then claim your slot so match results can count toward your career stats.
    </p>

    <a href="${claimUrl}" class="email-btn" style="display:inline-block;padding:14px 28px;background-color:#00BF8B;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;border-radius:10px;">
      Claim my spot
    </a>

    <p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:#6B7280;">
      This link works until ${escapeHtml(data.expiresAtFormatted)}. You must use the email above when signing in.
    </p>
  `;

  const html = renderEmailBaseLayout({
    previewText: `${data.captainName} added you to ${data.teamName} — claim your Gud Game spot`,
    title: subject,
    bodyHtml,
    footerNote: `You received this because ${data.captainName} listed you on an Official tournament team.`,
  });

  const text = [
    `Hi ${data.userName},`,
    ``,
    `${data.captainName} registered you on team "${data.teamName}" for ${data.tournamentName}.`,
    `Sign in or create an account with ${data.inviteEmail}, then claim your spot:`,
    data.claimUrl,
    ``,
    `Link expires: ${data.expiresAtFormatted}`,
    `Career ranking points only apply after you claim.`,
  ].join("\n");

  return { subject, html, text };
}
