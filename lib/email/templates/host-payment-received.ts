import type { HostPaymentReceivedTemplateData } from "@/lib/email/types";
import { renderEmailBaseLayout } from "./base-layout";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function renderHostPaymentReceivedTemplate(
  data: HostPaymentReceivedTemplateData,
): { subject: string; html: string; text: string } {
  const appName = escapeHtml(data.appName);
  const hostName = escapeHtml(data.hostName);
  const playerName = escapeHtml(data.playerName);
  const tournamentName = escapeHtml(data.tournamentName);
  const teamName = escapeHtml(data.teamName);
  const sportName = escapeHtml(data.sportName);
  const receiptUrl = escapeHtml(data.receiptUrl);
  const ledgerUrl = escapeHtml(data.ledgerUrl);
  const tournamentWorkspaceUrl = escapeHtml(data.tournamentWorkspaceUrl);

  const subject = `Payment received — ${data.sportName} · ${data.teamName} · ${data.tournamentName}`;

  const settlementHtml = `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 24px;border:1px solid #E5E7EB;border-radius:12px;overflow:hidden;">
      <tr>
        <td style="padding:14px 18px;background-color:#F8FAFC;border-bottom:1px solid #E5E7EB;">
          <p style="margin:0;font-size:12px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#00BF8B;">Settlement summary</p>
        </td>
      </tr>
      <tr>
        <td style="padding:16px 18px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="font-size:14px;color:#111827;">
            <tr>
              <td style="padding:6px 0;color:#4B5563;">Collected (paid)</td>
              <td style="padding:6px 0;text-align:right;font-weight:600;">${escapeHtml(data.amountCollectedFormatted)}</td>
            </tr>
            <tr>
              <td style="padding:6px 0;color:#4B5563;">Platform fee</td>
              <td style="padding:6px 0;text-align:right;font-weight:600;">${escapeHtml(data.platformFeeFormatted)}</td>
            </tr>
            <tr>
              <td style="padding:10px 0 0;border-top:1px solid #E5E7EB;color:#047857;font-weight:700;">Your payout</td>
              <td style="padding:10px 0 0;border-top:1px solid #E5E7EB;text-align:right;font-size:16px;font-weight:800;color:#047857;">${escapeHtml(data.hostPayoutFormatted)}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  `;

  const receiptMetaHtml = `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 20px;background-color:#EFF6FF;border:1px solid #BFDBFE;border-radius:12px;">
      <tr>
        <td style="padding:18px 20px;">
          <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#00BF8B;">Transaction receipt</p>
          <p style="margin:0 0 6px;font-size:14px;color:#111827;"><strong>Player:</strong> ${playerName}${data.playerEmail ? ` <span style="color:#6B7280;">(${escapeHtml(data.playerEmail)})</span>` : ""}</p>
          <p style="margin:0 0 6px;font-size:14px;color:#111827;"><strong>Team:</strong> ${teamName}</p>
          ${data.invoiceNumber ? `<p style="margin:0 0 6px;font-size:13px;color:#111827;"><strong>Receipt no.</strong> <span style="font-family:ui-monospace,monospace;">${escapeHtml(data.invoiceNumber)}</span></p>` : ""}
          ${data.paidAtFormatted ? `<p style="margin:0;font-size:14px;color:#111827;"><strong>Paid on:</strong> ${escapeHtml(data.paidAtFormatted)}</p>` : ""}
        </td>
      </tr>
    </table>
  `;

  const bodyHtml = `
    <h1 style="margin:0 0 12px;font-size:26px;font-weight:700;line-height:1.3;color:#0B0E14;">New tournament payment</h1>
    <p style="margin:0 0 8px;font-size:16px;line-height:1.65;color:#374151;">
      Hi <strong style="color:#00BF8B;">${hostName}</strong>, a player has completed payment for your official tournament
      <strong>${tournamentName}</strong>.
    </p>
    <p style="margin:0 0 24px;font-size:15px;line-height:1.65;color:#4B5563;">
      The official receipt is available for your records. Settlement details are included below.
    </p>

    ${receiptMetaHtml}
    ${settlementHtml}

    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin:0 0 12px;">
      <tr>
        <td align="center">
          <a href="${receiptUrl}" class="email-btn" style="display:inline-block;padding:16px 36px;font-size:14px;font-weight:700;color:#FFFFFF;text-decoration:none;border-radius:12px;background-color:#00BF8B;box-shadow:0 4px 14px rgba(0,191,139,0.35);letter-spacing:0.04em;">
            VIEW OFFICIAL RECEIPT
          </a>
        </td>
      </tr>
    </table>

    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin:0 0 24px;">
      <tr>
        <td align="center">
          <a href="${ledgerUrl}" style="display:inline-block;padding:12px 28px;font-size:14px;font-weight:600;color:#00BF8B;text-decoration:none;border-radius:10px;border:2px solid #00BF8B;">
            Open payment ledger
          </a>
        </td>
      </tr>
    </table>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 24px;background-color:#F8FAFC;border:1px solid #E5E7EB;border-radius:12px;">
      <tr>
        <td style="padding:18px 20px;">
          <p style="margin:0 0 10px;font-size:12px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#6B7280;">Tournament</p>
          <p style="margin:0 0 6px;font-size:14px;color:#111827;"><strong>Event:</strong> ${tournamentName}</p>
          <p style="margin:0;font-size:14px;color:#111827;"><strong>Sport:</strong> ${sportName}</p>
        </td>
      </tr>
    </table>

    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin:0 0 28px;">
      <tr>
        <td align="center">
          <a href="${tournamentWorkspaceUrl}" style="font-size:13px;font-weight:600;color:#00BF8B;text-decoration:none;">
            Manage tournament workspace →
          </a>
        </td>
      </tr>
    </table>

    <p style="margin:0;font-size:13px;line-height:1.6;color:#6B7280;">
      This receipt is issued for your tournament records. Payout timing follows your configured schedule in
      ${appName}. For support, reply to this email or contact our team.
    </p>
  `;

  const html = renderEmailBaseLayout({
    previewText: `${data.playerName} paid ${data.amountCollectedFormatted} for ${data.teamName}.`,
    title: subject,
    bodyHtml,
    heroTag: "Host workspace · Payment received",
    footerNote: `You received this email because you host an official paid tournament on ${data.appName}.`,
  });

  const text = [
    `Payment received — ${data.tournamentName}`,
    ``,
    `Hi ${data.hostName},`,
    `${data.playerName} paid ${data.amountCollectedFormatted} for team "${data.teamName}".`,
    data.invoiceNumber ? `Receipt: ${data.invoiceNumber}` : "",
    data.paidAtFormatted ? `Paid on: ${data.paidAtFormatted}` : "",
    `Collected: ${data.amountCollectedFormatted}`,
    `Platform fee: ${data.platformFeeFormatted}`,
    `Your payout: ${data.hostPayoutFormatted}`,
    `View receipt: ${data.receiptUrl}`,
    `Payment ledger: ${data.ledgerUrl}`,
    `Tournament workspace: ${data.tournamentWorkspaceUrl}`,
  ]
    .filter(Boolean)
    .join("\n");

  return { subject, html, text };
}
