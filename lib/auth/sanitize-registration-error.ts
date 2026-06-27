/** User-safe registration error messages — safe for client and server; never expose SQL or internal details. */
export function sanitizeRegistrationErrorMessage(raw: unknown): string {
  const message = raw instanceof Error ? raw.message : String(raw ?? "");

  if (!message.trim()) {
    return "Registration failed. Please try again.";
  }

  const lower = message.toLowerCase();

  if (lower.includes("already") || lower.includes("duplicate") || lower.includes("unique")) {
    return "An account with this email may already exist. Try signing in or use forgot password.";
  }

  if (lower.includes("validation") || lower.includes("invalid")) {
    return "Please check your details and try again.";
  }

  if (
    lower.includes("failed query") ||
    lower.includes("insert into") ||
    lower.includes("user_role") ||
    lower.includes("syntax error") ||
    lower.includes("violates")
  ) {
    return "We couldn't finish setting up your account. Please try again in a moment.";
  }

  return "Registration failed. Please try again.";
}
