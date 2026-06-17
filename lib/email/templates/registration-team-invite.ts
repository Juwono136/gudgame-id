import type { RegistrationTeamInviteTemplateData } from "@/lib/email/types";
import { renderEmailBaseLayout } from "./base-layout";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function renderRegistrationTeamInviteTemplate(
  data: RegistrationTeamInviteTemplateData,
): { subject: string; html: string; text: string } {
  const subject = `You're on a team — ${data.tournamentName}`;
  const tournamentUrl = escapeHtml(data.tournamentUrl);

  const bodyHtml = `
    <h1 class="email-hero-title" style="margin:0 0 12px;font-size:26px;font-weight:700;line-height:1.3;color:#0B0E14;">Tournament team invitation</h1>
    <p style="margin:0 0 8px;font-size:16px;line-height:1.65;color:#374151;">
      Hi <strong style="color:#0047FF;">${escapeHtml(data.userName)}</strong>,
      <strong>${escapeHtml(data.captainName)}</strong> added you to team
      <strong>${escapeHtml(data.teamName)}</strong> for
      <strong>${escapeHtml(data.tournamentName)}</strong>.
    </p>
    <p style="margin:0 0 24px;font-size:15px;line-height:1.65;color:#4B5563;">
      No action is required from you — the team captain will confirm participation and complete payment.
      You will receive another email once the team is officially registered.
    </p>

    <a href="${tournamentUrl}" class="email-btn" style="display:inline-block;padding:14px 28px;background-color:#0047FF;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;border-radius:10px;">
      View tournament
    </a>
  `;

  const html = renderEmailBaseLayout({
    previewText: `${data.captainName} added you to ${data.teamName} for ${data.tournamentName}`,
    title: subject,
    bodyHtml,
    footerNote: `You received this because ${data.captainName} listed you on their tournament team.`,
  });

  const text = [
    `Hi ${data.userName},`,
    ``,
    `${data.captainName} added you to team "${data.teamName}" for ${data.tournamentName}.`,
    `No action is required — the captain will confirm and pay for the team.`,
    ``,
    `View tournament: ${data.tournamentUrl}`,
  ].join("\n");

  return { subject, html, text };
}
