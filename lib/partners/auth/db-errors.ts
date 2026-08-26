/** Shared Postgres unique-violation detection for partner auth race handling. */
export function isPostgresUniqueViolation(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as {
    code?: string;
    cause?: { code?: string };
    message?: string;
  };
  if (e.code === "23505") return true;
  if (e.cause?.code === "23505") return true;
  const message = typeof e.message === "string" ? e.message.toLowerCase() : "";
  return message.includes("unique") && message.includes("constraint");
}
