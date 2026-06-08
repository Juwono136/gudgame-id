import "server-only";
import { eq, and, ne, isNotNull } from "drizzle-orm";
import { getDb } from "@/db/client";
import { user } from "@/db/schema";
import { normalizeNicknameInput } from "@/lib/auth/nickname-rules";

export {
  getNicknameFormatError,
  isValidNicknameFormat,
  NICKNAME_FORMAT_MESSAGE,
  NICKNAME_PATTERN,
} from "@/lib/auth/nickname-rules";

export function normalizeNickname(value: string | undefined | null): string | null {
  return normalizeNicknameInput(value);
}

export async function isNicknameAvailable(
  nickname: string,
  excludeUserId?: string,
): Promise<boolean> {
  const normalized = normalizeNickname(nickname);
  if (!normalized) return true;

  const db = getDb();
  const conditions = [
    eq(user.nickname, normalized),
    isNotNull(user.nickname),
  ];

  if (excludeUserId) {
    conditions.push(ne(user.id, excludeUserId));
  }

  const existing = await db
    .select({ id: user.id })
    .from(user)
    .where(and(...conditions))
    .limit(1);

  return existing.length === 0;
}
