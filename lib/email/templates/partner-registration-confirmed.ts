import type { PartnerRegistrationConfirmedTemplateData } from "@/lib/email/types";
import { renderEmailBaseLayout } from "./base-layout";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function renderPartnerRegistrationConfirmedTemplate(
  data: PartnerRegistrationConfirmedTemplateData,
): { subject: string; html: string; text: string } {
  const subject = `You're in — ${data.tournamentName}`;
  const tournamentUrl = escapeHtml(data.tournamentUrl);
  const partnerName = escapeHtml(data.partnerName);
  const tournamentName = escapeHtml(data.tournamentName);
  const teamName = escapeHtml(data.teamName);

  const membersHtml = data.roster.length
    ? `<ul style="margin:8px 0 0;padding-left:20px;font-size:14px;line-height:1.75;color:#374151;">${data.roster
        .map((m) => `<li>${escapeHtml(m)}</li>`)
        .join("")}</ul>`
    : "";

  const receiptHtml = data.receiptUrl
    ? `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin:0 0 20px;">
      <tr>
        <td align="center">
          <a href="${escapeHtml(data.receiptUrl)}" style="display:inline-block;padding:12px 28px;font-size:14px;font-weight:600;color:#00BF8B;text-decoration:none;border-radius:10px;border:2px solid #00BF8B;">
            View receipt
          </a>
        </td>
      </tr>
    </table>`
    : "";

  const bodyHtml = `
    <h1 style="margin:0 0 12px;font-size:26px;font-weight:700;line-height:1.3;color:#0B0E14;">You're confirmed</h1>
    <p style="margin:0 0 8px;font-size:16px;line-height:1.65;color:#374151;">
      Hi <strong style="color:#00BF8B;">${escapeHtml(data.captainName)}</strong>, team
      <strong>${teamName}</strong> is confirmed for
      <strong>${tournamentName}</strong> hosted by ${partnerName}.
    </p>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 24px;background-color:#F8FAFC;border:1px solid #E5E7EB;border-radius:12px;">
      <tr>
        <td style="padding:18px 20px;">
          <p style="margin:0 0 10px;font-size:12px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#00BF8B;">Event details</p>
          <p style="margin:0 0 6px;font-size:14px;color:#111827;"><strong>Dates:</strong> ${escapeHtml(data.dateRange)}</p>
          ${data.venue ? `<p style="margin:0;font-size:14px;color:#111827;"><strong>Venue:</strong> ${escapeHtml(data.venue)}</p>` : ""}
        </td>
      </tr>
    </table>

    ${
      data.roster.length
        ? `<div style="margin:0 0 24px;">
            <p style="margin:0 0 4px;font-size:12px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#6B7280;">Your squad</p>
            ${membersHtml}
          </div>`
        : ""
    }

    ${receiptHtml}

    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin:0 0 28px;">
      <tr>
        <td align="center">
          <a href="${tournamentUrl}" class="email-btn" style="display:inline-block;padding:14px 28px;background-color:#00BF8B;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;border-radius:10px;">
            View tournament page
          </a>
        </td>
      </tr>
    </table>

    <p style="margin:0;font-size:13px;line-height:1.6;color:#6B7280;">
      Arrive early on match day and bring valid ID if required by the organizer.
    </p>
  `;

  const html = renderEmailBaseLayout({
    previewText: `Team ${data.teamName} is confirmed for ${data.tournamentName}.`,
    title: subject,
    bodyHtml,
    heroTag: "Guest registration · Confirmed",
  });

  const text = [
    `You're confirmed — ${data.tournamentName}`,
    ``,
    `Hi ${data.captainName},`,
    `Team "${data.teamName}" is confirmed for ${data.tournamentName} hosted by ${data.partnerName}.`,
    `Dates: ${data.dateRange}`,
    data.venue ? `Venue: ${data.venue}` : "",
    data.roster.length ? `Squad: ${data.roster.join(", ")}` : "",
    data.receiptUrl ? `Receipt: ${data.receiptUrl}` : "",
    `Tournament: ${data.tournamentUrl}`,
  ]
    .filter(Boolean)
    .join("\n");

  return { subject, html, text };
}
