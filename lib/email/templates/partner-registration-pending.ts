import type { PartnerRegistrationPendingTemplateData } from "@/lib/email/types";
import { renderEmailBaseLayout } from "./base-layout";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function renderPartnerRegistrationPendingTemplate(
  data: PartnerRegistrationPendingTemplateData,
): { subject: string; html: string; text: string } {
  const subject = `Registration received — ${data.tournamentName}`;
  const tournamentUrl = escapeHtml(data.tournamentUrl);
  const partnerName = escapeHtml(data.partnerName);
  const tournamentName = escapeHtml(data.tournamentName);
  const teamName = escapeHtml(data.teamName);

  const membersHtml = data.roster.length
    ? `<ul style="margin:8px 0 0;padding-left:20px;font-size:14px;line-height:1.75;color:#374151;">${data.roster
        .map((m) => `<li>${escapeHtml(m)}</li>`)
        .join("")}</ul>`
    : "";

  const bodyHtml = `
    <h1 style="margin:0 0 12px;font-size:26px;font-weight:700;line-height:1.3;color:#0B0E14;">Awaiting confirmation</h1>
    <p style="margin:0 0 8px;font-size:16px;line-height:1.65;color:#374151;">
      Hi <strong style="color:#00BF8B;">${escapeHtml(data.captainName)}</strong>, we received registration for
      team <strong>${teamName}</strong> in
      <strong>${tournamentName}</strong> (${partnerName}).
    </p>
    <p style="margin:0 0 24px;font-size:15px;line-height:1.65;color:#374151;">
      Your status is <strong>Registered</strong>. The organizer will review and confirm your spot before you appear on the public player list.
    </p>

    ${
      data.roster.length
        ? `<div style="margin:0 0 24px;">
            <p style="margin:0 0 4px;font-size:12px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#6B7280;">Your squad</p>
            ${membersHtml}
          </div>`
        : ""
    }

    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin:0 0 28px;">
      <tr>
        <td align="center">
          <a href="${tournamentUrl}" class="email-btn" style="display:inline-block;padding:14px 28px;background-color:#00BF8B;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;border-radius:10px;">
            View tournament page
          </a>
        </td>
      </tr>
    </table>
  `;

  const html = renderEmailBaseLayout({
    previewText: `Team ${data.teamName} is registered and awaiting organizer confirmation.`,
    title: subject,
    bodyHtml,
    heroTag: "Guest registration · Pending review",
  });

  const text = [
    `Registration received — ${data.tournamentName}`,
    ``,
    `Hi ${data.captainName},`,
    `Team "${data.teamName}" is registered for ${data.tournamentName} (${data.partnerName}).`,
    `Status: Registered — awaiting organizer confirmation.`,
    data.roster.length ? `Squad: ${data.roster.join(", ")}` : "",
    `Tournament: ${data.tournamentUrl}`,
  ]
    .filter(Boolean)
    .join("\n");

  return { subject, html, text };
}
