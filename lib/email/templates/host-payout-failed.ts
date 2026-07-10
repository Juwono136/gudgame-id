import type { HostPayoutFailedTemplateData } from "@/lib/email/types";
import { renderEmailBaseLayout } from "./base-layout";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function renderHostPayoutFailedTemplate(
  data: HostPayoutFailedTemplateData,
): { subject: string; html: string; text: string } {
  const subject = "Bank payout could not be completed";
  const paymentsUrl = escapeHtml(data.paymentsUrl);

  const bodyHtml = `
    <h1 style="margin:0 0 12px;font-size:26px;font-weight:700;line-height:1.3;color:#0B0E14;">Payout needs attention</h1>
    <p style="margin:0 0 20px;font-size:16px;line-height:1.65;color:#374151;">
      Hi <strong style="color:#00BF8B;">${escapeHtml(data.hostName)}</strong>,
      we could not complete a scheduled transfer of <strong>${escapeHtml(data.amountFormatted)}</strong>
      to <strong>${escapeHtml(data.maskedAccount)}</strong>.
    </p>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 24px;background-color:#FEF2F2;border:1px solid #FECACA;border-radius:12px;">
      <tr>
        <td style="padding:16px 18px;">
          <p style="margin:0;font-size:14px;line-height:1.6;color:#991B1B;">${escapeHtml(data.failureReason)}</p>
        </td>
      </tr>
    </table>
    <p style="margin:0 0 24px;font-size:15px;line-height:1.65;color:#4B5563;">
      Your earnings remain in your balance and will be included in the next payout cycle once the issue is resolved.
      Please verify your primary bank account details in the Host dashboard.
    </p>
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
      <tr>
        <td align="center">
          <a href="${paymentsUrl}" style="display:inline-block;padding:12px 28px;font-size:14px;font-weight:600;color:#00BF8B;text-decoration:none;border-radius:10px;border:2px solid #00BF8B;">
            Review payout settings
          </a>
        </td>
      </tr>
    </table>
  `;

  const html = renderEmailBaseLayout({
    previewText: `We could not transfer ${data.amountFormatted} to your bank account.`,
    title: subject,
    bodyHtml,
    heroTag: "Host workspace · Payout alert",
    footerNote: `You received this email because a scheduled payout failed on ${data.appName}.`,
  });

  const text = [
    subject,
    "",
    `Hi ${data.hostName},`,
    "",
    `Amount: ${data.amountFormatted}`,
    `Account: ${data.maskedAccount}`,
    `Reason: ${data.failureReason}`,
    "",
    `Review settings: ${data.paymentsUrl}`,
  ].join("\n");

  return { subject, html, text };
}
