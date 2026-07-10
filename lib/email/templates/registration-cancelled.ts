import type { RegistrationCancelledTemplateData } from "@/lib/email/types";
import { renderEmailBaseLayout } from "./base-layout";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function renderRegistrationCancelledTemplate(
  data: RegistrationCancelledTemplateData,
): { subject: string; html: string; text: string } {
  const subject = `Registration cancelled — ${data.sportName} · ${data.tournamentName}`;
  const tournamentUrl = escapeHtml(data.tournamentUrl);

  const bodyHtml = `
    <h1 class="email-hero-title" style="margin:0 0 12px;font-size:26px;font-weight:700;line-height:1.3;color:#0B0E14;">Registration cancelled</h1>
    <p style="margin:0 0 8px;font-size:16px;line-height:1.65;color:#374151;">
      Hi <strong style="color:#00BF8B;">${escapeHtml(data.userName)}</strong>, your registration for
      team <strong>${escapeHtml(data.teamName)}</strong> at
      <strong>${escapeHtml(data.tournamentName)}</strong> has been cancelled.
    </p>
    <p style="margin:0 0 24px;font-size:15px;line-height:1.65;color:#4B5563;">
      ${escapeHtml(data.reason)}
      ${data.canReRegister ? " You may register again if spots are still available." : ""}
    </p>

    <a href="${tournamentUrl}" class="email-btn" style="display:inline-block;padding:14px 28px;background-color:#00BF8B;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;border-radius:10px;">
      View tournament
    </a>
  `;

  const html = renderEmailBaseLayout({
    previewText: `Your registration for ${data.tournamentName} was cancelled`,
    title: subject,
    bodyHtml,
  });

  const text = [
    `Hi ${data.userName},`,
    ``,
    `Your registration for team "${data.teamName}" at ${data.tournamentName} has been cancelled.`,
    data.reason,
    data.canReRegister ? "You may register again if spots are still available." : "",
    ``,
    `View tournament: ${data.tournamentUrl}`,
  ]
    .filter(Boolean)
    .join("\n");

  return { subject, html, text };
}
