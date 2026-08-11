import type { HostRoleRequestAdminTemplateData } from "@/lib/email/types";
import { renderEmailBaseLayout } from "./base-layout";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function renderHostRoleRequestAdminTemplate(
  data: HostRoleRequestAdminTemplateData,
): { subject: string; html: string; text: string } {
  const adminName = escapeHtml(data.adminName);
  const appName = escapeHtml(data.appName);
  const requesterName = escapeHtml(data.requesterName);
  const requesterEmail = escapeHtml(data.requesterEmail);
  const message = escapeHtml(data.message);
  const reviewUrl = escapeHtml(data.reviewUrl);

  const subject = `Host role request — ${data.requesterName} on ${data.appName}`;

  const bodyHtml = `
    <h1 style="margin:0 0 12px;font-size:26px;font-weight:700;line-height:1.3;color:#0B0E14;">New Host role request</h1>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.65;color:#374151;">
      Hi <strong style="color:#00BF8B;">${adminName}</strong>, a user requested Host access on <strong>${appName}</strong>.
    </p>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 20px;background-color:#F0F4FF;border:1px solid #C7D7FF;border-radius:12px;">
      <tr>
        <td style="padding:18px 20px;">
          <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#00BF8B;">Requester</p>
          <p style="margin:0 0 4px;font-size:18px;font-weight:700;color:#0B0E14;">${requesterName}</p>
          <p style="margin:0 0 12px;font-size:13px;line-height:1.6;color:#4B5563;">${requesterEmail}</p>
          <p style="margin:0 0 6px;font-size:12px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#374151;">Message</p>
          <p style="margin:0;font-size:14px;line-height:1.65;color:#374151;white-space:pre-wrap;">${message}</p>
        </td>
      </tr>
    </table>
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin:0 0 16px;">
      <tr>
        <td align="center">
          <a href="${reviewUrl}" class="email-btn" style="display:inline-block;padding:16px 40px;font-size:14px;font-weight:700;color:#FFFFFF;text-decoration:none;border-radius:12px;background-color:#00BF8B;">
            REVIEW REQUEST
          </a>
        </td>
      </tr>
    </table>
  `;

  const text = [
    `New Host role request on ${data.appName}`,
    `Requester: ${data.requesterName} <${data.requesterEmail}>`,
    `Message: ${data.message}`,
    `Review: ${data.reviewUrl}`,
  ].join("\n");

  return {
    subject,
    html: renderEmailBaseLayout({
      previewText: subject,
      title: subject,
      bodyHtml,
      footerNote: `This message was sent because a user requested Host access on ${data.appName}.`,
    }),
    text,
  };
}
