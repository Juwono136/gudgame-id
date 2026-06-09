import { jsonError, jsonSuccess } from "@/lib/api/response";
import { updateStaffProfile } from "@/lib/account/settings/update-staff-profile";
import { requireAccountSettingsAccess } from "@/lib/auth/role-guard";
import { getServerSession } from "@/lib/auth/session";
import { staffProfileUpdateSchema } from "@/lib/validations/account-settings";
import { AppError } from "@/lib/errors";

export const runtime = "nodejs";

export async function PATCH(request: Request) {
  try {
    await requireAccountSettingsAccess();
    const session = await getServerSession();
    if (!session?.user) {
      throw new AppError("Unauthorized", { code: "UNAUTHORIZED", statusCode: 401 });
    }

    const formData = await request.formData();
    const photoFile = formData.get("photo");
    const parsed = staffProfileUpdateSchema.safeParse({
      fullNameKtp: formData.get("fullNameKtp"),
      phoneCountryCode: formData.get("phoneCountryCode"),
      phone: formData.get("phone"),
    });

    if (!parsed.success) {
      throw new AppError("Validation failed", {
        code: "VALIDATION_ERROR",
        statusCode: 422,
        context: { fieldErrors: parsed.error.flatten().fieldErrors },
      });
    }

    await updateStaffProfile(
      session.user.id,
      parsed.data,
      photoFile instanceof File && photoFile.size > 0 ? photoFile : null,
    );

    return jsonSuccess({ message: "Profile updated successfully." });
  } catch (error) {
    return jsonError(error);
  }
}
