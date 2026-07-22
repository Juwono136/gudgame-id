import { NextResponse } from "next/server";
import { jsonError, jsonSuccess } from "@/lib/api/response";
import { requireUserManagementAccess } from "@/lib/admin/session";
import { createAdminUser, listAdminUsers } from "@/lib/admin/users/service";
import { uploadProfilePhoto } from "@/lib/auth/upload-profile-photo";
import { AppError } from "@/lib/errors";
import {
  adminCreateUserSchema,
  adminUsersListQuerySchema,
} from "@/lib/validations/admin-users";
import { validateProfilePhoto } from "@/lib/validations/auth";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    await requireUserManagementAccess();
    const url = new URL(request.url);
    const query = adminUsersListQuerySchema.parse(
      Object.fromEntries(url.searchParams.entries()),
    );
    const list = await listAdminUsers(query);
    return jsonSuccess(list);
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await requireUserManagementAccess();
    const formData = await request.formData();
    const photoFile = formData.get("photo");

    const parsed = adminCreateUserSchema.safeParse({
      fullNameKtp: formData.get("fullNameKtp"),
      email: formData.get("email"),
      phoneCountryCode: formData.get("phoneCountryCode"),
      phone: formData.get("phone"),
      nickname: formData.get("nickname") || "",
      roles: formData.getAll("roles"),
      isActive: formData.get("isActive") ?? "true",
    });

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          fieldErrors: parsed.error.flatten().fieldErrors,
        },
        { status: 422 },
      );
    }

    const photoValidation = validateProfilePhoto(
      photoFile instanceof File ? photoFile : null,
    );
    if (!photoValidation.ok) {
      return NextResponse.json(
        {
          error: photoValidation.message,
          fieldErrors: { photo: [photoValidation.message] },
        },
        { status: 422 },
      );
    }

    const data = parsed.data;

    if (data.roles.includes("super_admin") && !ctx.roles.includes("super_admin")) {
      throw new AppError("Only super admins can assign the super admin role", {
        code: "FORBIDDEN",
        statusCode: 403,
      });
    }

    const upload = await uploadProfilePhoto(photoValidation.file, data.email);
    if (!upload.ok) {
      return NextResponse.json(
        {
          error:
            upload.error ||
            "Failed to upload profile photo. Check storage configuration.",
        },
        { status: 500 },
      );
    }

    const created = await createAdminUser(data, ctx.userId, {
      imageUrl: upload.url,
      imageStorageKey: upload.storageKey,
    });

    return jsonSuccess(
      {
        ...created,
        message:
          "User created. They will receive an email with a confirmation link and temporary password.",
      },
      201,
    );
  } catch (error) {
    return jsonError(error);
  }
}
