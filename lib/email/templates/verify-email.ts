import type { VerifyEmailTemplateData } from "@/lib/email/types";
import { EMAIL_VERIFICATION_EXPIRES_IN_SECONDS } from "@/lib/auth/constants";
import { PARTNER_PLAYER_EMAIL_VERIFY_EXPIRES_IN_SECONDS } from "@/lib/partners/auth/constants";
import { renderEmailBaseLayout } from "./base-layout";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function renderVerifyEmailTemplate(data: VerifyEmailTemplateData): {
  subject: string;
  html: string;
  text: string;
} {
  const userName = escapeHtml(data.userName);
  const appName = escapeHtml(data.appName);
  const verifyUrl = escapeHtml(data.verifyUrl);
  const isPartner = Boolean(data.brand?.isPartner);
  const EXPIRY_HOURS = Math.round(
    (isPartner
      ? PARTNER_PLAYER_EMAIL_VERIFY_EXPIRES_IN_SECONDS
      : EMAIL_VERIFICATION_EXPIRES_IN_SECONDS) / 3600,
  );

  const subject = `Confirm your ${data.appName} account`;

  const nextSteps = isPartner
    ? `
            <li style="margin-bottom:6px;">Confirm your email with the button above</li>
            <li style="margin-bottom:6px;">Sign in on the <strong>${appName}</strong> site with your password</li>
            <li>Open tournaments and your member account</li>`
    : `
            <li style="margin-bottom:6px;">Confirm your email with the button above</li>
            <li style="margin-bottom:6px;">Sign in at Gud Game with your password</li>
            <li>Open your player dashboard</li>`;

  const introExtra = isPartner
    ? `Tap the button below to verify your email and unlock your ${appName} member account on this partner site.`
    : `Tap the button below to verify your email and unlock your dashboard, wiki contributions, and player tracking.`;

  const securityNote = isPartner
    ? `This confirmation link expires in <strong>${EXPIRY_HOURS} hours</strong> for your protection.
            After it expires you must request a new verification email from the ${appName} sign-in page.
            If you did not create a ${appName} member account, you can safely ignore this message.`
    : `This confirmation link expires in <strong>${EXPIRY_HOURS} hours</strong> for your protection.
            After it expires you must request a new verification email from the sign-in page.
            If you did not create a Gud Game account, you can safely ignore this message — no account will be activated.`;

  const bodyHtml = `
    <h1 style="margin:0 0 12px;font-size:26px;font-weight:700;line-height:1.3;color:#0B0E14;">You're almost on court</h1>
    <p style="margin:0 0 8px;font-size:16px;line-height:1.65;color:#374151;">
      Hi <strong style="color:#00BF8B;">${userName}</strong>, thanks for joining <strong>${appName}</strong>.
    </p>
    <p style="margin:0 0 24px;font-size:15px;line-height:1.65;color:#4B5563;">
      ${introExtra}
    </p>

    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin:0 0 28px;">
      <tr>
        <td align="center">
          <a href="${verifyUrl}" class="email-btn" style="display:inline-block;padding:16px 40px;font-size:14px;font-weight:700;color:#FFFFFF;text-decoration:none;border-radius:12px;background-color:#00BF8B;box-shadow:0 4px 14px rgba(0,191,139,0.4);letter-spacing:0.05em;">
            CONFIRM MY EMAIL
          </a>
        </td>
      </tr>
    </table>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 20px;background-color:#F0F4FF;border:1px solid #C7D7FF;border-radius:12px;">
      <tr>
        <td style="padding:16px 18px;">
          <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#00BF8B;">What happens next</p>
          <ol style="margin:0;padding-left:20px;font-size:14px;line-height:1.75;color:#374151;">
            ${nextSteps}
          </ol>
        </td>
      </tr>
    </table>

    <p style="margin:0 0 8px;font-size:13px;line-height:1.6;color:#4B5563;">
      Button not working? Copy this link:
    </p>
    <p style="margin:0 0 20px;font-size:12px;line-height:1.5;word-break:break-all;">
      <a href="${verifyUrl}" style="color:#00BF8B;text-decoration:underline;">${verifyUrl}</a>
    </p>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#FFF8E6;border:1px solid #F5D76E;border-radius:12px;">
      <tr>
        <td style="padding:14px 16px;">
          <p style="margin:0 0 6px;font-size:12px;font-weight:700;color:#92400E;">Security notice</p>
          <p style="margin:0;font-size:13px;line-height:1.6;color:#78350F;">
            ${securityNote}
          </p>
        </td>
      </tr>
    </table>
  `;

  const html = renderEmailBaseLayout({
    previewText: `Confirm your ${data.appName} email within ${EXPIRY_HOURS} hours.`,
    title: subject,
    bodyHtml,
    heroTag: "Secure email verification",
    footerNote: isPartner
      ? `For your security, verification links expire automatically. Never share this email or link. ${data.appName} runs on Gud Game.`
      : "For your security, verification links expire automatically. Never share this email or link with anyone.",
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
    `Welcome to ${data.appName}! Confirm your email within ${EXPIRY_HOURS} hours:`,
    data.verifyUrl,
    "",
    isPartner
      ? `Sign in on the ${data.appName} partner site after confirming.`
      : `This link expires in ${EXPIRY_HOURS} hours. If it has expired, sign in and request a new verification email.`,
    "",
    "If you did not sign up, ignore this email.",
  ].join("\n");

  return { subject, html, text };
}
