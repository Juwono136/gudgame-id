import "server-only";

/** Gmail SMTP defaults for TandingBase transactional mail */
export const GMAIL_SMTP_HOST = "smtp.gmail.com";
export const GMAIL_SMTP_PORT = 587;

export function getSmtpSettings() {
  const host = process.env.SMTP_HOST?.trim() || GMAIL_SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? GMAIL_SMTP_PORT);
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();

  return { host, port, user, pass };
}

export function isSmtpReady(): boolean {
  const { user, pass } = getSmtpSettings();
  return Boolean(user && pass);
}
