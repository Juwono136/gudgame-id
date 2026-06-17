import type { RegistrationConfirmParticipationTemplateData } from "@/lib/email/types";
import { renderEmailBaseLayout } from "./base-layout";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function renderRegistrationConfirmParticipationTemplate(
  data: RegistrationConfirmParticipationTemplateData,
): { subject: string; html: string; text: string } {
  const subject = `Confirm your spot — ${data.tournamentName}`;
  const confirmUrl = escapeHtml(data.confirmUrl);

  const bodyHtml = `
    <h1 class="email-hero-title" style="margin:0 0 12px;font-size:26px;font-weight:700;line-height:1.3;color:#0B0E14;">Confirm your participation</h1>
    <p style="margin:0 0 8px;font-size:16px;line-height:1.65;color:#374151;">
      Hi <strong style="color:#0047FF;">${escapeHtml(data.userName)}</strong>, your team
      <strong>${escapeHtml(data.teamName)}</strong> is reserved for
      <strong>${escapeHtml(data.tournamentName)}</strong>.
    </p>
    <p style="margin:0 0 24px;font-size:15px;line-height:1.65;color:#4B5563;">
      Please confirm within <strong>${data.deadlineHours} hours</strong> that you will compete.
      Payment is only unlocked after you confirm — this keeps spots fair for all players.
    </p>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 24px;background-color:#F8FAFC;border:1px solid #E5E7EB;border-radius:12px;">
      <tr>
        <td style="padding:18px 20px;">
          <p style="margin:0 0 10px;font-size:12px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#0047FF;">Registration summary</p>
          <p style="margin:0 0 6px;font-size:14px;color:#111827;"><strong>Sport:</strong> ${escapeHtml(data.sportName)}</p>
          <p style="margin:0 0 6px;font-size:14px;color:#111827;"><strong>Team:</strong> ${escapeHtml(data.teamName)}</p>
          <p style="margin:0;font-size:14px;color:#111827;"><strong>Event:</strong> ${escapeHtml(data.tournamentName)}</p>
        </td>
      </tr>
    </table>

    <a href="${confirmUrl}" class="email-btn" style="display:inline-block;padding:14px 28px;background-color:#0047FF;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;border-radius:10px;">
      Confirm participation
    </a>

    <p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:#6B7280;">
      Not joining? You can decline from the confirmation page — your reserved slot will be released.
    </p>
  `;

  const html = renderEmailBaseLayout({
    previewText: `Confirm your spot for ${data.tournamentName} within ${data.deadlineHours} hours.`,
    title: subject,
    bodyHtml,
    heroTag: "Official tournament · Confirmation required",
  });

  const text = `Hi ${data.userName},

Your team "${data.teamName}" is reserved for ${data.tournamentName}.

Confirm within ${data.deadlineHours} hours: ${data.confirmUrl}

Tournament page: ${data.tournamentUrl}

— ${data.appName}`;

  return { subject, html, text };
}
