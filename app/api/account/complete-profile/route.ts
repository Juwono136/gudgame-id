import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getServerSession } from "@/lib/auth/session";
import { uploadProfilePhoto } from "@/lib/auth/upload-profile-photo";
import { getNicknameFormatError } from "@/lib/auth/nickname-rules";
import { isNicknameAvailable, normalizeNickname } from "@/lib/auth/nickname";
import {
  getProfileCompletionStatus,
  normalizeSportInterestSlugs,
} from "@/lib/auth/profile-completion";
import { getDb } from "@/db/client";
import { user } from "@/db/schema/auth";
import { getDialByCountryCode } from "@/lib/constants/phone-countries";
import { validateProfilePhoto } from "@/lib/validations/auth";
import { completeProfileSchema } from "@/lib/validations/profile-completion";
import { logger } from "@/lib/logger";

const log = logger.child({ route: "/api/account/complete-profile" });

export const runtime = "nodejs";

function parseSportInterestSlugs(raw: FormDataEntryValue | null): string[] {
  if (typeof raw !== "string" || !raw.trim()) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

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

    if (photoFile instanceof File && photoFile.size > 0) {
      const photoValidation = validateProfilePhoto(photoFile);
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
      sportInterestSlugs: parseSportInterestSlugs(formData.get("sportInterestSlugs")),
      gender: formData.get("gender"),
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

    if (photoFile instanceof File && photoFile.size > 0) {
      const photoValidation = validateProfilePhoto(photoFile);
      if (photoValidation.ok) {
        const upload = await uploadProfilePhoto(photoValidation.file, existing.email);
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
    }

    const phoneDialCode =
      getDialByCountryCode(data.phoneCountryCode) ?? data.phoneCountryCode;
    const sportInterestSlugs = normalizeSportInterestSlugs(data.sportInterestSlugs);

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
        sportInterestSlugs,
        gender: data.gender,
        profileOnboardingCompletedAt: existing.profileOnboardingCompletedAt ?? new Date(),
        updatedAt: new Date(),
      })
      .where(eq(user.id, existing.id));

    let syncedSportSlugs: string[] = [];
    try {
      const { syncOwnedPlayerProfilesFromSportInterests } = await import(
        "@/lib/account/player-profile/sync-owned-profiles"
      );
      ({ syncedSportSlugs } = await syncOwnedPlayerProfilesFromSportInterests(existing.id));
    } catch (syncErr) {
      // Account fields already saved — do not fail onboarding on wiki sync issues.
      log.error("complete-profile wiki sync failed after user update", {
        userId: existing.id,
        message: syncErr instanceof Error ? syncErr.message : String(syncErr),
      });
    }

    try {
      const { reconcileDashboardSportCookie } = await import("@/lib/dashboard/sport-context");
      await reconcileDashboardSportCookie(existing.id);
    } catch (cookieErr) {
      log.warn("complete-profile sport cookie reconcile failed", {
        userId: existing.id,
        message: cookieErr instanceof Error ? cookieErr.message : String(cookieErr),
      });
    }

    const status = getProfileCompletionStatus({
      fullNameKtp: data.fullNameKtp,
      phone: data.phone,
      phoneCountryCode: phoneDialCode,
      sportInterestSlugs,
      gender: data.gender,
    });

    return NextResponse.json({
      success: true,
      message: status.isComplete
        ? syncedSportSlugs.length > 0
          ? `Your profile is complete. Public player page${syncedSportSlugs.length > 1 ? "s" : ""} created for ${syncedSportSlugs.join(", ")}.`
          : "Your profile is now complete."
        : "Profile saved. You can update details anytime in Settings.",
      profileComplete: status.isComplete,
      playerPagesCreated: syncedSportSlugs,
    });
  } catch (err) {
    const cause =
      err instanceof Error && "cause" in err && err.cause instanceof Error
        ? err.cause.message
        : null;
    log.error("Complete profile failed", {
      message: err instanceof Error ? err.message : String(err),
      cause,
    });
    return NextResponse.json(
      { error: "Could not update profile. Please try again." },
      { status: 500 },
    );
  }
}
