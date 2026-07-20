import { jsonError, jsonSuccess } from "@/lib/api/response";
import { resolveProxySessionContext } from "@/lib/session/proxy-session";

export const runtime = "nodejs";

/**
 * Lightweight session flags for `proxy.ts` only.
 * Prefer this over `/api/account/session-context` on every navigation.
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const needRoles = url.searchParams.get("roles") === "1";
    const data = await resolveProxySessionContext({ needRoles });
    if (!data) {
      return jsonSuccess({
        authenticated: false,
        roles: [],
        mustChangePassword: false,
        accountInactive: false,
      });
    }
    return jsonSuccess({
      authenticated: true,
      ...data,
    });
  } catch (error) {
    return jsonError(error);
  }
}
