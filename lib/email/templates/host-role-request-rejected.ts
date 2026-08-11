import type { HostRoleRequestRejectedTemplateData } from "@/lib/email/types";
import { renderEmailBaseLayout } from "./base-layout";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function renderHostRoleRequestRejectedTemplate(
  data: HostRoleRequestRejectedTemplateData,
): { subject: string; html: string; text: string } {
  const userName = escapeHtml(data.userName);
  const appName = escapeHtml(data.appName);
  const reason = escapeHtml(data.rejectionReason);
  const settingsUrl = escapeHtml(data.settingsUrl);
  const loginUrl = escapeHtml(data.loginUrl);

  const subject = `Host role request update on ${data.appName}`;

  const bodyHtml = `
    <h1 style="margin:0 0 12px;font-size:26px;font-weight:700;line-height:1.3;color:#0B0E14;">Host role request declined</h1>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.65;color:#374151;">
      Hi <strong style="color:#00BF8B;">${userName}</strong>, your request for Host access on <strong>${appName}</strong> was not approved at this time.
    </p>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 20px;background-color:#FEF2F2;border:1px solid #FECACA;border-radius:12px;">
      <tr>
        <td style="padding:18px 20px;">
          <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#B91C1C;">Reason from admin</p>
          <p style="margin:0;font-size:14px;line-height:1.65;color:#374151;white-space:pre-wrap;">${reason}</p>
        </td>
      </tr>
    </table>
    <p style="margin:0 0 20px;font-size:15px;line-height:1.65;color:#4B5563;">
      You can review this note in Settings and submit a new request later if your situation changes.
    </p>
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin:0 0 16px;">
      <tr>
        <td align="center">
          <a href="${settingsUrl}" class="email-btn" style="display:inline-block;padding:16px 40px;font-size:14px;font-weight:700;color:#FFFFFF;text-decoration:none;border-radius:12px;background-color:#00BF8B;">
            OPEN SETTINGS
          </a>
        </td>
      </tr>
    </table>
    <p style="margin:0;font-size:13px;line-height:1.6;color:#6B7280;">
      Sign in: <a href="${loginUrl}" style="color:#00BF8B;">${loginUrl}</a>
    </p>
  `;

  const text = [
    `Host role request declined on ${data.appName}`,
    `Hi ${data.userName},`,
    `Reason: ${data.rejectionReason}`,
    `Settings: ${data.settingsUrl}`,
  ].join("\n");

  return {
    subject,
    html: renderEmailBaseLayout({
      previewText: subject,
      title: subject,
      bodyHtml,
      footerNote: `This message was sent because your Host role request on ${data.appName} was reviewed.`,
    }),
    text,
  };
}
