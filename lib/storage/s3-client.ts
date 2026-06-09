import {
  CreateBucketCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  ListBucketsCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getServerEnv } from "@/lib/config/env.server";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { bucketObjectPath, getStorageBaseUrl } from "./auth";

const log = logger.child({ module: "storage-s3" });

const S3_GLOBAL_KEY = "__courtPediaS3" as const;

type StorageGlobal = {
  [S3_GLOBAL_KEY]?: S3Client;
};

const globalForStorage = globalThis as unknown as StorageGlobal;

function buildS3Client(): S3Client {
  const env = getServerEnv();
  const accessKeyId = env.USERNAME_STORAGE;
  const secretAccessKey = env.PASSWORD_STORAGE;

  if (!accessKeyId || !secretAccessKey) {
    log.warn("S3 credentials not configured");
  }

  return new S3Client({
    region: env.STORAGE_REGION,
    endpoint: env.STORAGE_ENDPOINT,
    forcePathStyle: true,
    credentials:
      accessKeyId && secretAccessKey
        ? { accessKeyId, secretAccessKey }
        : undefined,
  });
}

export function getStorageClient(): S3Client {
  if (!globalForStorage[S3_GLOBAL_KEY]) {
    globalForStorage[S3_GLOBAL_KEY] = buildS3Client();
  }
  return globalForStorage[S3_GLOBAL_KEY];
}

export async function pingStorageS3(): Promise<
  { ok: true; bucket: string } | { ok: false; error: string }
> {
  const env = getServerEnv();

  if (!env.USERNAME_STORAGE || !env.PASSWORD_STORAGE) {
    return {
      ok: false,
      error: "USERNAME_STORAGE and PASSWORD_STORAGE are required for S3 mode",
    };
  }

  try {
    const client = getStorageClient();
    await client.send(new ListBucketsCommand({}));
    await client.send(new HeadBucketCommand({ Bucket: env.STORAGE_BUCKET }));
    return { ok: true, bucket: env.STORAGE_BUCKET };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log.warn("S3 storage ping failed", { error: message });
    return { ok: false, error: message };
  }
}

export async function ensureStorageBucketS3(): Promise<void> {
  const env = getServerEnv();
  const client = getStorageClient();

  try {
    await client.send(new HeadBucketCommand({ Bucket: env.STORAGE_BUCKET }));
  } catch {
    log.info("Creating storage bucket via S3 API", { bucket: env.STORAGE_BUCKET });
    await client.send(new CreateBucketCommand({ Bucket: env.STORAGE_BUCKET }));
  }
}

export async function uploadObjectS3(params: {
  key: string;
  body: Buffer | Uint8Array | string;
  contentType: string;
}): Promise<{ key: string; bucket: string }> {
  const env = getServerEnv();
  const client = getStorageClient();

  try {
    await client.send(
      new PutObjectCommand({
        Bucket: env.STORAGE_BUCKET,
        Key: params.key,
        Body: params.body,
        ContentType: params.contentType,
      }),
    );
    return { key: params.key, bucket: env.STORAGE_BUCKET };
  } catch (err) {
    throw new AppError("Failed to upload object to S3", {
      code: "STORAGE_ERROR",
      statusCode: 502,
      cause: err,
      context: { key: params.key },
    });
  }
}

export async function deleteObjectS3(key: string): Promise<boolean> {
  const env = getServerEnv();
  const client = getStorageClient();

  try {
    await client.send(
      new DeleteObjectCommand({
        Bucket: env.STORAGE_BUCKET,
        Key: key,
      }),
    );
    return true;
  } catch (err) {
    log.warn("S3 object delete failed", {
      key,
      error: err instanceof Error ? err.message : String(err),
    });
    return false;
  }
}

export async function getObjectS3(
  key: string,
): Promise<{ body: Uint8Array; contentType: string } | null> {
  const env = getServerEnv();
  const client = getStorageClient();

  try {
    const result = await client.send(
      new GetObjectCommand({
        Bucket: env.STORAGE_BUCKET,
        Key: key,
      }),
    );

    if (!result.Body) return null;

    const bytes = await result.Body.transformToByteArray();

    return {
      body: bytes,
      contentType: result.ContentType ?? "application/octet-stream",
    };
  } catch (err) {
    const code =
      err && typeof err === "object" && "Code" in err
        ? String((err as { Code?: string }).Code)
        : err && typeof err === "object" && "name" in err
          ? String((err as { name?: string }).name)
          : "";
    if (code === "NoSuchKey" || code === "NotFound") return null;
    throw new AppError("Failed to read object from S3", {
      code: "STORAGE_ERROR",
      statusCode: 502,
      cause: err,
      context: { key },
    });
  }
}

export function getPublicObjectUrlS3(key: string): string {
  const env = getServerEnv();
  const publicBase = (
    process.env.NEXT_PUBLIC_STORAGE_URL ?? getStorageBaseUrl()
  ).replace(/\/$/, "");
  return `${publicBase}${bucketObjectPath(env.STORAGE_BUCKET, key)}`;
}
