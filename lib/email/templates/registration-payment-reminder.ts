import type { RegistrationPaymentReminderTemplateData } from "@/lib/email/types";
import { renderEmailBaseLayout } from "./base-layout";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function renderRegistrationPaymentReminderTemplate(
  data: RegistrationPaymentReminderTemplateData,
): { subject: string; html: string; text: string } {
  const subject = `Complete payment — ${data.tournamentName}`;
  const checkoutUrl = escapeHtml(data.checkoutUrl);

  const bodyHtml = `
    <h1 class="email-hero-title" style="margin:0 0 12px;font-size:26px;font-weight:700;line-height:1.3;color:#0B0E14;">Payment required</h1>
    <p style="margin:0 0 8px;font-size:16px;line-height:1.65;color:#374151;">
      Hi <strong style="color:#0047FF;">${escapeHtml(data.userName)}</strong>, you confirmed team
      <strong>${escapeHtml(data.teamName)}</strong> for
      <strong>${escapeHtml(data.tournamentName)}</strong>.
    </p>
    <p style="margin:0 0 24px;font-size:15px;line-height:1.65;color:#4B5563;">
      Complete your payment of <strong>${escapeHtml(data.amountFormatted)}</strong> within
      <strong>${data.paymentDeadlineHours} hours</strong> to secure your slot.
    </p>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 24px;background-color:#EFF6FF;border:1px solid #BFDBFE;border-radius:12px;">
      <tr>
        <td style="padding:18px 20px;text-align:center;">
          <p style="margin:0 0 4px;font-size:12px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#0047FF;">Amount due</p>
          <p style="margin:0;font-size:28px;font-weight:800;color:#0047FF;">${escapeHtml(data.amountFormatted)}</p>
        </td>
      </tr>
    </table>

    <a href="${checkoutUrl}" class="email-btn" style="display:inline-block;padding:14px 28px;background-color:#0047FF;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;border-radius:10px;">
      Pay securely on ${escapeHtml(data.appName)}
    </a>

    <p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:#6B7280;">
      You will complete payment on our secure checkout — your invoice and receipt are saved in your dashboard.
    </p>
  `;

  const html = renderEmailBaseLayout({
    previewText: `Pay ${data.amountFormatted} for ${data.tournamentName} to secure your slot.`,
    title: subject,
    bodyHtml,
    heroTag: "Official tournament · Payment reminder",
  });

  const text = `Hi ${data.userName},

You confirmed "${data.teamName}" for ${data.tournamentName}.
Amount due: ${data.amountFormatted}

Pay here: ${data.checkoutUrl}

— ${data.appName}`;

  return { subject, html, text };
}
