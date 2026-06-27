import { jsonError, jsonSuccess } from "@/lib/api/response";
import { AppError } from "@/lib/errors";
import { requireApiRoleGuardContext } from "@/lib/auth/role-guard";
import { redeemAccessInvite } from "@/lib/tournaments/invitations/access-grants";
import { redeemPlayerInvite } from "@/lib/tournaments/invitations/player-invites";
import { inviteRedeemSchema } from "@/lib/validations/tournaments";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { userId } = await requireApiRoleGuardContext();
    const body = await request.json();
    const parsed = inviteRedeemSchema.safeParse(body);

    if (!parsed.success) {
      throw new AppError("Invalid redeem payload", {
        code: "VALIDATION_ERROR",
        statusCode: 422,
      });
    }

    const kind = typeof body === "object" && body && "kind" in body ? String(body.kind) : "access";

    if (kind === "player") {
      const result = await redeemPlayerInvite({
        userId,
        token: parsed.data.token,
        code: parsed.data.code,
        tournamentId: parsed.data.tournamentId,
      });
      return jsonSuccess({ kind: "player", ...result });
    }

    const result = await redeemAccessInvite({
      userId,
      token: parsed.data.token,
      code: parsed.data.code,
      tournamentId: parsed.data.tournamentId,
    });

    return jsonSuccess({ kind: "access", ...result });
  } catch (error) {
    return jsonError(error);
  }
}
