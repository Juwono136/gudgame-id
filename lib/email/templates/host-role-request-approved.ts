import type { HostRoleRequestApprovedTemplateData } from "@/lib/email/types";
import { renderEmailBaseLayout } from "./base-layout";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function renderHostRoleRequestApprovedTemplate(
  data: HostRoleRequestApprovedTemplateData,
): { subject: string; html: string; text: string } {
  const userName = escapeHtml(data.userName);
  const appName = escapeHtml(data.appName);
  const settingsUrl = escapeHtml(data.settingsUrl);
  const hostDashboardUrl = escapeHtml(data.hostDashboardUrl);
  const loginUrl = escapeHtml(data.loginUrl);

  const subject = `Host access approved on ${data.appName}`;

  const bodyHtml = `
    <h1 style="margin:0 0 12px;font-size:26px;font-weight:700;line-height:1.3;color:#0B0E14;">Host role approved</h1>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.65;color:#374151;">
      Hi <strong style="color:#00BF8B;">${userName}</strong>, your request for Host access on <strong>${appName}</strong> was approved.
    </p>
    <p style="margin:0 0 24px;font-size:15px;line-height:1.65;color:#4B5563;">
      Open Settings → Roles to confirm your Host access. You can then use the Host dashboard for tournaments and host tools. Refresh or sign in again if the Host workspace does not appear yet.
    </p>
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin:0 0 12px;">
      <tr>
        <td align="center">
          <a href="${settingsUrl}" class="email-btn" style="display:inline-block;padding:16px 40px;font-size:14px;font-weight:700;color:#FFFFFF;text-decoration:none;border-radius:12px;background-color:#00BF8B;">
            OPEN SETTINGS
          </a>
        </td>
      </tr>
    </table>
    <p style="margin:0 0 16px;font-size:13px;line-height:1.6;color:#6B7280;text-align:center;">
      Or go to the <a href="${hostDashboardUrl}" style="color:#00BF8B;">Host dashboard</a>
    </p>
    <p style="margin:0;font-size:13px;line-height:1.6;color:#6B7280;">
      Sign in at <a href="${loginUrl}" style="color:#00BF8B;">${loginUrl}</a>
    </p>
  `;

  const text = [
    `Host role approved on ${data.appName}`,
    `Hi ${data.userName}, your Host access is ready.`,
    `Settings: ${data.settingsUrl}`,
    `Host dashboard: ${data.hostDashboardUrl}`,
    `Login: ${data.loginUrl}`,
  ].join("\n");

  return {
    subject,
    html: renderEmailBaseLayout({
      previewText: subject,
      title: subject,
      bodyHtml,
      footerNote: `This message was sent because your Host role request on ${data.appName} was approved.`,
    }),
    text,
  };
}
