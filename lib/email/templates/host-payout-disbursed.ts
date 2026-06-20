import type { HostPayoutDisbursedTemplateData } from "@/lib/email/types";
import { renderEmailBaseLayout } from "./base-layout";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function renderHostPayoutDisbursedTemplate(
  data: HostPayoutDisbursedTemplateData,
): { subject: string; html: string; text: string } {
  const subject = `Bank payout sent — ${data.amountFormatted}`;
  const paymentsUrl = escapeHtml(data.paymentsUrl);

  const bodyHtml = `
    <h1 style="margin:0 0 12px;font-size:26px;font-weight:700;line-height:1.3;color:#0B0E14;">Payout sent to your bank</h1>
    <p style="margin:0 0 20px;font-size:16px;line-height:1.65;color:#374151;">
      Hi <strong style="color:#0047FF;">${escapeHtml(data.hostName)}</strong>,
      your scheduled tournament earnings have been transferred to your primary bank account.
    </p>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 24px;border:1px solid #E5E7EB;border-radius:12px;overflow:hidden;">
      <tr>
        <td style="padding:16px 18px;">
          <p style="margin:0 0 8px;font-size:14px;color:#4B5563;">Amount</p>
          <p style="margin:0 0 16px;font-size:24px;font-weight:800;color:#047857;">${escapeHtml(data.amountFormatted)}</p>
          <p style="margin:0 0 6px;font-size:14px;color:#111827;"><strong>Registrations:</strong> ${data.paymentCount}</p>
          <p style="margin:0 0 6px;font-size:14px;color:#111827;"><strong>Schedule:</strong> ${escapeHtml(data.scheduleLabel)}</p>
          <p style="margin:0 0 6px;font-size:14px;color:#111827;"><strong>Account:</strong> ${escapeHtml(data.maskedAccount)} · ${escapeHtml(data.bankAccountHolder)}</p>
          ${data.completedAtFormatted ? `<p style="margin:0;font-size:14px;color:#6B7280;">Completed ${escapeHtml(data.completedAtFormatted)}</p>` : ""}
        </td>
      </tr>
    </table>
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin:0;">
      <tr>
        <td align="center">
          <a href="${paymentsUrl}" class="email-btn" style="display:inline-block;padding:16px 36px;font-size:14px;font-weight:700;color:#FFFFFF;text-decoration:none;border-radius:12px;background-color:#0047FF;">
            VIEW PAYOUT HISTORY
          </a>
        </td>
      </tr>
    </table>
  `;

  const html = renderEmailBaseLayout({
    previewText: `Your ${data.amountFormatted} payout was sent to ${data.maskedAccount}.`,
    title: subject,
    bodyHtml,
    heroTag: "Host workspace · Bank payout",
    footerNote: `You received this email because a scheduled payout completed on ${data.appName}.`,
  });

  const text = [
    subject,
    "",
    `Hi ${data.hostName},`,
    "",
    `Amount: ${data.amountFormatted}`,
    `Registrations: ${data.paymentCount}`,
    `Schedule: ${data.scheduleLabel}`,
    `Account: ${data.maskedAccount}`,
    "",
    `View history: ${data.paymentsUrl}`,
  ].join("\n");

  return { subject, html, text };
}
