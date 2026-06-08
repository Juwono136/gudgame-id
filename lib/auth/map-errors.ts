export const ACCOUNT_INACTIVE_MESSAGE =
  "This account has been deactivated. Contact an administrator if you need access restored.";

export function mapAuthError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("verify") || lower.includes("verification")) {
    return "Please verify your email before signing in. Check your inbox for the confirmation link.";
  }
  if (lower.includes("deactivat") || lower.includes("inactive")) {
    return ACCOUNT_INACTIVE_MESSAGE;
  }
  if (lower.includes("invalid") || lower.includes("credential")) {
    return "Invalid email or password. Please try again.";
  }
  if (lower.includes("too many") || lower.includes("rate")) {
    return "Too many attempts. Please wait a moment and try again.";
  }
  return message;
}

export function mapPasswordResetRequestError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("disabled") || lower.includes("not enabled")) {
    return "Password reset is temporarily unavailable. Please try again later.";
  }
  if (lower.includes("too many") || lower.includes("rate")) {
    return "Too many requests. Please wait a few minutes before trying again.";
  }
  return "We could not process your request. Please try again.";
}

export function mapPasswordResetError(message: string): string {
  const lower = message.toLowerCase();
  if (
    lower.includes("invalid") &&
    (lower.includes("token") || lower.includes("expired"))
  ) {
    return "This reset link is invalid or has expired. Request a new one from the forgot password page.";
  }
  if (lower.includes("password") && lower.includes("short")) {
    return "Password must be at least 8 characters.";
  }
  if (lower.includes("password") && lower.includes("long")) {
    return "Password is too long.";
  }
  if (lower.includes("too many") || lower.includes("rate")) {
    return "Too many attempts. Please wait and try again.";
  }
  return message || "Could not reset your password. Please try again.";
}
