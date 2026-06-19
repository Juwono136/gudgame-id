import { AppError } from "@/lib/errors";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type EntityUuid = string;

export function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

export function parseUuidParam(value: string, label = "id"): EntityUuid {
  const trimmed = value.trim();
  if (!isUuid(trimmed)) {
    throw new AppError(`Invalid ${label}`, {
      code: "VALIDATION_ERROR",
      statusCode: 422,
    });
  }
  return trimmed;
}

/** Accept UUID strings; reject legacy integer ids in URLs. */
export function parseEntityIdParam(value: string, label = "id"): EntityUuid {
  return parseUuidParam(value, label);
}
