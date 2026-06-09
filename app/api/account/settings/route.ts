import { jsonError, jsonSuccess } from "@/lib/api/response";
import { getAccountSettings } from "@/lib/account/settings/get-settings";
import { requireAccountSettingsAccess } from "@/lib/auth/role-guard";
import { getServerSession } from "@/lib/auth/session";
import { AppError } from "@/lib/errors";

export const runtime = "nodejs";

export async function GET() {
  try {
    await requireAccountSettingsAccess();
    const session = await getServerSession();
    if (!session?.user) {
      throw new AppError("Unauthorized", { code: "UNAUTHORIZED", statusCode: 401 });
    }

    const data = await getAccountSettings(session.user.id);
    return jsonSuccess(data);
  } catch (error) {
    return jsonError(error);
  }
}
