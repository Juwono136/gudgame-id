import { jsonError, jsonSuccess } from "@/lib/api/response";
import { requireApiRoleGuardContext } from "@/lib/auth/role-guard";
import { autocompletePlaces, isGooglePlacesConfigured } from "@/lib/maps/google-places";
import { z } from "zod";
import { guardApiRequest } from "@/lib/api/guard-request";

export const runtime = "nodejs";

const querySchema = z.object({
  input: z.string().trim().min(2).max(120),
});

export async function GET(request: Request) {
  try {
    await guardApiRequest(request, { tier: "maps" });
    await requireApiRoleGuardContext();
    const url = new URL(request.url);
    const { input } = querySchema.parse(Object.fromEntries(url.searchParams));

    if (!isGooglePlacesConfigured()) {
      return jsonSuccess({ items: [], configured: false });
    }

    const items = await autocompletePlaces(input);
    return jsonSuccess({ items, configured: true });
  } catch (error) {
    return jsonError(error);
  }
}
