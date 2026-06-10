import { z } from "zod";

const serverSchema = z
  .object({
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    DATABASE_URL: z
      .string()
      .min(1, "DATABASE_URL is required")
      .refine(
        (v) => v.startsWith("postgres://") || v.startsWith("postgresql://"),
        "DATABASE_URL must be a PostgreSQL connection string",
      ),
    REDIS_URL: z.string().min(1, "REDIS_URL is required"),
    BETTER_AUTH_SECRET: z.string().min(32).optional(),
    BETTER_AUTH_URL: z.string().url().optional(),
    AUTH_LOCKOUT_ENABLED: z
      .enum(["true", "false"])
      .optional()
      .transform((v) => v === "true"),
    STORAGE_ENDPOINT: z.string().url().optional(),
    STORAGE_BUCKET: z.string().min(1).default("court-pedia"),
    USERNAME_STORAGE: z.string().optional(),
    PASSWORD_STORAGE: z.string().optional(),
    STORAGE_REGION: z.string().default("us-east-1"),
    STORAGE_AUTH_MODE: z.enum(["nginx-basic", "s3"]).default("nginx-basic"),
    HEALTH_CHECK_TOKEN: z.string().min(16).optional(),
    LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).optional(),
    GOOGLE_MAPS_API_KEY: z.string().min(1).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.NODE_ENV !== "production") return;

    if (!data.BETTER_AUTH_SECRET) {
      ctx.addIssue({
        code: "custom",
        path: ["BETTER_AUTH_SECRET"],
        message: "BETTER_AUTH_SECRET (min 32 chars) is required in production",
      });
    }

    if (!data.BETTER_AUTH_URL) {
      ctx.addIssue({
        code: "custom",
        path: ["BETTER_AUTH_URL"],
        message: "BETTER_AUTH_URL is required in production",
      });
    }

    const needsStorageCreds =
      data.STORAGE_AUTH_MODE === "nginx-basic" || data.STORAGE_AUTH_MODE === "s3";

    if (needsStorageCreds && (!data.USERNAME_STORAGE || !data.PASSWORD_STORAGE)) {
      ctx.addIssue({
        code: "custom",
        path: ["USERNAME_STORAGE"],
        message:
          "USERNAME_STORAGE and PASSWORD_STORAGE are required in production",
      });
    }

    if (
      data.STORAGE_ENDPOINT?.includes("127.0.0.1") ||
      data.STORAGE_ENDPOINT?.includes("localhost")
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["STORAGE_ENDPOINT"],
        message:
          "STORAGE_ENDPOINT must not use localhost in production (use internal GCP endpoint)",
      });
    }
  });

export type ServerEnv = z.infer<typeof serverSchema>;

function formatZodError(error: z.ZodError): string {
  return error.issues
    .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
    .join("\n");
}

let cachedServerEnv: ServerEnv | null = null;

function parseServerEnv(): ServerEnv {
  const storageEndpoint =
    process.env.STORAGE_ENDPOINT ??
    process.env.NEXT_PUBLIC_STORAGE_URL ??
    "http://127.0.0.1:8333";

  const authMode = process.env.STORAGE_AUTH_MODE?.toLowerCase();

  const parsed = serverSchema.safeParse({
    ...process.env,
    STORAGE_ENDPOINT: storageEndpoint,
    STORAGE_AUTH_MODE: authMode === "s3" ? "s3" : "nginx-basic",
  });

  if (!parsed.success) {
    throw new Error(
      `[env] Invalid server environment:\n${formatZodError(parsed.error)}`,
    );
  }

  return parsed.data;
}

/** Validated server-side environment (throws on invalid config). */
export function getServerEnv(): ServerEnv {
  if (!cachedServerEnv) {
    cachedServerEnv = parseServerEnv();
  }
  return cachedServerEnv;
}

/** Non-throwing check for startup scripts and health diagnostics. */
export function tryGetServerEnv():
  | { ok: true; data: ServerEnv }
  | { ok: false; error: string } {
  try {
    return { ok: true, data: getServerEnv() };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: message };
  }
}

/** Called on server boot (instrumentation) — validates production constraints early. */
export function assertProductionEnv(): void {
  if (process.env.NODE_ENV !== "production") return;
  getServerEnv();
}
