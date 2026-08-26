import { EMAIL_LOGO_URL } from "@/lib/auth/constants";
import { brandColors, siteConfig } from "@/lib/config/site";

type BaseLayoutParams = {
  previewText: string;
  title: string;
  bodyHtml: string;
  footerNote?: string;
  heroTag?: string;
  /** Partner / white-label branding (optional). Falls back to Gud Game. */
  brand?: {
    name: string;
    logoUrl?: string | null;
    siteUrl?: string | null;
    /** Shown under brand name, e.g. "Member account · Powered by Gud Game" */
    heroTag?: string;
    /** Accent for CTA-adjacent chrome (hex). Defaults to Gud Game emerald. */
    accentColor?: string | null;
  };
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function renderEmailBaseLayout({
  previewText,
  title,
  bodyHtml,
  footerNote,
  heroTag = "Tournaments · Live scores · Community",
  brand,
}: BaseLayoutParams): string {
  const appUrl = (
    process.env.BETTER_AUTH_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "http://localhost:3000"
  ).replace(/\/$/, "");

  const isPartner = Boolean(brand?.name?.trim());
  const brandName = escapeHtml(brand?.name?.trim() || siteConfig.shortName);
  const logoSrc = brand?.logoUrl?.trim() || EMAIL_LOGO_URL;
  const logoAlt = brandName;
  const visitUrl = escapeHtml(brand?.siteUrl?.trim() || appUrl);
  const resolvedHero = escapeHtml(
    brand?.heroTag?.trim() ||
      (isPartner ? "Member account · Powered by Gud Game" : heroTag),
  );
  const resolvedFooter =
    footerNote ??
    (isPartner
      ? `${brandName} is a partner site on ${siteConfig.shortName}. This is an automated message — please do not reply.`
      : `This is an automated message from ${siteConfig.shortName}. Please do not reply to this email.`);

  const heroBg = isPartner
    ? `linear-gradient(160deg,#1a1a2e 0%,#16213e 45%,#0f3460 100%)`
    : `linear-gradient(160deg,${brandColors.forest} 0%,${brandColors.forestAlt} 45%,${brandColors.black} 100%)`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <meta name="color-scheme" content="light dark" />
  <meta name="supported-color-schemes" content="light dark" />
  <title>${title}</title>
  <style>
    @media only screen and (max-width: 600px) {
      .email-container { width: 100% !important; }
      .email-padding { padding-left: 20px !important; padding-right: 20px !important; }
      .email-hero-title { font-size: 22px !important; }
      .email-btn { display: block !important; width: 100% !important; text-align: center !important; box-sizing: border-box !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#E8F5EF;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:#E8F5EF;opacity:0;">${previewText}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#E8F5EF;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" class="email-container" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;background-color:#FFFFFF;border:1px solid #D4EBE3;border-radius:20px;overflow:hidden;box-shadow:0 8px 32px rgba(3,41,33,0.12);">
          <tr>
            <td class="email-padding" style="padding:36px 32px 28px;text-align:center;background:${heroBg};">
              <img src="${escapeHtml(logoSrc)}" alt="${logoAlt}" width="160" height="auto" style="display:block;margin:0 auto 16px;max-width:160px;height:auto;border-radius:12px;" />
              <p style="margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:0.24em;text-transform:uppercase;color:${brandColors.mint};">${brandName}</p>
              <p style="margin:0;font-size:13px;color:#E2E8F0;">${resolvedHero}</p>
            </td>
          </tr>
          <tr>
            <td class="email-padding" style="padding:28px 32px 24px;color:#032921;background-color:#FFFFFF;">
              ${bodyHtml}
            </td>
          </tr>
          <tr>
            <td class="email-padding" style="padding:20px 32px 28px;border-top:1px solid #D4EBE3;background-color:#F5FAF8;text-align:center;">
              <p style="margin:0 0 10px;font-size:13px;line-height:1.65;color:#4A6B60;">${resolvedFooter}</p>
              ${
                isPartner
                  ? `<p style="margin:0 0 8px;font-size:12px;color:#6B8F82;">Powered by <strong>${escapeHtml(siteConfig.shortName)}</strong> · Partner member mail</p>
              <p style="margin:0;font-size:12px;color:#6B8F82;">© ${new Date().getFullYear()} ${brandName} · <a href="${visitUrl}" style="color:${brandColors.emerald};text-decoration:none;font-weight:600;">Open ${brandName}</a></p>`
                  : `<p style="margin:0 0 8px;font-size:12px;color:#6B8F82;">Sent from noreply@gudgame.id · Replies go to master@gudgame.id</p>
              <p style="margin:0;font-size:12px;color:#6B8F82;">© ${new Date().getFullYear()} ${siteConfig.name} · <a href="${appUrl}" style="color:${brandColors.emerald};text-decoration:none;font-weight:600;">Visit ${siteConfig.shortName}</a></p>`
              }
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
