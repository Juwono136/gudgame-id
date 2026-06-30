import "server-only";

import { AppError } from "@/lib/errors";

/** Ensure admin form submissions target the active sport context. */
export function assertAdminFormSportScope(formData: FormData, ctxSportSlug: string): void {
  const submitted = formData.get("sportSlug");
  if (typeof submitted !== "string" || !submitted.trim()) return;

  if (submitted.trim() !== ctxSportSlug) {
    throw new AppError(
      `This form targets ${submitted}, but your admin session is scoped to ${ctxSportSlug}. Switch sport context and try again.`,
      { code: "VALIDATION_ERROR", statusCode: 400 },
    );
  }
}
