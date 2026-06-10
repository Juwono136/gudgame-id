import { jsonError, jsonSuccess } from "@/lib/api/response";
import { getServerSession } from "@/lib/auth/session";
import { AppError } from "@/lib/errors";
import { getTournamentBySlug } from "@/lib/tournaments/service";
import { getUserRegistrationStatus } from "@/lib/tournaments/registration/service";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ sportSlug: string; slug: string }> },
) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return jsonSuccess({ status: "none", isAuthenticated: false });
    }

    const { sportSlug, slug } = await params;
    const tournament = await getTournamentBySlug(sportSlug, slug);

    if (!tournament) {
      throw new AppError("Tournament not found", { code: "NOT_FOUND", statusCode: 404 });
    }

    const registration = await getUserRegistrationStatus(tournament.id, session.user.id);
    return jsonSuccess({ ...registration, isAuthenticated: true });
  } catch (error) {
    return jsonError(error);
  }
}
