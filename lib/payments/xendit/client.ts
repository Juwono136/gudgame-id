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

type XenditErrorBody = {
  message?: string;
  error_code?: string;
  errors?: { message?: string }[];
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
    const detail =
      json.message ??
      json.errors?.[0]?.message ??
      json.error_code ??
      `Xendit ${operation} failed`;
    log.error(`Xendit ${operation} failed`, {
      status: res.status,
      path,
      error: detail,
      errorCode: json.error_code,
    });
    throw new AppError(detail, {
      code: "PAYMENT_GATEWAY_ERROR",
      statusCode: 502,
      context: { operation, status: res.status, errorCode: json.error_code },
    });
  }

  return json;
}
