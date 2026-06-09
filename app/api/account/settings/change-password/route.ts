import { eq } from "drizzle-orm";
import { jsonError, jsonSuccess } from "@/lib/api/response";
import { changeAccountPassword } from "@/lib/account/settings/change-password";
import { setInitialAccountPassword } from "@/lib/account/settings/set-password";
import { requireAccountSettingsAccess } from "@/lib/auth/role-guard";
import { getUserAuthProvidersByUserId } from "@/lib/auth/account-providers";
import { getServerSession } from "@/lib/auth/session";
import { getDb } from "@/db/client";
import { user } from "@/db/schema/auth";
import {
  changePasswordSettingsSchema,
  setPasswordSettingsSchema,
} from "@/lib/validations/account-settings";
import { AppError } from "@/lib/errors";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    await requireAccountSettingsAccess();
    const session = await getServerSession();
    if (!session?.user) {
      throw new AppError("Unauthorized", { code: "UNAUTHORIZED", statusCode: 401 });
    }

    const body = await request.json();
    const providers = await getUserAuthProvidersByUserId(session.user.id);

    const [dbUser] = await getDb()
      .select({
        email: user.email,
        name: user.name,
        fullNameKtp: user.fullNameKtp,
      })
      .from(user)
      .where(eq(user.id, session.user.id))
      .limit(1);

    if (!dbUser) {
      throw new AppError("User not found", { code: "NOT_FOUND", statusCode: 404 });
    }

    if (!providers.hasPassword) {
      const parsed = setPasswordSettingsSchema.parse(body);
      await setInitialAccountPassword(session.user.id, parsed);
      return jsonSuccess({
        message:
          "Password created. You can now sign in with email/password or Google. A confirmation email has been sent.",
      });
    }

    const parsed = changePasswordSettingsSchema.parse(body);
    await changeAccountPassword(
      session.user.id,
      dbUser.email,
      dbUser.fullNameKtp ?? dbUser.name ?? dbUser.email,
      parsed,
    );

    return jsonSuccess({ message: "Password updated. A confirmation email has been sent." });
  } catch (error) {
    return jsonError(error);
  }
}
