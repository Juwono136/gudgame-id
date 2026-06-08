import { NextResponse } from "next/server";
import { getNicknameFormatError } from "@/lib/auth/nickname-rules";
import { isNicknameAvailable, normalizeNickname } from "@/lib/auth/nickname";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const raw = searchParams.get("nickname") ?? "";

  if (!raw.trim()) {
    return NextResponse.json({ available: true });
  }

  const formatError = getNicknameFormatError(raw);
  if (formatError) {
    return NextResponse.json({
      available: false,
      message: formatError,
    });
  }

  const nickname = normalizeNickname(raw);
  if (!nickname) {
    return NextResponse.json({
      available: false,
      message: "Invalid nickname format",
    });
  }

  const available = await isNicknameAvailable(nickname);

  return NextResponse.json({
    available,
    message: available ? undefined : "This nickname is already taken",
  });
}
