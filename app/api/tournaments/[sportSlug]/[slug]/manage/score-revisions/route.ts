import { getServerSession } from "@/lib/auth/session";
import { jsonError, jsonSuccess } from "@/lib/api/response";
import { requireApiRoleGuardContext } from "@/lib/auth/role-guard";
import { AppError } from "@/lib/errors";
import { assertTournamentManagePageAccess } from "@/lib/tournaments/manage-access";
import { getTournamentBySlug } from "@/lib/tournaments/service";
import {
  listMatchScoreRevisions,
  revisionsToAuditScoreEvents,
} from "@/lib/tournaments/scoring/score-revisions";
import type { MatchScoreEvent } from "@/lib/tournaments/scoring/match-score-events";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ sportSlug: string; slug: string }> },
) {
  try {
    await getServerSession();
    const { userId, roles } = await requireApiRoleGuardContext();
    const { sportSlug, slug } = await params;
    const tournament = await getTournamentBySlug(sportSlug, slug);
    if (!tournament) {
      throw new AppError("Tournament not found", { code: "NOT_FOUND", statusCode: 404 });
    }
    await assertTournamentManagePageAccess(tournament, userId, roles);

    const revisions = await listMatchScoreRevisions({
      tournamentId: tournament.id,
      limit: 500,
    });

    const byMatch = new Map<string, typeof revisions>();
    for (const r of revisions) {
      const list = byMatch.get(r.matchId) ?? [];
      list.push(r);
      byMatch.set(r.matchId, list);
    }

    const eventsByMatchId: Record<string, MatchScoreEvent[]> = {};
    for (const [matchId, list] of byMatch) {
      eventsByMatchId[matchId] = revisionsToAuditScoreEvents(list);
    }

    return jsonSuccess({
      revisions,
      eventsByMatchId,
    });
  } catch (error) {
    return jsonError(error);
  }
}
