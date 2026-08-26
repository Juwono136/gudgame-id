import { and, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { partnerPlayers } from "@/db/schema/partner-players";
import { AppError } from "@/lib/errors";
import { guardApiRequest } from "@/lib/api/guard-request";
import {
  partnerAuthError,
  requestMeta,
  resolvePartnerFromParams,
  sessionCookieResponse,
} from "@/lib/partners/auth/api-helpers";
import {
  createPartnerPlayerSession,
  revokeAllPartnerPlayerSessions,
  verifyPartnerPlayerEmail,
} from "@/lib/partners/auth/service";
import { partnerAuthRoutes } from "@/lib/partners/auth/urls";
import { partnerPlayerVerifyEmailSchema } from "@/lib/validations/partner-auth";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ partnerSlug: string }> };

export async function POST(request: Request, context: Ctx) {
  try {
    await guardApiRequest(request, { tier: "partnerPlayerAuth" });
    const partner = await resolvePartnerFromParams(context.params);
    const body = await request.json();
    const parsed = partnerPlayerVerifyEmailSchema.safeParse(body);
    if (!parsed.success) {
      throw new AppError(parsed.error.issues[0]?.message ?? "Invalid input", {
        code: "VALIDATION_ERROR",
        statusCode: 422,
      });
    }

    const identity = await verifyPartnerPlayerEmail({
      partnerId: partner.id,
      token: parsed.data.token,
    });

    const [player] = await getDb()
      .select({ id: partnerPlayers.id, archivedAt: partnerPlayers.archivedAt })
      .from(partnerPlayers)
      .where(
        and(
          eq(partnerPlayers.partnerId, partner.id),
          eq(partnerPlayers.identityId, identity.id),
        ),
      )
      .limit(1);

    if (player?.archivedAt) {
      await revokeAllPartnerPlayerSessions(identity.id);
      throw new AppError("This member account has been removed by the partner", {
        code: "FORBIDDEN",
        statusCode: 403,
      });
    }

    const meta = requestMeta(request);
    const { token } = await createPartnerPlayerSession({
      partnerId: partner.id,
      identityId: identity.id,
      userAgent: meta.userAgent,
      ipAddress: meta.ipAddress,
    });

    return sessionCookieResponse(
      partner.slug,
      {
        ok: true,
        redirectTo: partnerAuthRoutes(partner.slug).home,
      },
      token,
    );
  } catch (error) {
    return partnerAuthError(error);
  }
}
