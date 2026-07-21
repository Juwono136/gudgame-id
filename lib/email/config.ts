import "server-only";

/** Default SMTP host when using Google Workspace / Gmail relay */
export const GMAIL_SMTP_HOST = "smtp.gmail.com";
export const GMAIL_SMTP_PORT = 587;

/** Official Gud Game transactional identity (domain: gudgame.id) */
export const DEFAULT_EMAIL_FROM_ADDRESS = "noreply@gudgame.id";
export const DEFAULT_EMAIL_REPLY_TO = "master@gudgame.id";
export const DEFAULT_EMAIL_FROM_NAME = "Gud Game";

export function getSmtpSettings() {
  const host = process.env.SMTP_HOST?.trim() || GMAIL_SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? GMAIL_SMTP_PORT);
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();

  return { host, port, user, pass };
}

/**
 * Public From / Reply-To for system emails.
 * Auth still uses SMTP_USER + SMTP_PASS; From can be a noreply alias on the same domain.
 */
export function getEmailIdentity() {
  const fromAddress =
    process.env.SMTP_FROM?.trim() ||
    process.env.EMAIL_FROM?.trim() ||
    DEFAULT_EMAIL_FROM_ADDRESS;
  const replyTo =
    process.env.SMTP_REPLY_TO?.trim() ||
    process.env.EMAIL_REPLY_TO?.trim() ||
    DEFAULT_EMAIL_REPLY_TO;
  const fromName =
    process.env.SMTP_FROM_NAME?.trim() ||
    process.env.EMAIL_FROM_NAME?.trim() ||
    DEFAULT_EMAIL_FROM_NAME;

  return {
    fromAddress,
    replyTo,
    fromName,
    fromHeader: `"${fromName.replace(/"/g, "")}" <${fromAddress}>`,
  };
}

export function isSmtpReady(): boolean {
  const { user, pass } = getSmtpSettings();
  return Boolean(user && pass);
}
