import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth/server";
import { uploadProfilePhoto } from "@/lib/auth/upload-profile-photo";
import { getDb } from "@/db/client";
import { user } from "@/db/schema";
import { logger } from "@/lib/logger";
import { registerSchema, validateProfilePhoto } from "@/lib/validations/auth";
import { getNicknameFormatError } from "@/lib/auth/nickname-rules";
import { isNicknameAvailable, normalizeNickname } from "@/lib/auth/nickname";
import { authRoutes } from "@/lib/constants/routes";
import { getDialByCountryCode } from "@/lib/constants/phone-countries";

const log = logger.child({ route: "/api/account/register" });

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const photoFile = formData.get("photo");

    const parsed = registerSchema.safeParse({
      fullNameKtp: formData.get("fullNameKtp"),
      email: formData.get("email"),
      phoneCountryCode: formData.get("phoneCountryCode"),
      phone: formData.get("phone"),
      password: formData.get("password"),
      confirmPassword: formData.get("confirmPassword"),
      nickname: formData.get("nickname") || "",
      clubName: formData.get("clubName") || "",
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
        { error: photoValidation.message, fieldErrors: { photo: [photoValidation.message] } },
        { status: 422 },
      );
    }

    const data = parsed.data;
    const email = data.email.toLowerCase();
    const nicknameRaw = data.nickname?.trim() ?? "";
    if (nicknameRaw) {
      const formatError = getNicknameFormatError(nicknameRaw);
      if (formatError) {
        return NextResponse.json(
          {
            error: formatError,
            fieldErrors: { nickname: [formatError] },
          },
          { status: 422 },
        );
      }
    }

    const nickname = normalizeNickname(data.nickname);

    if (nickname) {
      const available = await isNicknameAvailable(nickname);
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

    const upload = await uploadProfilePhoto(photoValidation.file, email);
    if (!upload.ok) {
      return NextResponse.json(
        {
          error:
            upload.error ||
            "Failed to upload profile photo to storage. Check SeaweedFS connection.",
        },
        { status: 500 },
      );
    }

    const baseUrl =
      process.env.BETTER_AUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "";

    const signUpResult = await auth.api.signUpEmail({
      body: {
        name: data.fullNameKtp,
        email,
        password: data.password,
        image: upload.url,
        callbackURL: `${baseUrl}${authRoutes.verifyEmail}?status=success`,
      },
    });

    if (!signUpResult?.user) {
      return NextResponse.json(
        { error: "Registration could not be completed. Please try again." },
        { status: 400 },
      );
    }

    const phoneDialCode =
      getDialByCountryCode(data.phoneCountryCode) ?? data.phoneCountryCode;

    await getDb()
      .update(user)
      .set({
        phone: data.phone,
        phoneCountryCode: phoneDialCode,
        nickname,
        clubName: data.clubName || null,
        fullNameKtp: data.fullNameKtp,
        image: upload.url,
        imageStorageKey: upload.storageKey,
        updatedAt: new Date(),
      })
      .where(eq(user.id, signUpResult.user.id));

    const { ensureDefaultPlayerRole } = await import("@/lib/roles/sync");
    await ensureDefaultPlayerRole(signUpResult.user.id);

    return NextResponse.json({
      success: true,
      message:
        "Account created. Check your email to verify your address before signing in.",
      redirectTo: authRoutes.checkEmail,
    });
  } catch (err) {
    log.error("Registration failed", err);
    const message =
      err instanceof Error ? err.message : "Registration failed";

    if (
      message.toLowerCase().includes("nickname") ||
      message.toLowerCase().includes("unique")
    ) {
      return NextResponse.json(
        {
          error: "This nickname is already taken",
          fieldErrors: { nickname: ["This nickname is already taken. Try another."] },
        },
        { status: 409 },
      );
    }

    if (message.toLowerCase().includes("already")) {
      return NextResponse.json(
        {
          error:
            "If this email is registered, check your inbox. Otherwise try signing in.",
        },
        { status: 409 },
      );
    }

    return NextResponse.json(
      {
        error:
          process.env.NODE_ENV === "production"
            ? "Registration failed. Please try again."
            : message,
      },
      { status: 500 },
    );
  }
}
