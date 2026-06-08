import { EMAIL_LOGO_URL } from "@/lib/auth/constants";
import { siteConfig } from "@/lib/config/site";

type BaseLayoutParams = {
  previewText: string;
  title: string;
  bodyHtml: string;
  footerNote?: string;
  heroTag?: string;
};

export function renderEmailBaseLayout({
  previewText,
  title,
  bodyHtml,
  footerNote = `You received this email because of activity on your ${siteConfig.shortName} account.`,
  heroTag = "Performance data · Community wiki",
}: BaseLayoutParams): string {
  const appUrl = (
    process.env.BETTER_AUTH_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "http://localhost:3000"
  ).replace(/\/$/, "");

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
<body style="margin:0;padding:0;background-color:#E8EAEF;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:#E8EAEF;opacity:0;">${previewText}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#E8EAEF;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" class="email-container" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;background-color:#FFFFFF;border:1px solid #D8DCE6;border-radius:20px;overflow:hidden;box-shadow:0 8px 32px rgba(11,14,20,0.12);">
          <tr>
            <td class="email-padding" style="padding:36px 32px 28px;text-align:center;background:linear-gradient(160deg,#0047FF 0%,#0033C0 55%,#191B25 100%);">
              <img src="${EMAIL_LOGO_URL}" alt="${siteConfig.shortName}" width="72" height="72" style="display:block;margin:0 auto 16px;border-radius:16px;border:3px solid rgba(255,255,255,0.35);background:#FFFFFF;" />
              <p style="margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:0.24em;text-transform:uppercase;color:#DAF8E7;">${siteConfig.shortName}</p>
              <p style="margin:0;font-size:13px;color:#E2E8F0;">${heroTag}</p>
            </td>
          </tr>
          <tr>
            <td class="email-padding" style="padding:28px 32px 24px;color:#1A1D26;background-color:#FFFFFF;">
              ${bodyHtml}
            </td>
          </tr>
          <tr>
            <td class="email-padding" style="padding:20px 32px 28px;border-top:1px solid #E2E8F0;background-color:#F4F6FA;text-align:center;">
              <p style="margin:0 0 10px;font-size:13px;line-height:1.65;color:#4B5563;">${footerNote}</p>
              <p style="margin:0;font-size:12px;color:#6B7280;">© ${new Date().getFullYear()} ${siteConfig.name} · <a href="${appUrl}" style="color:#0047FF;text-decoration:none;font-weight:600;">Visit ${siteConfig.shortName}</a></p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
