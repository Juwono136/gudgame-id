import { NextResponse } from "next/server";
import { AppError, isAppError, toAppError } from "@/lib/errors";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "api" });

export function jsonSuccess<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

export function jsonError(error: unknown, fallbackMessage = "Request failed") {
  const appError = isAppError(error) ? error : toAppError(error, fallbackMessage);

  if (!appError.isOperational || appError.statusCode >= 500) {
    log.error("API error", appError, { code: appError.code });
  }

  return NextResponse.json(appError.toJSON(), { status: appError.statusCode });
}

export function assertFound<T>(
  value: T | null | undefined,
  message = "Resource not found",
): asserts value is T {
  if (value == null) {
    throw new AppError(message, { code: "NOT_FOUND", statusCode: 404 });
  }
}
