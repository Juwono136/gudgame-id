import { z } from "zod";
import { zodErrorToAppError } from "@/lib/validations/format-zod-error";

export type ErrorCode =
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "STORAGE_ERROR"
  | "DATABASE_ERROR"
  | "CACHE_ERROR"
  | "INTERNAL_ERROR"
  | "SERVICE_UNAVAILABLE"
  | "PAYMENT_NOT_CONFIGURED"
  | "HOST_PAYOUT_NOT_CONFIGURED"
  | "PAYMENT_GATEWAY_ERROR"
  | "INVALID_TOURNAMENT_TYPE"
  | "REGISTRATION_FAILED"
  | "TIE_REQUIRES_REMATCH";

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly statusCode: number;
  readonly isOperational: boolean;
  readonly context?: Record<string, unknown>;

  constructor(
    message: string,
    options: {
      code?: ErrorCode;
      statusCode?: number;
      isOperational?: boolean;
      cause?: unknown;
      context?: Record<string, unknown>;
    } = {},
  ) {
    super(message, { cause: options.cause });
    this.name = "AppError";
    this.code = options.code ?? "INTERNAL_ERROR";
    this.statusCode = options.statusCode ?? 500;
    this.isOperational = options.isOperational ?? true;
    this.context = options.context;
  }

  toJSON() {
    return {
      error: {
        code: this.code,
        message: this.message,
        ...(process.env.NODE_ENV !== "production" && this.context
          ? { context: this.context }
          : {}),
      },
    };
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

export function toAppError(error: unknown, fallbackMessage = "Unexpected error"): AppError {
  if (isAppError(error)) return error;
  if (error instanceof z.ZodError) return zodErrorToAppError(error);

  // Never leak driver/stack internals to clients in production.
  if (process.env.NODE_ENV === "production") {
    return new AppError(fallbackMessage, {
      cause: error,
      isOperational: false,
      code: "INTERNAL_ERROR",
      statusCode: 500,
    });
  }

  if (error instanceof Error) {
    return new AppError(error.message || fallbackMessage, {
      cause: error,
      isOperational: false,
    });
  }
  return new AppError(fallbackMessage, { cause: error, isOperational: false });
}
