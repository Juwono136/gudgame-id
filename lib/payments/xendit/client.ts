import "server-only";

import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "xendit-client" });

export const XENDIT_API_BASE = "https://api.xendit.co";

export type XenditRequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  path: string;
  body?: unknown;
  headers?: Record<string, string>;
  /** Human-readable context for error logs */
  operation: string;
};

export function getXenditSecretKey(): string {
  const key = process.env.XENDIT_SECRET_KEY?.trim();
  if (!key) {
    throw new AppError("Xendit is not configured. Set XENDIT_SECRET_KEY in .env", {
      code: "PAYMENT_NOT_CONFIGURED",
      statusCode: 503,
    });
  }
  return key;
}

export function xenditAuthHeader(): string {
  return `Basic ${Buffer.from(`${getXenditSecretKey()}:`).toString("base64")}`;
}

export function isXenditConfigured(): boolean {
  return Boolean(process.env.XENDIT_SECRET_KEY?.trim());
}

export function isXenditDevelopmentKey(key: string | undefined): boolean {
  return Boolean(key?.trim().startsWith("xnd_development_"));
}

export function isXenditProductionKey(key: string | undefined): boolean {
  return Boolean(key?.trim().startsWith("xnd_production_"));
}

type XenditErrorBody = {
  message?: string;
  error_code?: string;
  errors?: Array<string | { message?: string; path?: string }>;
};

export async function xenditRequest<T>(options: XenditRequestOptions): Promise<T> {
  const { method = "POST", path, body, headers = {}, operation } = options;

  const res = await fetch(`${XENDIT_API_BASE}${path}`, {
    method,
    headers: {
      Authorization: xenditAuthHeader(),
      "Content-Type": "application/json",
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const json = (await res.json()) as T & XenditErrorBody;

  if (!res.ok) {
    const errorDetails = Array.isArray(json.errors)
      ? json.errors.map((e) => (typeof e === "string" ? e : e.message ?? JSON.stringify(e))).join("; ")
      : undefined;
    const detail =
      errorDetails ||
      json.message ||
      (typeof json.errors?.[0] === "object" ? json.errors[0]?.message : undefined) ||
      json.error_code ||
      `Xendit ${operation} failed`;
    log.error(`Xendit ${operation} failed`, {
      status: res.status,
      path,
      error: detail,
      errorCode: json.error_code,
      errors: json.errors,
    });
    throw new AppError(detail, {
      code: "PAYMENT_GATEWAY_ERROR",
      statusCode: 502,
      context: { operation, status: res.status, errorCode: json.error_code },
    });
  }

  return json;
}
