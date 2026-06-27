import "server-only";

import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { user } from "@/db/schema/auth";
import { AppError } from "@/lib/errors";
import { formatUserGender, isUserGender } from "@/lib/constants/user-gender";

function normalizeCategory(categoryLabel: string | null | undefined): "male" | "female" | "mix" | null {
  if (!categoryLabel?.trim()) return null;
  const lower = categoryLabel.trim().toLowerCase();
  if (lower === "male") return "male";
  if (lower === "female") return "female";
  if (lower === "mix" || lower === "mixed") return "mix";
  return null;
}

export async function assertUserEligibleForTournamentCategory(
  userId: string,
  categoryLabel: string | null | undefined,
): Promise<void> {
  const category = normalizeCategory(categoryLabel);
  if (!category || category === "mix") return;

  const [row] = await getDb()
    .select({ gender: user.gender })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  const gender = row?.gender;
  if (!gender || !isUserGender(gender)) {
    throw new AppError(
      "Please set your gender in profile settings before registering for category-specific tournaments.",
      { code: "VALIDATION_ERROR", statusCode: 422 },
    );
  }

  if (gender !== category) {
    const label = formatUserGender(category) ?? categoryLabel ?? "this category";
    throw new AppError(`This tournament is limited to ${label} players based on your profile gender.`, {
      code: "FORBIDDEN",
      statusCode: 403,
    });
  }
}
