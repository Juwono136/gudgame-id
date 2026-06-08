import { getServerEnv } from "@/lib/config/env.server";

export type StorageAuthMode = "nginx-basic" | "s3";

export function getStorageAuthMode(): StorageAuthMode {
  const mode = process.env.STORAGE_AUTH_MODE?.toLowerCase();
  if (mode === "s3") return "s3";
  return "nginx-basic";
}

export function getNginxBasicCredentials(): { username: string; password: string } {
  const env = getServerEnv();
  const username = env.USERNAME_STORAGE;
  const password = env.PASSWORD_STORAGE;

  if (!username || !password) {
    throw new Error(
      "USERNAME_STORAGE and PASSWORD_STORAGE are required for nginx-basic storage auth",
    );
  }

  return { username, password };
}

export function buildBasicAuthHeader(username: string, password: string): string {
  return `Basic ${Buffer.from(`${username}:${password}`, "utf8").toString("base64")}`;
}

export function getStorageBaseUrl(): string {
  const env = getServerEnv();
  return (env.STORAGE_ENDPOINT ?? "http://127.0.0.1:8333").replace(/\/$/, "");
}

export function bucketObjectPath(bucket: string, key: string): string {
  const normalizedKey = key.replace(/^\/+/, "");
  return `/buckets/${bucket}/${normalizedKey}`;
}
