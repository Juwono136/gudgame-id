import { getServerEnv } from "@/lib/config/env.server";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import {
  bucketObjectPath,
  buildBasicAuthHeader,
  getNginxBasicCredentials,
  getStorageBaseUrl,
} from "./auth";

const log = logger.child({ module: "storage-filer" });

const REQUEST_TIMEOUT_MS = 15_000;

async function storageFetch(
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const { username, password } = getNginxBasicCredentials();
  const url = `${getStorageBaseUrl()}${path}`;

  return fetch(url, {
    ...init,
    headers: {
      Authorization: buildBasicAuthHeader(username, password),
      ...init?.headers,
    },
    signal: init?.signal ?? AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
}

export async function pingStorageFiler(): Promise<
  { ok: true; bucket: string } | { ok: false; error: string }
> {
  const env = getServerEnv();

  try {
    const root = await storageFetch("/");
    const rootBody = await root.text();

    if (!root.ok) {
      return {
        ok: false,
        error: `Gateway returned HTTP ${root.status} (check nginx basic auth credentials)`,
      };
    }

    if (!rootBody.includes("SeaweedFS")) {
      return {
        ok: false,
        error: "Endpoint responded but is not a SeaweedFS filer (unexpected body)",
      };
    }

    const probeKey = `.infra-probe-${Date.now()}.txt`;
    const probePath = bucketObjectPath(env.STORAGE_BUCKET, probeKey);
    const probe = await storageFetch(probePath, {
      method: "PUT",
      headers: { "Content-Type": "text/plain" },
      body: "ok",
    });

    if (!probe.ok) {
      const detail = await probe.text().catch(() => "");
      return {
        ok: false,
        error: `Bucket write probe failed (HTTP ${probe.status})${detail ? `: ${detail.slice(0, 120)}` : ""}`,
      };
    }

    await storageFetch(probePath, { method: "DELETE" }).catch(() => {
      log.debug("Probe cleanup skipped", { key: probeKey });
    });

    return { ok: true, bucket: env.STORAGE_BUCKET };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log.warn("Filer storage ping failed", { error: message });
    return { ok: false, error: message };
  }
}

export async function ensureStorageBucketFiler(): Promise<void> {
  const env = getServerEnv();
  const probePath = bucketObjectPath(env.STORAGE_BUCKET, ".bucket-ready");

  const res = await storageFetch(probePath, {
    method: "PUT",
    headers: { "Content-Type": "text/plain" },
    body: "1",
  });

  if (!res.ok) {
    throw new AppError("Failed to initialize storage bucket via filer API", {
      code: "STORAGE_ERROR",
      statusCode: 502,
      context: { bucket: env.STORAGE_BUCKET, status: res.status },
    });
  }

  log.debug("Storage bucket ready via filer", { bucket: env.STORAGE_BUCKET });
}

export async function uploadObjectFiler(params: {
  key: string;
  body: Buffer | Uint8Array | string;
  contentType: string;
}): Promise<{ key: string; bucket: string }> {
  const env = getServerEnv();
  const path = bucketObjectPath(env.STORAGE_BUCKET, params.key);

  const res = await storageFetch(path, {
    method: "PUT",
    headers: { "Content-Type": params.contentType },
    body:
      typeof params.body === "string"
        ? params.body
        : new Uint8Array(params.body),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new AppError("Failed to upload object via filer API", {
      code: "STORAGE_ERROR",
      statusCode: 502,
      context: {
        key: params.key,
        status: res.status,
        detail: detail.slice(0, 200),
      },
    });
  }

  return { key: params.key, bucket: env.STORAGE_BUCKET };
}

export async function getObjectFiler(
  key: string,
): Promise<{ body: Uint8Array; contentType: string } | null> {
  const env = getServerEnv();
  const path = bucketObjectPath(env.STORAGE_BUCKET, key);

  const res = await storageFetch(path, { method: "GET" });

  if (res.status === 404) return null;

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new AppError("Failed to read object via filer API", {
      code: "STORAGE_ERROR",
      statusCode: 502,
      context: {
        key,
        status: res.status,
        detail: detail.slice(0, 200),
      },
    });
  }

  const contentType =
    res.headers.get("content-type")?.split(";")[0]?.trim() ??
    "application/octet-stream";

  return {
    body: new Uint8Array(await res.arrayBuffer()),
    contentType,
  };
}

export function getPublicObjectUrlFiler(key: string): string {
  const env = getServerEnv();
  const publicBase = (
    process.env.NEXT_PUBLIC_STORAGE_URL ?? getStorageBaseUrl()
  ).replace(/\/$/, "");
  return `${publicBase}${bucketObjectPath(env.STORAGE_BUCKET, key)}`;
}
