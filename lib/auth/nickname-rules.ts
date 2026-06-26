/** Shared nickname rules (client + server safe — no server-only imports) */

export const NICKNAME_MIN_LENGTH = 3;
export const NICKNAME_MAX_LENGTH = 50;

/** Letters, numbers, underscore, hyphen — no spaces */
export const NICKNAME_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9_-]{2,49}$/;

export const NICKNAME_FORMAT_MESSAGE =
  "Nickname must be 3–50 characters: letters, numbers, _ or - only (no spaces)";

export function getNicknameFormatError(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (/\s/.test(value)) {
    return "Nickname cannot contain spaces";
  }

  if (trimmed.length < NICKNAME_MIN_LENGTH || trimmed.length > NICKNAME_MAX_LENGTH) {
    return NICKNAME_FORMAT_MESSAGE;
  }

  if (!NICKNAME_PATTERN.test(trimmed)) {
    return NICKNAME_FORMAT_MESSAGE;
  }

  return null;
}

export function isValidNicknameFormat(value: string): boolean {
  return getNicknameFormatError(value) === null;
}

export function normalizeNicknameInput(value: string | undefined | null): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  if (getNicknameFormatError(trimmed)) return null;
  return trimmed.toLowerCase();
}
