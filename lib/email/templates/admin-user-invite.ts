import type { AdminUserInviteTemplateData } from "@/lib/email/types";
import { EMAIL_VERIFICATION_EXPIRES_IN_SECONDS } from "@/lib/auth/constants";
import { renderEmailBaseLayout } from "./base-layout";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const EXPIRY_HOURS = Math.round(EMAIL_VERIFICATION_EXPIRES_IN_SECONDS / 3600);

export function renderAdminUserInviteTemplate(data: AdminUserInviteTemplateData): {
  subject: string;
  html: string;
  text: string;
} {
  const userName = escapeHtml(data.userName);
  const appName = escapeHtml(data.appName);
  const verifyUrl = escapeHtml(data.verifyUrl);
  const temporaryPassword = escapeHtml(data.temporaryPassword);
  const loginUrl = escapeHtml(data.loginUrl);

  const subject = `Your ${data.appName} account is ready`;

  const bodyHtml = `
    <h1 style="margin:0 0 12px;font-size:26px;font-weight:700;line-height:1.3;color:#0B0E14;">Welcome to the team</h1>
    <p style="margin:0 0 8px;font-size:16px;line-height:1.65;color:#374151;">
      Hi <strong style="color:#00BF8B;">${userName}</strong>, an administrator created your <strong>${appName}</strong> account.
    </p>
    <p style="margin:0 0 24px;font-size:15px;line-height:1.65;color:#4B5563;">
      Follow the steps below to confirm your email, sign in with your temporary password, and set a new password before accessing your dashboard.
    </p>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 20px;background-color:#F0F4FF;border:1px solid #C7D7FF;border-radius:12px;">
      <tr>
        <td style="padding:18px 20px;">
          <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#00BF8B;">Temporary password</p>
          <p style="margin:0 0 10px;font-size:22px;font-weight:700;letter-spacing:0.08em;font-family:ui-monospace,Menlo,Consolas,monospace;color:#0B0E14;">${temporaryPassword}</p>
          <p style="margin:0;font-size:13px;line-height:1.6;color:#4B5563;">
            You will be required to choose a new password immediately after your first sign-in. Do not share this password.
          </p>
        </td>
      </tr>
    </table>

    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin:0 0 28px;">
      <tr>
        <td align="center">
          <a href="${verifyUrl}" class="email-btn" style="display:inline-block;padding:16px 40px;font-size:14px;font-weight:700;color:#FFFFFF;text-decoration:none;border-radius:12px;background-color:#00BF8B;box-shadow:0 4px 14px rgba(0,191,139,0.4);letter-spacing:0.05em;">
            CONFIRM EMAIL &amp; ACTIVATE
          </a>
        </td>
      </tr>
    </table>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 20px;background-color:#F9FAFB;border:1px solid #E5E7EB;border-radius:12px;">
      <tr>
        <td style="padding:16px 18px;">
          <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#374151;">Getting started</p>
          <ol style="margin:0;padding-left:20px;font-size:14px;line-height:1.75;color:#374151;">
            <li style="margin-bottom:6px;">Confirm your email using the button above</li>
            <li style="margin-bottom:6px;">Sign in at <a href="${loginUrl}" style="color:#00BF8B;">${loginUrl}</a> with your email and temporary password</li>
            <li style="margin-bottom:6px;">Set a new personal password when prompted</li>
            <li>Open your role-based dashboard</li>
          </ol>
        </td>
      </tr>
    </table>

    <p style="margin:0 0 8px;font-size:13px;line-height:1.6;color:#4B5563;">
      Confirmation link (expires in ${EXPIRY_HOURS} hours):
    </p>
    <p style="margin:0 0 20px;font-size:12px;line-height:1.5;word-break:break-all;">
      <a href="${verifyUrl}" style="color:#00BF8B;text-decoration:underline;">${verifyUrl}</a>
    </p>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#FFF8E6;border:1px solid #F5D76E;border-radius:12px;">
      <tr>
        <td style="padding:14px 16px;">
          <p style="margin:0 0 6px;font-size:12px;font-weight:700;color:#92400E;">Security notice</p>
          <p style="margin:0;font-size:13px;line-height:1.6;color:#78350F;">
            If you did not expect this invitation, contact your Gud Game administrator. Never forward this email — it contains credentials for your account.
          </p>
        </td>
      </tr>
    </table>
  `;

  const html = renderEmailBaseLayout({
    previewText: `Activate your ${data.appName} account and sign in with your temporary password.`,
    title: subject,
    bodyHtml,
    heroTag: "Admin invitation",
    footerNote:
      "This message was sent because an administrator added you to Gud Game. Links expire automatically for your protection.",
  });

  const text = [
    `Hi ${data.userName},`,
    "",
    `An administrator created your ${data.appName} account.`,
    "",
    `Temporary password (change on first sign-in): ${data.temporaryPassword}`,
    "",
    `1. Confirm your email (expires in ${EXPIRY_HOURS} hours):`,
    data.verifyUrl,
    "",
    `2. Sign in: ${data.loginUrl}`,
    "",
    "3. Set a new password when prompted, then access your dashboard.",
    "",
    "If you did not expect this email, contact your administrator.",
  ].join("\n");

  return { subject, html, text };
}
