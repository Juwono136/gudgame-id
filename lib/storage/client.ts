import { getStorageAuthMode } from "./auth";
import { getMediaProxyPath } from "./media-url";
import {
  deleteObjectFiler,
  ensureStorageBucketFiler,
  getObjectFiler,
  pingStorageFiler,
  uploadObjectFiler,
} from "./filer-client";
import {
  deleteObjectS3,
  ensureStorageBucketS3,
  getObjectS3,
  pingStorageS3,
  uploadObjectS3,
} from "./s3-client";

export { getStorageClient } from "./s3-client";

export async function pingStorage() {
  return getStorageAuthMode() === "s3"
    ? pingStorageS3()
    : pingStorageFiler();
}

export async function ensureStorageBucket() {
  return getStorageAuthMode() === "s3"
    ? ensureStorageBucketS3()
    : ensureStorageBucketFiler();
}

export async function uploadObject(params: {
  key: string;
  body: Buffer | Uint8Array | string;
  contentType: string;
}) {
  return getStorageAuthMode() === "s3"
    ? uploadObjectS3(params)
    : uploadObjectFiler(params);
}

/** Same-origin URL for browser display (avoids nginx basic-auth prompts). */
export function getPublicObjectUrl(key: string) {
  return getMediaProxyPath(key);
}

export async function getObject(params: { key: string }) {
  return getStorageAuthMode() === "s3"
    ? getObjectS3(params.key)
    : getObjectFiler(params.key);
}

export async function deleteObject(key: string): Promise<boolean> {
  return getStorageAuthMode() === "s3"
    ? deleteObjectS3(key)
    : deleteObjectFiler(key);
}
