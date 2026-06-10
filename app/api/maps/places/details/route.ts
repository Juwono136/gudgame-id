import { jsonError, jsonSuccess } from "@/lib/api/response";
import { requireApiRoleGuardContext } from "@/lib/auth/role-guard";
import { getPlaceDetails, isGooglePlacesConfigured } from "@/lib/maps/google-places";
import { z } from "zod";
import { guardApiRequest } from "@/lib/api/guard-request";

export const runtime = "nodejs";

const querySchema = z.object({
  placeId: z.string().trim().min(1).max(256),
});

export async function GET(request: Request) {
  try {
    await guardApiRequest(request, { tier: "maps" });
    await requireApiRoleGuardContext();
    const url = new URL(request.url);
    const { placeId } = querySchema.parse(Object.fromEntries(url.searchParams));

    if (!isGooglePlacesConfigured()) {
      return jsonSuccess({ configured: false, place: null });
    }

    const place = await getPlaceDetails(placeId);
    return jsonSuccess({ configured: true, place });
  } catch (error) {
    return jsonError(error);
  }
}
