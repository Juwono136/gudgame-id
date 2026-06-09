import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getServerSession } from "@/lib/auth/session";
import { uploadProfilePhoto } from "@/lib/auth/upload-profile-photo";
import { getNicknameFormatError } from "@/lib/auth/nickname-rules";
import { isNicknameAvailable, normalizeNickname } from "@/lib/auth/nickname";
import { getProfileCompletionStatus } from "@/lib/auth/profile-completion";
import { getDb } from "@/db/client";
import { user } from "@/db/schema/auth";
import { getDialByCountryCode } from "@/lib/constants/phone-countries";
import { validateProfilePhoto } from "@/lib/validations/auth";
import { completeProfileSchema } from "@/lib/validations/profile-completion";
import { logger } from "@/lib/logger";

const log = logger.child({ route: "/api/account/complete-profile" });

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [existing] = await getDb()
      .select()
      .from(user)
      .where(eq(user.id, session.user.id))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const formData = await request.formData();
    const photoFile = formData.get("photo");
    const needsPhoto = !existing.image?.trim() && !existing.imageStorageKey?.trim();

    if (needsPhoto) {
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
    }

    const parsed = completeProfileSchema.safeParse({
      fullNameKtp: formData.get("fullNameKtp"),
      phoneCountryCode: formData.get("phoneCountryCode"),
      phone: formData.get("phone"),
      nickname: formData.get("nickname") || "",
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

    const data = parsed.data;
    const nicknameRaw = data.nickname?.trim() ?? "";
    if (nicknameRaw) {
      const formatError = getNicknameFormatError(nicknameRaw);
      if (formatError) {
        return NextResponse.json(
          { error: formatError, fieldErrors: { nickname: [formatError] } },
          { status: 422 },
        );
      }
    }

    const nickname = normalizeNickname(data.nickname);
    if (nickname && nickname !== existing.nickname) {
      const available = await isNicknameAvailable(nickname, existing.id);
      if (!available) {
        return NextResponse.json(
          {
            error: "This nickname is already taken",
            fieldErrors: { nickname: ["This nickname is already taken. Try another."] },
          },
          { status: 409 },
        );
      }
    }

    let imageUrl = existing.image;
    let imageStorageKey = existing.imageStorageKey;

    if (needsPhoto && photoFile instanceof File && photoFile.size > 0) {
      const upload = await uploadProfilePhoto(photoFile, existing.email);
      if (!upload.ok) {
        return NextResponse.json({ error: upload.error }, { status: 500 });
      }
      const { deleteStoredObjectIfReplaced } = await import(
        "@/lib/storage/object-lifecycle"
      );
      await deleteStoredObjectIfReplaced(
        existing.imageStorageKey ?? existing.image,
        upload.storageKey,
      );
      imageUrl = upload.url;
      imageStorageKey = upload.storageKey;
    }

    const phoneDialCode =
      getDialByCountryCode(data.phoneCountryCode) ?? data.phoneCountryCode;

    await getDb()
      .update(user)
      .set({
        fullNameKtp: data.fullNameKtp,
        phone: data.phone,
        phoneCountryCode: phoneDialCode,
        nickname: nickname || existing.nickname,
        name: data.fullNameKtp,
        image: imageUrl,
        imageStorageKey,
        updatedAt: new Date(),
      })
      .where(eq(user.id, existing.id));

    const status = getProfileCompletionStatus({
      fullNameKtp: data.fullNameKtp,
      phone: data.phone,
      phoneCountryCode: phoneDialCode,
      image: imageUrl,
      imageStorageKey,
    });

    return NextResponse.json({
      success: true,
      message: status.isComplete
        ? "Your profile is now complete."
        : "Profile saved. A few optional details can still be added later.",
      profileComplete: status.isComplete,
    });
  } catch (err) {
    log.error("Complete profile failed", err);
    return NextResponse.json(
      { error: "Could not update profile. Please try again." },
      { status: 500 },
    );
  }
}
