import { revalidatePath } from "next/cache";
import { jsonError, jsonSuccess } from "@/lib/api/response";
import { requireUserManagementAccess } from "@/lib/admin/session";
import {
  getHomepageSettings,
  updateHomepageSettings,
} from "@/lib/site/homepage-settings";
import { homepageSettingsSchema } from "@/lib/validations/homepage-settings";
import { zodErrorToAppError } from "@/lib/validations/format-zod-error";

export const runtime = "nodejs";

export async function GET() {
  try {
    await requireUserManagementAccess();
    const settings = await getHomepageSettings();
    return jsonSuccess({ settings });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const ctx = await requireUserManagementAccess();
    const body = await request.json();
    const parsed = homepageSettingsSchema.safeParse(body);
    if (!parsed.success) {
      throw zodErrorToAppError(parsed.error);
    }

    const settings = await updateHomepageSettings(parsed.data, ctx.userId);
    revalidatePath("/");
    revalidatePath("/about");
    revalidatePath("/contact");
    revalidatePath("/privacy");
    revalidatePath("/terms");
    return jsonSuccess({ settings });
  } catch (error) {
    return jsonError(error);
  }
}
