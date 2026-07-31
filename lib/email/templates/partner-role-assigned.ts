import type { PartnerRoleAssignedTemplateData } from "@/lib/email/types";
import { renderEmailBaseLayout } from "./base-layout";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function renderPartnerRoleAssignedTemplate(
  data: PartnerRoleAssignedTemplateData,
): { subject: string; html: string; text: string } {
  const userName = escapeHtml(data.userName);
  const appName = escapeHtml(data.appName);
  const partnerName = escapeHtml(data.partnerDisplayName);
  const partnerSlug = escapeHtml(data.partnerSlug);
  const consoleUrl = escapeHtml(data.consoleUrl);
  const publicUrl = escapeHtml(data.publicUrl);
  const loginUrl = escapeHtml(data.loginUrl);

  const subject = `${data.partnerDisplayName} — Partner access on ${data.appName}`;

  const nextSteps = data.isNewAccount
    ? `
      <ol style="margin:0;padding-left:20px;font-size:14px;line-height:1.75;color:#374151;">
        <li style="margin-bottom:6px;">Confirm your email using the invitation message (includes your temporary password)</li>
        <li style="margin-bottom:6px;">Sign in and set a new password when prompted</li>
        <li>Open the Partner console to manage your workspace</li>
      </ol>
    `
    : data.needsEmailVerification
      ? `
      <ol style="margin:0;padding-left:20px;font-size:14px;line-height:1.75;color:#374151;">
        <li style="margin-bottom:6px;">Confirm your email using the verification link we sent</li>
        <li style="margin-bottom:6px;">Sign in at <a href="${loginUrl}" style="color:#00BF8B;">${loginUrl}</a></li>
        <li>Open the Partner console to manage your workspace</li>
      </ol>
    `
      : `
      <ol style="margin:0;padding-left:20px;font-size:14px;line-height:1.75;color:#374151;">
        <li style="margin-bottom:6px;">Sign in at <a href="${loginUrl}" style="color:#00BF8B;">${loginUrl}</a></li>
        <li>Open the Partner console to manage tournaments, leagues, and branding</li>
      </ol>
    `;

  const bodyHtml = `
    <h1 style="margin:0 0 12px;font-size:26px;font-weight:700;line-height:1.3;color:#0B0E14;">Partner access granted</h1>
    <p style="margin:0 0 8px;font-size:16px;line-height:1.65;color:#374151;">
      Hi <strong style="color:#00BF8B;">${userName}</strong>, you now have Partner access on <strong>${appName}</strong>.
    </p>
    <p style="margin:0 0 24px;font-size:15px;line-height:1.65;color:#4B5563;">
      Your workspace <strong>${partnerName}</strong> is ready. Use the Partner console for events and seasons; your public site is available at <strong>/${partnerSlug}</strong>.
    </p>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 20px;background-color:#F0F4FF;border:1px solid #C7D7FF;border-radius:12px;">
      <tr>
        <td style="padding:18px 20px;">
          <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#00BF8B;">Workspace</p>
          <p style="margin:0 0 4px;font-size:18px;font-weight:700;color:#0B0E14;">${partnerName}</p>
          <p style="margin:0;font-size:13px;line-height:1.6;color:#4B5563;">Public route: /${partnerSlug}</p>
        </td>
      </tr>
    </table>

    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin:0 0 28px;">
      <tr>
        <td align="center">
          <a href="${consoleUrl}" class="email-btn" style="display:inline-block;padding:16px 40px;font-size:14px;font-weight:700;color:#FFFFFF;text-decoration:none;border-radius:12px;background-color:#00BF8B;box-shadow:0 4px 14px rgba(0,191,139,0.4);letter-spacing:0.05em;">
            OPEN PARTNER CONSOLE
          </a>
        </td>
      </tr>
    </table>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 20px;background-color:#F9FAFB;border:1px solid #E5E7EB;border-radius:12px;">
      <tr>
        <td style="padding:16px 18px;">
          <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#374151;">Next steps</p>
          ${nextSteps}
        </td>
      </tr>
    </table>

    <p style="margin:0 0 8px;font-size:13px;line-height:1.6;color:#4B5563;">
      Public site: <a href="${publicUrl}" style="color:#00BF8B;text-decoration:underline;">${publicUrl}</a>
    </p>
    <p style="margin:0;font-size:13px;line-height:1.6;color:#4B5563;">
      Console: <a href="${consoleUrl}" style="color:#00BF8B;text-decoration:underline;">${consoleUrl}</a>
    </p>
  `;

  const html = renderEmailBaseLayout({
    previewText: `Partner access for ${data.partnerDisplayName} is ready on ${data.appName}.`,
    title: subject,
    bodyHtml,
    heroTag: "Partner workspace",
    footerNote:
      "This message was sent because an administrator granted you Partner access on Gud Game.",
  });

  const textLines = [
    `Hi ${data.userName},`,
    "",
    `You now have Partner access on ${data.appName}.`,
    `Workspace: ${data.partnerDisplayName}`,
    `Public site: ${data.publicUrl}`,
    `Console: ${data.consoleUrl}`,
    "",
  ];

  if (data.isNewAccount) {
    textLines.push(
      "Confirm your email using the invitation message (it includes your temporary password), set a new password, then open the Partner console.",
    );
  } else if (data.needsEmailVerification) {
    textLines.push(
      "Confirm your email using the verification link we sent, then sign in and open the Partner console.",
      `Sign in: ${data.loginUrl}`,
    );
  } else {
    textLines.push(`Sign in: ${data.loginUrl}`, "Then open the Partner console.");
  }

  return { subject, html, text: textLines.join("\n") };
}
