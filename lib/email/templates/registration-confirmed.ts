import type { RegistrationConfirmedTemplateData } from "@/lib/email/types";
import { renderEmailBaseLayout } from "./base-layout";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function renderRegistrationConfirmedTemplate(
  data: RegistrationConfirmedTemplateData,
): { subject: string; html: string; text: string } {
  const appName = escapeHtml(data.appName);
  const userName = escapeHtml(data.userName);
  const tournamentName = escapeHtml(data.tournamentName);
  const teamName = escapeHtml(data.teamName);
  const sportName = escapeHtml(data.sportName);
  const venue = data.venue ? escapeHtml(data.venue) : null;
  const tournamentUrl = escapeHtml(data.tournamentUrl);

  const subject = `You're registered — ${data.tournamentName}`;

  const membersHtml = data.teamMembers.length
    ? `<ul style="margin:8px 0 0;padding-left:20px;font-size:14px;line-height:1.75;color:#374151;">${data.teamMembers
        .map((m) => `<li>${escapeHtml(m)}</li>`)
        .join("")}</ul>`
    : "";

  const bodyHtml = `
    <h1 style="margin:0 0 12px;font-size:26px;font-weight:700;line-height:1.3;color:#0B0E14;">Registration confirmed</h1>
    <p style="margin:0 0 8px;font-size:16px;line-height:1.65;color:#374151;">
      Hi <strong style="color:#0047FF;">${userName}</strong>, your team is officially in for
      <strong>${tournamentName}</strong>.
    </p>
    <p style="margin:0 0 24px;font-size:15px;line-height:1.65;color:#4B5563;">
      Payment received. Save this email — it contains your event details and team roster.
    </p>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 24px;background-color:#F8FAFC;border:1px solid #E5E7EB;border-radius:12px;">
      <tr>
        <td style="padding:18px 20px;">
          <p style="margin:0 0 10px;font-size:12px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#0047FF;">Event details</p>
          <p style="margin:0 0 6px;font-size:14px;color:#111827;"><strong>Sport:</strong> ${sportName}</p>
          <p style="margin:0 0 6px;font-size:14px;color:#111827;"><strong>Team:</strong> ${teamName}</p>
          <p style="margin:0 0 6px;font-size:14px;color:#111827;"><strong>Dates:</strong> ${escapeHtml(data.dateRange)}</p>
          ${venue ? `<p style="margin:0 0 6px;font-size:14px;color:#111827;"><strong>Venue:</strong> ${venue}</p>` : ""}
          ${data.feePaid ? `<p style="margin:0;font-size:14px;color:#111827;"><strong>Fee paid:</strong> ${escapeHtml(data.feePaid)}</p>` : ""}
        </td>
      </tr>
    </table>

    ${
      data.teamMembers.length
        ? `<div style="margin:0 0 24px;">
            <p style="margin:0 0 4px;font-size:12px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#6B7280;">Your squad</p>
            ${membersHtml}
          </div>`
        : ""
    }

    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin:0 0 28px;">
      <tr>
        <td align="center">
          <a href="${tournamentUrl}" class="email-btn" style="display:inline-block;padding:16px 40px;font-size:14px;font-weight:700;color:#FFFFFF;text-decoration:none;border-radius:12px;background-color:#0047FF;box-shadow:0 4px 14px rgba(0,71,255,0.4);letter-spacing:0.05em;">
            VIEW TOURNAMENT
          </a>
        </td>
      </tr>
    </table>

    <p style="margin:0;font-size:13px;line-height:1.6;color:#6B7280;">
      Arrive early on match day and bring valid ID if required by the organizer.
      Questions? Reply to this email or contact the host through ${appName}.
    </p>
  `;

  const html = renderEmailBaseLayout({
    previewText: `You're registered for ${data.tournamentName}.`,
    title: subject,
    bodyHtml,
  });

  const text = [
    `Registration confirmed — ${data.tournamentName}`,
    ``,
    `Hi ${data.userName},`,
    `Your team "${data.teamName}" is registered for ${data.tournamentName} (${data.sportName}).`,
    `Dates: ${data.dateRange}`,
    venue ? `Venue: ${data.venue}` : "",
    data.feePaid ? `Fee paid: ${data.feePaid}` : "",
    data.teamMembers.length ? `Squad: ${data.teamMembers.join(", ")}` : "",
    `View: ${data.tournamentUrl}`,
  ]
    .filter(Boolean)
    .join("\n");

  return { subject, html, text };
}
