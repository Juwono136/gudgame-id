import "server-only";

import { requirePartnerDashboardAccess } from "@/lib/auth/role-guard";
import { AppError } from "@/lib/errors";
import {
  assertUserIsPartnerMember,
  getPrimaryPartnerForUser,
  type PartnerDashboardView,
} from "@/lib/partners/service";

export type PartnerSessionContext = {
  userId: string;
  roles: string[];
  partner: PartnerDashboardView;
};

export async function requirePartnerWorkspace(): Promise<PartnerSessionContext> {
  const ctx = await requirePartnerDashboardAccess();
  const partner = await getPrimaryPartnerForUser(ctx.userId);
  if (!partner) {
    // Super admin without membership — still blocked from partner workspace until provisioned
    throw new AppError(
      "No partner organization linked to this account. Ask a super admin to assign the Partner role with a slug.",
      { code: "FORBIDDEN", statusCode: 403 },
    );
  }
  if (!partner.isActive) {
    throw new AppError("Partner organization is inactive", {
      code: "FORBIDDEN",
      statusCode: 403,
    });
  }
  await assertUserIsPartnerMember(ctx.userId, partner.id);
  return { userId: ctx.userId, roles: ctx.roles, partner };
}
