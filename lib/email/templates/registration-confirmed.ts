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
  const receiptUrl = escapeHtml(data.receiptUrl);
  const paymentsUrl = escapeHtml(data.paymentsUrl);

  const subject = `Payment confirmed — ${data.sportName} · ${data.tournamentName}`;

  const membersHtml = data.teamMembers.length
    ? `<ul style="margin:8px 0 0;padding-left:20px;font-size:14px;line-height:1.75;color:#374151;">${data.teamMembers
        .map((m) => `<li>${escapeHtml(m)}</li>`)
        .join("")}</ul>`
    : "";

  const receiptMetaHtml = `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 20px;background-color:#ECFDF5;border:1px solid #A7F3D0;border-radius:12px;">
      <tr>
        <td style="padding:18px 20px;">
          <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#047857;">Payment receipt</p>
          ${data.invoiceNumber ? `<p style="margin:0 0 6px;font-size:13px;color:#111827;"><strong>Receipt no.</strong> <span style="font-family:ui-monospace,monospace;">${escapeHtml(data.invoiceNumber)}</span></p>` : ""}
          ${data.amountPaidFormatted ? `<p style="margin:0 0 6px;font-size:14px;color:#111827;"><strong>Amount paid:</strong> ${escapeHtml(data.amountPaidFormatted)}</p>` : ""}
          ${data.paidAtFormatted ? `<p style="margin:0;font-size:14px;color:#111827;"><strong>Paid on:</strong> ${escapeHtml(data.paidAtFormatted)}</p>` : ""}
        </td>
      </tr>
    </table>
  `;

  const bodyHtml = `
    <h1 style="margin:0 0 12px;font-size:26px;font-weight:700;line-height:1.3;color:#0B0E14;">You're officially in</h1>
    <p style="margin:0 0 8px;font-size:16px;line-height:1.65;color:#374151;">
      Hi <strong style="color:#00BF8B;">${userName}</strong>, payment received — your team is confirmed for
      <strong>${tournamentName}</strong>.
    </p>
    <p style="margin:0 0 24px;font-size:15px;line-height:1.65;color:#4B5563;">
      Your official receipt is ready. Download or view it anytime from the link below or your Payments dashboard.
    </p>

    ${receiptMetaHtml}

    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin:0 0 12px;">
      <tr>
        <td align="center">
          <a href="${receiptUrl}" class="email-btn" style="display:inline-block;padding:16px 36px;font-size:14px;font-weight:700;color:#FFFFFF;text-decoration:none;border-radius:12px;background-color:#00BF8B;box-shadow:0 4px 14px rgba(0,191,139,0.35);letter-spacing:0.04em;">
            VIEW &amp; DOWNLOAD RECEIPT
          </a>
        </td>
      </tr>
    </table>

    <p style="margin:0 0 24px;text-align:center;font-size:13px;line-height:1.6;color:#6B7280;">
      Receipt also saved in <a href="${paymentsUrl}" style="color:#00BF8B;text-decoration:none;font-weight:600;">Payments</a> on your dashboard.
    </p>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 24px;background-color:#F8FAFC;border:1px solid #E5E7EB;border-radius:12px;">
      <tr>
        <td style="padding:18px 20px;">
          <p style="margin:0 0 10px;font-size:12px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#00BF8B;">Event details</p>
          <p style="margin:0 0 6px;font-size:14px;color:#111827;"><strong>Sport:</strong> ${sportName}</p>
          <p style="margin:0 0 6px;font-size:14px;color:#111827;"><strong>Team:</strong> ${teamName}</p>
          <p style="margin:0 0 6px;font-size:14px;color:#111827;"><strong>Dates:</strong> ${escapeHtml(data.dateRange)}</p>
          ${venue ? `<p style="margin:0 0 6px;font-size:14px;color:#111827;"><strong>Venue:</strong> ${venue}</p>` : ""}
          ${data.feePaid ? `<p style="margin:0;font-size:14px;color:#111827;"><strong>Registration fee:</strong> ${escapeHtml(data.feePaid)}</p>` : ""}
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
          <a href="${tournamentUrl}" style="display:inline-block;padding:12px 28px;font-size:14px;font-weight:600;color:#00BF8B;text-decoration:none;border-radius:10px;border:2px solid #00BF8B;">
            View tournament page
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
    previewText: `Payment confirmed for ${data.tournamentName}. View your official receipt.`,
    title: subject,
    bodyHtml,
    heroTag: "Official tournament · Payment confirmed",
  });

  const text = [
    `Payment confirmed — ${data.tournamentName}`,
    ``,
    `Hi ${data.userName},`,
    `Your team "${data.teamName}" is registered for ${data.tournamentName} (${data.sportName}).`,
    data.invoiceNumber ? `Receipt: ${data.invoiceNumber}` : "",
    data.amountPaidFormatted ? `Amount paid: ${data.amountPaidFormatted}` : "",
    data.paidAtFormatted ? `Paid on: ${data.paidAtFormatted}` : "",
    `View & download receipt: ${data.receiptUrl}`,
    `Payments dashboard: ${data.paymentsUrl}`,
    `Dates: ${data.dateRange}`,
    venue ? `Venue: ${data.venue}` : "",
    data.feePaid ? `Registration fee: ${data.feePaid}` : "",
    data.teamMembers.length ? `Squad: ${data.teamMembers.join(", ")}` : "",
    `Tournament: ${data.tournamentUrl}`,
  ]
    .filter(Boolean)
    .join("\n");

  return { subject, html, text };
}
