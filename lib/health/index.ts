import { sql } from "drizzle-orm";
import { getDb, pingDatabase } from "@/db";
import { tryGetServerEnv } from "@/lib/config/env.server";
import { pingRedis } from "@/lib/redis";
import { pingStorage } from "@/lib/storage";

export type ServiceStatus = "healthy" | "degraded" | "unhealthy";

export type ServiceCheck = {
  name: string;
  status: ServiceStatus;
  latencyMs?: number;
  message?: string;
};

export type HealthReport = {
  status: ServiceStatus;
  timestamp: string;
  version: string;
  environment: string;
  services: ServiceCheck[];
};

const APP_VERSION = process.env.npm_package_version ?? "0.1.0";

async function timedCheck(
  name: string,
  fn: () => Promise<{ ok: boolean; message?: string }>,
): Promise<ServiceCheck> {
  const start = performance.now();
  try {
    const result = await fn();
    const latencyMs = Math.round(performance.now() - start);
    return {
      name,
      status: result.ok ? "healthy" : "unhealthy",
      latencyMs,
      message: result.message,
    };
  } catch (err) {
    const latencyMs = Math.round(performance.now() - start);
    const message = err instanceof Error ? err.message : String(err);
    return { name, status: "unhealthy", latencyMs, message };
  }
}

function aggregateStatus(services: ServiceCheck[]): ServiceStatus {
  if (services.every((s) => s.status === "healthy")) return "healthy";
  if (services.some((s) => s.status === "healthy")) return "degraded";
  return "unhealthy";
}

export async function runHealthChecks(options?: {
  skipStorage?: boolean;
}): Promise<HealthReport> {
  const envResult = tryGetServerEnv();
  const environment = envResult.ok
    ? envResult.data.NODE_ENV
    : (process.env.NODE_ENV ?? "unknown");

  const checks: ServiceCheck[] = [];

  checks.push(
    await timedCheck("environment", async () => ({
      ok: envResult.ok,
      message: envResult.ok ? undefined : envResult.error,
    })),
  );

  checks.push(
    await timedCheck("postgresql", async () => {
      const result = await pingDatabase();
      return result.ok
        ? { ok: true }
        : { ok: false, message: result.error };
    }),
  );

  checks.push(
    await timedCheck("redis", async () => {
      const result = await pingRedis();
      return result.ok ? { ok: true } : { ok: false, message: result.error };
    }),
  );

  if (!options?.skipStorage) {
    checks.push(
      await timedCheck("seaweedfs", async () => {
        const result = await pingStorage();
        if (result.ok) {
          return { ok: true, message: `bucket: ${result.bucket}` };
        }
        return { ok: false, message: result.error };
      }),
    );
  }

  // Optional: verify Drizzle can execute a simple query when DB is up
  const pgCheck = checks.find((c) => c.name === "postgresql");
  if (pgCheck?.status === "healthy") {
    checks.push(
      await timedCheck("drizzle", async () => {
        try {
          const db = getDb();
          await db.execute(sql`SELECT 1 AS ok`);
          return { ok: true };
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          return { ok: false, message };
        }
      }),
    );
  }

  const operationalChecks = checks.filter((c) => c.name !== "environment");
  const status = !envResult.ok
    ? "unhealthy"
    : aggregateStatus(operationalChecks);

  return {
    status,
    timestamp: new Date().toISOString(),
    version: APP_VERSION,
    environment,
    services: checks,
  };
}
