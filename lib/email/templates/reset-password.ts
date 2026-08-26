import type { ResetPasswordTemplateData } from "@/lib/email/types";
import { PASSWORD_RESET_TOKEN_EXPIRES_IN_SECONDS } from "@/lib/auth/constants";
import { renderEmailBaseLayout } from "./base-layout";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const EXPIRY_HOURS = Math.max(
  1,
  Math.round(PASSWORD_RESET_TOKEN_EXPIRES_IN_SECONDS / 3600),
);

export function renderResetPasswordTemplate(data: ResetPasswordTemplateData): {
  subject: string;
  html: string;
  text: string;
} {
  const userName = escapeHtml(data.userName);
  const appName = escapeHtml(data.appName);
  const resetUrl = escapeHtml(data.resetUrl);

  const subject = `Reset your ${data.appName} password`;

  const bodyHtml = `
    <h1 style="margin:0 0 12px;font-size:26px;font-weight:700;line-height:1.3;color:#0B0E14;">Reset your password</h1>
    <p style="margin:0 0 8px;font-size:16px;line-height:1.65;color:#374151;">
      Hi <strong style="color:#00BF8B;">${userName}</strong>, we received a request to reset the password for your <strong>${appName}</strong> account.
    </p>
    <p style="margin:0 0 24px;font-size:15px;line-height:1.65;color:#4B5563;">
      If you made this request, tap the button below to choose a new password. This link works once and expires automatically.
    </p>

    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin:0 0 28px;">
      <tr>
        <td align="center">
          <a href="${resetUrl}" class="email-btn" style="display:inline-block;padding:16px 40px;font-size:14px;font-weight:700;color:#FFFFFF;text-decoration:none;border-radius:12px;background-color:#00BF8B;box-shadow:0 4px 14px rgba(0,191,139,0.4);letter-spacing:0.05em;">
            RESET MY PASSWORD
          </a>
        </td>
      </tr>
    </table>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 20px;background-color:#F0F4FF;border:1px solid #C7D7FF;border-radius:12px;">
      <tr>
        <td style="padding:16px 18px;">
          <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#00BF8B;">What happens next</p>
          <ol style="margin:0;padding-left:20px;font-size:14px;line-height:1.75;color:#374151;">
            <li style="margin-bottom:6px;">Open the secure link above</li>
            <li style="margin-bottom:6px;">Enter and confirm your new password</li>
            <li>Sign in with your new credentials</li>
          </ol>
        </td>
      </tr>
    </table>

    <p style="margin:0 0 8px;font-size:13px;line-height:1.6;color:#4B5563;">
      Button not working? Copy this link:
    </p>
    <p style="margin:0 0 20px;font-size:12px;line-height:1.5;word-break:break-all;">
      <a href="${resetUrl}" style="color:#00BF8B;text-decoration:underline;">${resetUrl}</a>
    </p>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#FFF8E6;border:1px solid #F5D76E;border-radius:12px;">
      <tr>
        <td style="padding:14px 16px;">
          <p style="margin:0 0 6px;font-size:12px;font-weight:700;color:#92400E;">Security notice</p>
          <p style="margin:0;font-size:13px;line-height:1.6;color:#78350F;">
            This link expires in <strong>${EXPIRY_HOURS} hour${EXPIRY_HOURS === 1 ? "" : "s"}</strong>.
            If you did not request a password reset, you can safely ignore this email — your password will not change.
          </p>
        </td>
      </tr>
    </table>
  `;

  const html = renderEmailBaseLayout({
    previewText: `Reset your ${data.appName} password within ${EXPIRY_HOURS} hour(s).`,
    title: subject,
    bodyHtml,
    heroTag: "Secure password reset",
    footerNote: data.brand?.isPartner
      ? `Never share this email or link. ${data.appName} (on Gud Game) will never ask for your password by email.`
      : "Never share this email or link. Gud Game will never ask for your password by email.",
    brand: data.brand
      ? {
          name: data.brand.name,
          logoUrl: data.brand.logoUrl,
          siteUrl: data.brand.siteUrl,
          accentColor: data.brand.accentColor,
          heroTag: data.brand.isPartner
            ? "Member account · Powered by Gud Game"
            : undefined,
        }
      : undefined,
  });

  const text = [
    `Hi ${data.userName},`,
    "",
    `Reset your ${data.appName} password within ${EXPIRY_HOURS} hour(s):`,
    data.resetUrl,
    "",
    "If you did not request this, ignore this email.",
  ].join("\n");

  return { subject, html, text };
}
