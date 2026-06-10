type ApiErrorBody = {
  error?: string | { message?: string; code?: string };
  message?: string;
};

/** Normalize API error JSON into a user-facing string. */
export function extractApiErrorMessage(
  body: ApiErrorBody | null | undefined,
  fallback = "Request failed",
): string {
  if (!body) return fallback;

  const err = body.error;
  if (typeof err === "string" && err.trim()) return err;
  if (err && typeof err === "object" && typeof err.message === "string" && err.message.trim()) {
    return err.message;
  }
  if (typeof body.message === "string" && body.message.trim()) return body.message;

  return fallback;
}
