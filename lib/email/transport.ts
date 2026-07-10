import "server-only";
import nodemailer from "nodemailer";
import { getSmtpSettings, GMAIL_SMTP_HOST, isSmtpReady } from "@/lib/email/config";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "email" });

export function isEmailConfigured(): boolean {
  return isSmtpReady();
}

export async function sendRawEmail(params: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const { host, port, user, pass } = getSmtpSettings();

  if (!user || !pass) {
    if (process.env.NODE_ENV === "development") {
      log.warn("SMTP not configured — email logged to console", {
        to: params.to,
        subject: params.subject,
        hint: `Set SMTP_USER and SMTP_PASS (Gmail App Password) with SMTP_HOST=${GMAIL_SMTP_HOST}`,
      });
      log.info(params.text);
      return { ok: true };
    }
    return {
      ok: false,
      error: "Email service is not configured. Contact support.",
    };
  }

  try {
    const transport = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      requireTLS: port === 587,
      auth: { user, pass },
      tls: {
        minVersion: "TLSv1.2",
      },
    });

    await transport.sendMail({
      from: `"Gud Game" <${user}>`,
      to: params.to,
      subject: params.subject,
      html: params.html,
      text: params.text,
      replyTo: user,
    });

    log.info("Email sent", { to: params.to, subject: params.subject, host });
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log.error("Failed to send email", { error: message, to: params.to, host });

    const friendly =
      host.includes("gmail") && message.toLowerCase().includes("auth")
        ? "Gmail rejected credentials. Use an App Password (not your normal password) with 2FA enabled."
        : message;

    return { ok: false, error: friendly };
  }
}
