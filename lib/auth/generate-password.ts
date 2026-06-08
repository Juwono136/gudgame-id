import { randomBytes } from "crypto";

const UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const LOWER = "abcdefghjkmnpqrstuvwxyz";
const DIGITS = "23456789";
const SYMBOLS = "!@#$%&*";
const ALL = UPPER + LOWER + DIGITS + SYMBOLS;

function pickChar(pool: string, byte: number): string {
  return pool[byte % pool.length]!;
}

/** Cryptographically secure temporary password (meets app password rules) */
export function generateSecureTemporaryPassword(length = 16): string {
  const bytes = randomBytes(length + 4);
  const required = [
    pickChar(UPPER, bytes[0]!),
    pickChar(LOWER, bytes[1]!),
    pickChar(DIGITS, bytes[2]!),
    pickChar(SYMBOLS, bytes[3]!),
  ];
  const rest: string[] = [];
  for (let i = 0; i < length - required.length; i++) {
    rest.push(pickChar(ALL, bytes[4 + i]!));
  }
  const combined = [...required, ...rest];
  for (let i = combined.length - 1; i > 0; i--) {
    const j = bytes[20 + (i % 12)]! % (i + 1);
    [combined[i], combined[j]] = [combined[j]!, combined[i]!];
  }
  return combined.join("");
}
