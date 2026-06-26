import "server-only";

import { AppError } from "@/lib/errors";

export const ILUMA_API_BASE = "https://api.iluma.ai";

export function getIlumaApiKey(): string {
  const key = process.env.ILUMA_API_KEY?.trim();
  if (!key) {
    throw new AppError("Iluma is not configured. Set ILUMA_API_KEY in .env", {
      code: "SERVICE_UNAVAILABLE",
      statusCode: 503,
    });
  }
  return key;
}

export function ilumaAuthHeader(): string {
  // Iluma uses Basic Auth: apiKey as username, empty password
  return `Basic ${Buffer.from(`${getIlumaApiKey()}:`).toString("base64")}`;
}

export async function ilumaRequest<T>(options: {
  method?: "GET" | "POST";
  path: string;
  body?: unknown;
  operation: string;
}): Promise<T> {
  const { method = "GET", path, body, operation } = options;
  const res = await fetch(`${ILUMA_API_BASE}${path}`, {
    method,
    headers: {
      Authorization: ilumaAuthHeader(),
      "Content-Type": "application/json",
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const json = (await res.json()) as T & { message?: string };
  if (!res.ok) {
    throw new AppError(json.message ?? `Iluma ${operation} failed`, {
      code: "SERVICE_UNAVAILABLE",
      statusCode: 502,
      context: { operation, status: res.status, path },
    });
  }
  return json;
}

