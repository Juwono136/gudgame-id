import "server-only";

import { AppError } from "@/lib/errors";
import { timingSafeEqual } from "crypto";

export function verifyCronSecret(request: Request): void {
  const expected = process.env.CRON_SECRET?.trim();
  if (!expected) {
    throw new AppError("Cron jobs are not configured. Set CRON_SECRET.", {
      code: "SERVICE_UNAVAILABLE",
      statusCode: 503,
    });
  }

  const provided =
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim() ??
    request.headers.get("x-cron-secret")?.trim() ??
    "";

  if (!provided) {
    throw new AppError("Cron authentication required", {
      code: "UNAUTHORIZED",
      statusCode: 401,
    });
  }

  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new AppError("Invalid cron secret", { code: "UNAUTHORIZED", statusCode: 401 });
  }
}
