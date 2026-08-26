import "server-only";

import { sendTemplatedEmailInBackground } from "@/lib/email/send";
import type { EmailBrandContext } from "@/lib/email/types";
import { getBaseUrl } from "@/lib/auth/urls-server";
import type { PartnerPublicView } from "@/lib/partners/service";

type PartnerMailBase = {
  to: string;
  userName: string;
  partner: PartnerPublicView;
};

function partnerBrand(partner: PartnerPublicView): EmailBrandContext {
  const base = getBaseUrl();
  return {
    name: partner.displayName,
    logoUrl: partner.logoUrl,
    siteUrl: `${base}/${partner.slug}`,
    accentColor: partner.branding.primaryColor ?? partner.branding.accentColor,
    isPartner: true,
  };
}

export function sendPartnerPlayerVerifyEmail(
  input: PartnerMailBase & { verifyUrl: string },
): void {
  const brand = partnerBrand(input.partner);
  sendTemplatedEmailInBackground({
    to: input.to,
    template: "verify-email",
    data: {
      userName: input.userName,
      verifyUrl: input.verifyUrl,
      appName: input.partner.displayName,
      brand,
    },
  });
}

export function sendPartnerPlayerResetPasswordEmail(
  input: PartnerMailBase & { resetUrl: string },
): void {
  const brand = partnerBrand(input.partner);
  sendTemplatedEmailInBackground({
    to: input.to,
    template: "reset-password",
    data: {
      userName: input.userName,
      resetUrl: input.resetUrl,
      appName: input.partner.displayName,
      brand,
    },
  });
}

export function sendPartnerPlayerPasswordChangedEmail(
  input: PartnerMailBase & { loginUrl: string },
): void {
  const brand = partnerBrand(input.partner);
  sendTemplatedEmailInBackground({
    to: input.to,
    template: "password-changed",
    data: {
      userName: input.userName,
      appName: input.partner.displayName,
      loginUrl: input.loginUrl,
      changedAt: new Date().toISOString(),
      brand,
    },
  });
}
