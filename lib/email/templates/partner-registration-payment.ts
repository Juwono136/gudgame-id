import type { PartnerRegistrationPaymentTemplateData } from "@/lib/email/types";
import { renderEmailBaseLayout } from "./base-layout";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function renderPartnerRegistrationPaymentTemplate(
  data: PartnerRegistrationPaymentTemplateData,
): { subject: string; html: string; text: string } {
  const subject = `Registration received — complete payment for ${data.tournamentName}`;
  const payUrl = escapeHtml(data.payUrl);
  const statusUrl = escapeHtml(data.statusUrl);
  const partnerName = escapeHtml(data.partnerName);
  const tournamentName = escapeHtml(data.tournamentName);
  const teamName = escapeHtml(data.teamName);
  const expiresAtFormatted = escapeHtml(data.expiresAtFormatted);

  const bodyHtml = `
    <h1 class="email-hero-title" style="margin:0 0 12px;font-size:26px;font-weight:700;line-height:1.3;color:#0B0E14;">Registration received</h1>
    <p style="margin:0 0 8px;font-size:16px;line-height:1.65;color:#374151;">
      Hi <strong style="color:#00BF8B;">${escapeHtml(data.captainName)}</strong>, your team
      <strong>${teamName}</strong> is reserved for
      <strong>${tournamentName}</strong> hosted by ${partnerName}.
    </p>
    <p style="margin:0 0 24px;font-size:15px;line-height:1.65;color:#4B5563;">
      Complete payment before <strong>${expiresAtFormatted}</strong> to keep your slot.
      You can also use your registration status link below to track progress after paying.
    </p>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 24px;background-color:#EFF6FF;border:1px solid #BFDBFE;border-radius:12px;">
      <tr>
        <td style="padding:18px 20px;text-align:center;">
          <p style="margin:0 0 4px;font-size:12px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#00BF8B;">Amount due</p>
          <p style="margin:0;font-size:28px;font-weight:800;color:#00BF8B;">${escapeHtml(data.amountFormatted)}</p>
        </td>
      </tr>
    </table>

    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin:0 0 12px;">
      <tr>
        <td align="center">
          <a href="${payUrl}" class="email-btn" style="display:inline-block;padding:16px 36px;font-size:14px;font-weight:700;color:#FFFFFF;text-decoration:none;border-radius:12px;background-color:#00BF8B;box-shadow:0 4px 14px rgba(0,191,139,0.35);letter-spacing:0.04em;">
            PAY NOW
          </a>
        </td>
      </tr>
    </table>

    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin:0 0 12px;">
      <tr>
        <td align="center">
          <a href="${statusUrl}" style="display:inline-block;padding:12px 24px;font-size:14px;font-weight:600;color:#00BF8B;text-decoration:none;border-radius:10px;border:1px solid rgba(0,191,139,0.35);">
            View registration status
          </a>
        </td>
      </tr>
    </table>

    <p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:#6B7280;">
      These links are unique to your registration — keep them private. No account or login is required.
    </p>
  `;

  const html = renderEmailBaseLayout({
    previewText: `Registration received for ${data.tournamentName}. Pay ${data.amountFormatted} to secure your slot.`,
    title: subject,
    bodyHtml,
    heroTag: "Guest registration · Payment required",
  });

  const text = `Hi ${data.captainName},

Your registration for "${data.teamName}" in ${data.tournamentName} (${data.partnerName}) was received.
Amount due: ${data.amountFormatted}
Pay before: ${data.expiresAtFormatted}

Pay here: ${data.payUrl}
View registration status: ${data.statusUrl}

— ${data.appName}`;

  return { subject, html, text };
}
