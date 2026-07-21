import type { RegistrationConfirmParticipationTemplateData } from "@/lib/email/types";
import { renderEmailBaseLayout } from "./base-layout";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Notifies the captain that registration was received (spot reserved).
 * Confirmation / payment still happen in the web app — this email is informational.
 */
export function renderRegistrationConfirmParticipationTemplate(
  data: RegistrationConfirmParticipationTemplateData,
): { subject: string; html: string; text: string } {
  const subject = `You're registered — ${data.sportName} · ${data.tournamentName}`;
  const tournamentUrl = escapeHtml(data.tournamentUrl);
  const continueUrl = escapeHtml(data.confirmUrl);

  const bodyHtml = `
    <h1 class="email-hero-title" style="margin:0 0 12px;font-size:26px;font-weight:700;line-height:1.3;color:#0B0E14;">You're registered</h1>
    <p style="margin:0 0 8px;font-size:16px;line-height:1.65;color:#374151;">
      Hi <strong style="color:#00BF8B;">${escapeHtml(data.userName)}</strong>, your team
      <strong>${escapeHtml(data.teamName)}</strong> has successfully joined
      <strong>${escapeHtml(data.tournamentName)}</strong>.
    </p>
    <p style="margin:0 0 24px;font-size:15px;line-height:1.65;color:#4B5563;">
      Your spot is reserved. Next steps — confirming participation and completing payment —
      are handled securely in the Gud Game app. Please finish them within
      <strong>${data.deadlineHours} hours</strong> so your slot stays locked.
    </p>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 24px;background-color:#F8FAFC;border:1px solid #E5E7EB;border-radius:12px;">
      <tr>
        <td style="padding:18px 20px;">
          <p style="margin:0 0 10px;font-size:12px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#00BF8B;">Registration summary</p>
          <p style="margin:0 0 6px;font-size:14px;color:#111827;"><strong>Sport:</strong> ${escapeHtml(data.sportName)}</p>
          <p style="margin:0 0 6px;font-size:14px;color:#111827;"><strong>Team:</strong> ${escapeHtml(data.teamName)}</p>
          <p style="margin:0;font-size:14px;color:#111827;"><strong>Event:</strong> ${escapeHtml(data.tournamentName)}</p>
        </td>
      </tr>
    </table>

    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin:0 0 12px;">
      <tr>
        <td align="center">
          <a href="${continueUrl}" class="email-btn" style="display:inline-block;padding:14px 28px;background-color:#00BF8B;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;border-radius:10px;">
            Continue in Gud Game
          </a>
        </td>
      </tr>
    </table>

    <p style="margin:16px 0 0;text-align:center;font-size:13px;line-height:1.6;color:#6B7280;">
      Or open the
      <a href="${tournamentUrl}" style="color:#00BF8B;text-decoration:none;font-weight:600;">tournament page</a>
      anytime.
    </p>
  `;

  const html = renderEmailBaseLayout({
    previewText: `You're registered for ${data.tournamentName}. Continue in the Gud Game app.`,
    title: subject,
    bodyHtml,
    heroTag: "Official tournament · Registration received",
    footerNote:
      "This is an automated message from Gud Game. Confirmation and payment are completed in the app — please do not reply to this email.",
  });

  const text = `Hi ${data.userName},

Your team "${data.teamName}" has successfully joined ${data.tournamentName} (${data.sportName}).

Your spot is reserved. Confirm participation and complete payment in the Gud Game app within ${data.deadlineHours} hours.

Continue: ${data.confirmUrl}
Tournament: ${data.tournamentUrl}

— ${data.appName}`;

  return { subject, html, text };
}
