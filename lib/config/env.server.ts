import { z } from "zod";
import {
  isBuildTimeEnvValidationSkipped,
} from "@/lib/config/build-time";
import {
  isXenditDevelopmentKey,
  isXenditProductionKey,
  isXenditStagingMode,
} from "@/lib/config/xendit-env";

export { isBuildTimeEnvValidationSkipped };

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
    STORAGE_BUCKET: z.string().min(1).default("gudgame"),
    USERNAME_STORAGE: z.string().optional(),
    PASSWORD_STORAGE: z.string().optional(),
    STORAGE_REGION: z.string().default("us-east-1"),
    STORAGE_AUTH_MODE: z.enum(["nginx-basic", "s3"]).default("nginx-basic"),
    HEALTH_CHECK_TOKEN: z.string().min(16).optional(),
    CRON_SECRET: z.string().min(16).optional(),
    LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).optional(),
    NOMINATIM_USER_AGENT: z.string().min(1).optional(),
    GOOGLE_MAPS_API_KEY: z.string().min(1).optional(),
    XENDIT_SECRET_KEY: z.string().min(1).optional(),
    XENDIT_WEBHOOK_TOKEN: z.string().min(16).optional(),
    XENDIT_XENPLATFORM_ENABLED: z
      .enum(["true", "false"])
      .optional()
      .transform((v) => v !== "false"),
    SMTP_HOST: z.string().optional(),
    SMTP_PORT: z.string().optional(),
    SMTP_USER: z.string().optional(),
    SMTP_PASS: z.string().optional(),
    /** Public From address (e.g. noreply@gudgame.id). Defaults in lib/email/config. */
    SMTP_FROM: z.string().email().optional(),
    EMAIL_FROM: z.string().email().optional(),
    SMTP_REPLY_TO: z.string().email().optional(),
    EMAIL_REPLY_TO: z.string().email().optional(),
    SMTP_FROM_NAME: z.string().optional(),
    EMAIL_FROM_NAME: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.NODE_ENV !== "production") return;
    if (isBuildTimeEnvValidationSkipped()) return;

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

    if (!data.HEALTH_CHECK_TOKEN) {
      ctx.addIssue({
        code: "custom",
        path: ["HEALTH_CHECK_TOKEN"],
        message: "HEALTH_CHECK_TOKEN (min 16 chars) is required in production",
      });
    }

    if (!data.CRON_SECRET) {
      ctx.addIssue({
        code: "custom",
        path: ["CRON_SECRET"],
        message:
          "CRON_SECRET (min 16 chars) is required in production for scheduled host bank payouts",
      });
    }

    const xenditKey = data.XENDIT_SECRET_KEY?.trim();
    const xenditStaging = isXenditStagingMode();

    if (!xenditKey) {
      ctx.addIssue({
        code: "custom",
        path: ["XENDIT_SECRET_KEY"],
        message: "XENDIT_SECRET_KEY is required in production",
      });
    } else if (xenditStaging) {
      if (!isXenditDevelopmentKey(xenditKey)) {
        ctx.addIssue({
          code: "custom",
          path: ["XENDIT_SECRET_KEY"],
          message:
            "XENDIT_STAGING_MODE=true requires a Test key (xnd_development_…). Remove staging mode for live payments.",
        });
      }
    } else if (!isXenditProductionKey(xenditKey)) {
      ctx.addIssue({
        code: "custom",
        path: ["XENDIT_SECRET_KEY"],
        message:
          "XENDIT_SECRET_KEY must be a production key (xnd_production_…), or set XENDIT_STAGING_MODE=true for Test keys on a public deploy",
      });
    }

    if (!data.XENDIT_WEBHOOK_TOKEN) {
      ctx.addIssue({
        code: "custom",
        path: ["XENDIT_WEBHOOK_TOKEN"],
        message: "XENDIT_WEBHOOK_TOKEN is required in production",
      });
    }

    const allowLocalStorage = process.env.STORAGE_ALLOW_LOCALHOST === "true";
    if (
      !allowLocalStorage &&
      (data.STORAGE_ENDPOINT?.includes("127.0.0.1") ||
        data.STORAGE_ENDPOINT?.includes("localhost"))
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["STORAGE_ENDPOINT"],
        message:
          "STORAGE_ENDPOINT must not use localhost in production unless STORAGE_ALLOW_LOCALHOST=true (single-VM deploy)",
      });
    }

    if (!data.SMTP_USER || !data.SMTP_PASS) {
      ctx.addIssue({
        code: "custom",
        path: ["SMTP_USER"],
        message: "SMTP_USER and SMTP_PASS are required in production email delivery",
      });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
    if (!appUrl?.startsWith("https://")) {
      ctx.addIssue({
        code: "custom",
        path: ["BETTER_AUTH_URL"],
        message:
          "NEXT_PUBLIC_APP_URL and BETTER_AUTH_URL must use HTTPS in production",
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
  if (isBuildTimeEnvValidationSkipped()) return;
  getServerEnv();
}
