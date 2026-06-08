import { NextResponse } from "next/server";
import { runHealthChecks } from "@/lib/health";
import { logger } from "@/lib/logger";
import { isHealthCheckAuthorized } from "@/lib/server/health-access";

const log = logger.child({ route: "/api/health" });

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!isHealthCheckAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const skipStorage = searchParams.get("skipStorage") === "1";

  try {
    const report = await runHealthChecks({ skipStorage });
    const httpStatus =
      report.status === "healthy"
        ? 200
        : report.status === "degraded"
          ? 207
          : 503;

    if (report.status !== "healthy") {
      log.warn("Health check degraded", {
        status: report.status,
        services: report.services,
      });
    }

    return NextResponse.json(report, {
      status: httpStatus,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch (err) {
    log.error("Health check failed", err);
    return NextResponse.json(
      {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        message:
          process.env.NODE_ENV === "production"
            ? "Health check failed"
            : err instanceof Error
              ? err.message
              : "Health check failed",
      },
      { status: 503 },
    );
  }
}
