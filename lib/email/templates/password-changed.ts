import type { PasswordChangedTemplateData } from "@/lib/email/types";
import { renderEmailBaseLayout } from "./base-layout";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatChangedAt(iso: string): string {
  try {
    return new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function renderPasswordChangedTemplate(data: PasswordChangedTemplateData): {
  subject: string;
  html: string;
  text: string;
} {
  const userName = escapeHtml(data.userName);
  const appName = escapeHtml(data.appName);
  const loginUrl = escapeHtml(data.loginUrl);
  const changedAt = escapeHtml(formatChangedAt(data.changedAt));

  const subject = `Your ${data.appName} password was changed`;

  const bodyHtml = `
    <h1 style="margin:0 0 12px;font-size:26px;font-weight:700;line-height:1.3;color:#0B0E14;">Password updated</h1>
    <p style="margin:0 0 8px;font-size:16px;line-height:1.65;color:#374151;">
      Hi <strong style="color:#0047FF;">${userName}</strong>, your <strong>${appName}</strong> account password was changed successfully.
    </p>
    <p style="margin:0 0 24px;font-size:15px;line-height:1.65;color:#4B5563;">
      Changed on <strong>${changedAt}</strong>. Use your new password the next time you sign in.
    </p>

    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin:0 0 28px;">
      <tr>
        <td align="center">
          <a href="${loginUrl}" class="email-btn" style="display:inline-block;padding:16px 40px;font-size:14px;font-weight:700;color:#FFFFFF;text-decoration:none;border-radius:12px;background-color:#0047FF;box-shadow:0 4px 14px rgba(0,71,255,0.4);letter-spacing:0.05em;">
            SIGN IN TO ${appName.toUpperCase()}
          </a>
        </td>
      </tr>
    </table>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#FFF8E6;border:1px solid #F5D76E;border-radius:12px;">
      <tr>
        <td style="padding:14px 16px;">
          <p style="margin:0 0 6px;font-size:12px;font-weight:700;color:#92400E;">Didn't make this change?</p>
          <p style="margin:0;font-size:13px;line-height:1.6;color:#78350F;">
            If you did not update your password, reset it immediately from the login page or contact support.
          </p>
        </td>
      </tr>
    </table>
  `;

  const html = renderEmailBaseLayout({
    previewText: `Your ${data.appName} password was changed on ${formatChangedAt(data.changedAt)}.`,
    title: subject,
    bodyHtml,
    heroTag: "Account security",
    footerNote:
      "Never share your password. TandingBase will never ask for your password by email.",
  });

  const text = [
    `Hi ${data.userName},`,
    "",
    `Your ${data.appName} password was changed on ${formatChangedAt(data.changedAt)}.`,
    `Sign in: ${data.loginUrl}`,
    "",
    "If you did not make this change, reset your password immediately.",
  ].join("\n");

  return { subject, html, text };
}
