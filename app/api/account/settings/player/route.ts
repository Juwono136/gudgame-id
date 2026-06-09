import { jsonError, jsonSuccess } from "@/lib/api/response";
import {
  getPlayerWikiProfileForUser,
  upsertPlayerWikiProfile,
} from "@/lib/account/player-profile/service";
import { requireAccountSettingsAccess } from "@/lib/auth/role-guard";
import { getServerSession } from "@/lib/auth/session";
import { getUserRoleAssignments } from "@/lib/roles/sync";
import { playerProfileUpsertSchema } from "@/lib/validations/account-settings";
import { AppError } from "@/lib/errors";

export const runtime = "nodejs";

function parseJsonField<T>(raw: FormDataEntryValue | null, fallback: T): T {
  if (typeof raw !== "string" || !raw.trim()) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function requirePlayerRole(userId: string) {
  const roles = await getUserRoleAssignments(userId);
  if (!roles.includes("player")) {
    throw new AppError("Player role required", { code: "FORBIDDEN", statusCode: 403 });
  }
}

export async function GET() {
  try {
    await requireAccountSettingsAccess();
    const session = await getServerSession();
    if (!session?.user) {
      throw new AppError("Unauthorized", { code: "UNAUTHORIZED", statusCode: 401 });
    }

    await requirePlayerRole(session.user.id);
    const profile = await getPlayerWikiProfileForUser(session.user.id);
    return jsonSuccess({ profile });
  } catch (error) {
    return jsonError(error);
  }
}

async function handleUpsert(request: Request, create: boolean) {
  await requireAccountSettingsAccess();
  const session = await getServerSession();
  if (!session?.user) {
    throw new AppError("Unauthorized", { code: "UNAUTHORIZED", statusCode: 401 });
  }

  await requirePlayerRole(session.user.id);

  const formData = await request.formData();
  const parsed = playerProfileUpsertSchema.safeParse({
    biography: formData.get("biography") ?? "",
    summary: formData.get("summary") ?? "",
    nationality: formData.get("nationality") ?? "",
    age: formData.get("age") ?? "",
    socialLinks: parseJsonField(formData.get("socialLinks"), []),
    signatureGearId: formData.get("signatureGearId") ?? "",
    equipment: parseJsonField(formData.get("equipment"), []),
    gallery: parseJsonField(formData.get("gallery"), []),
  });

  if (!parsed.success) {
    throw new AppError("Validation failed", {
      code: "VALIDATION_ERROR",
      statusCode: 422,
      context: { fieldErrors: parsed.error.flatten().fieldErrors },
    });
  }

  const profile = await upsertPlayerWikiProfile(
    session.user.id,
    parsed.data,
    formData,
    { create },
  );

  return jsonSuccess({
    profile,
    message: create ? "Player profile created." : "Player profile saved.",
  });
}

export async function POST(request: Request) {
  try {
    return await handleUpsert(request, true);
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    return await handleUpsert(request, false);
  } catch (error) {
    return jsonError(error);
  }
}
