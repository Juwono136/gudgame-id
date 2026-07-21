import "server-only";
import nodemailer from "nodemailer";
import {
  getEmailIdentity,
  getSmtpSettings,
  isSmtpReady,
} from "@/lib/email/config";
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
  const identity = getEmailIdentity();

  if (!user || !pass) {
    if (process.env.NODE_ENV === "development") {
      log.warn("SMTP not configured — email logged to console", {
        to: params.to,
        subject: params.subject,
        from: identity.fromHeader,
        hint: `Set SMTP_USER and SMTP_PASS with SMTP_FROM=${identity.fromAddress}`,
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
      from: identity.fromHeader,
      replyTo: identity.replyTo,
      to: params.to,
      subject: params.subject,
      html: params.html,
      text: params.text,
      headers: {
        "X-Auto-Response-Suppress": "All",
        "Auto-Submitted": "auto-generated",
      },
    });

    log.info("Email sent", {
      to: params.to,
      subject: params.subject,
      from: identity.fromAddress,
      replyTo: identity.replyTo,
      host,
    });
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log.error("Failed to send email", {
      error: message,
      to: params.to,
      from: identity.fromAddress,
      host,
    });

    const friendly =
      host.includes("gmail") && message.toLowerCase().includes("auth")
        ? "Gmail rejected credentials. Use an App Password (not your normal password) with 2FA enabled."
        : message.includes("Sender") || message.toLowerCase().includes("from")
          ? `Sender rejected. Ensure ${identity.fromAddress} is allowed for SMTP user ${user} (alias / Send mail as).`
          : message;

    return { ok: false, error: friendly };
  }
}
