/** Session lifetime — user must sign in again after this period of inactivity */
export const SESSION_EXPIRES_IN_SECONDS = 60 * 60 * 24 * 7; // 7 days

/** How often active sessions extend their expiry (sliding window) */
export const SESSION_UPDATE_AGE_SECONDS = 60 * 60 * 24; // 1 day

/** Email verification link validity */
export const EMAIL_VERIFICATION_EXPIRES_IN_SECONDS = 60 * 60 * 24; // 24 hours

/** Password reset link validity (Better Auth emailAndPassword.resetPasswordTokenExpiresIn) */
export const PASSWORD_RESET_TOKEN_EXPIRES_IN_SECONDS = 60 * 60; // 1 hour

export const EMAIL_LOGO_URL =
  "https://res.cloudinary.com/dz8dtz5ki/image/upload/v1783658332/logo-gud-game_m1us1n.png";
