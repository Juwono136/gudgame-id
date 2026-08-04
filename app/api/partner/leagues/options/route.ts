import { guardApiRequest } from "@/lib/api/guard-request";
import { jsonError, jsonSuccess } from "@/lib/api/response";
import { listPartnerLeagueOptions } from "@/lib/partners/leagues";
import { requirePartnerWorkspace } from "@/lib/partners/session";

export const runtime = "nodejs";

/** Compact league options for tournament pickers & directory filter chips. */
export async function GET(request: Request) {
  try {
    await guardApiRequest(request, {
      tier: "general",
      keySuffix: "partner-league-options",
    });
    const workspace = await requirePartnerWorkspace();
    const { searchParams } = new URL(request.url);
    const includeDraft = searchParams.get("includeDraft") === "1";
    const items = await listPartnerLeagueOptions(workspace.partner.id, { includeDraft });
    return jsonSuccess({ items });
  } catch (error) {
    return jsonError(error);
  }
}
