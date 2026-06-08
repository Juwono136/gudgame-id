type ApiErrorBody = {
  error?: string | { message?: string; code?: string } | unknown;
  message?: string;
  fieldErrors?: Record<string, string[]>;
};

export function extractApiErrorMessage(
  body: ApiErrorBody | null | undefined,
  fallback = "Request failed",
): string {
  if (!body) return fallback;
  if (typeof body.error === "string" && body.error.trim()) return body.error;
  if (
    body.error &&
    typeof body.error === "object" &&
    body.error !== null &&
    "message" in body.error &&
    typeof (body.error as { message?: string }).message === "string"
  ) {
    return (body.error as { message: string }).message;
  }
  if (body.message?.trim()) return body.message;
  return fallback;
}
