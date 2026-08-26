import "server-only";

import { hashPassword, verifyPassword } from "better-auth/crypto";

export async function hashPartnerPassword(password: string): Promise<string> {
  return hashPassword(password);
}

export async function verifyPartnerPassword(
  password: string,
  passwordHash: string,
): Promise<boolean> {
  return verifyPassword({ hash: passwordHash, password });
}
