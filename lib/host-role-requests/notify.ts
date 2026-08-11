import "server-only";

import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { user } from "@/db/schema/auth";
import { userRoleAssignments } from "@/db/schema/roles";
import { getBaseUrl } from "@/lib/auth/urls-server";
import { siteConfig } from "@/lib/config";
import { adminRoutes, authRoutes, dashboardRoutes } from "@/lib/constants/routes";
import { sendTemplatedEmailInBackground } from "@/lib/email/send";
import { logger } from "@/lib/logger";
import { createNotification, createNotifications } from "@/lib/notifications/service";

const log = logger.child({ module: "host-role-request-notify" });

async function listSuperAdminRecipients(): Promise<
  Array<{ id: string; email: string; name: string }>
> {
  const rows = await getDb()
    .select({
      id: user.id,
      email: user.email,
      name: user.name,
    })
    .from(userRoleAssignments)
    .innerJoin(user, eq(user.id, userRoleAssignments.userId))
    .where(eq(userRoleAssignments.role, "super_admin"));

  const byId = new Map<string, { id: string; email: string; name: string }>();
  for (const row of rows) {
    const email = row.email?.trim().toLowerCase();
    if (!email || !row.id) continue;
    if (!byId.has(row.id)) {
      byId.set(row.id, {
        id: row.id,
        email,
        name: row.name?.trim() || "Admin",
      });
    }
  }
  return [...byId.values()];
}

export async function notifyAdminsHostRoleRequestSubmitted(input: {
  requestId: string;
  requesterUserId: string;
  requesterName: string;
  requesterEmail: string;
  message: string;
}): Promise<void> {
  try {
    const admins = await listSuperAdminRecipients();
    if (admins.length === 0) {
      log.warn("No super_admin recipients for host role request", {
        requestId: input.requestId,
      });
      return;
    }

    const baseUrl = getBaseUrl();
    const reviewUrl = `${baseUrl}${adminRoutes.hostRequests}`;
    const messagePreview = input.message.trim() || "No message provided.";

    await createNotifications(
      admins.map((admin) => ({
        userId: admin.id,
        type: "host_role_request_submitted" as const,
        title: "New Host role request",
        body: `${input.requesterName} (${input.requesterEmail}) requested Host access.`,
        actionUrl: adminRoutes.hostRequests,
        metadata: {
          requestId: input.requestId,
          requesterUserId: input.requesterUserId,
        },
      })),
    );

    for (const admin of admins) {
      sendTemplatedEmailInBackground(
        {
          to: admin.email,
          template: "host-role-request-admin",
          data: {
            appName: siteConfig.name,
            adminName: admin.name,
            requesterName: input.requesterName,
            requesterEmail: input.requesterEmail,
            message: messagePreview,
            reviewUrl,
          },
        },
        { module: "host-role-request-notify" },
      );
    }
  } catch (error) {
    log.error("Failed to notify admins about host role request", {
      requestId: input.requestId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

export async function notifyUserHostRoleRequestApproved(input: {
  userId: string;
  email: string;
  userName: string;
}): Promise<void> {
  try {
    const baseUrl = getBaseUrl();
    const settingsUrl = `${baseUrl}${dashboardRoutes.settings}#roles`;
    const hostDashboardUrl = `${baseUrl}${dashboardRoutes.host}`;

    await createNotification({
      userId: input.userId,
      type: "host_role_request_approved",
      title: "Host role approved",
      body: `Your Host access on ${siteConfig.name} is ready. Open Settings → Roles to view your status.`,
      actionUrl: `${dashboardRoutes.settings}#roles`,
      metadata: { decision: "approved" },
    });

    sendTemplatedEmailInBackground(
      {
        to: input.email.trim().toLowerCase(),
        template: "host-role-request-approved",
        data: {
          appName: siteConfig.name,
          userName: input.userName.trim() || "there",
          settingsUrl,
          hostDashboardUrl,
          loginUrl: `${baseUrl}${authRoutes.login}`,
        },
      },
      { module: "host-role-request-notify" },
    );
  } catch (error) {
    log.error("Failed to notify user about host role approval", {
      userId: input.userId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

export async function notifyUserHostRoleRequestRejected(input: {
  userId: string;
  email: string;
  userName: string;
  rejectionReason: string;
}): Promise<void> {
  try {
    const baseUrl = getBaseUrl();
    const settingsUrl = `${baseUrl}${dashboardRoutes.settings}#roles`;

    await createNotification({
      userId: input.userId,
      type: "host_role_request_rejected",
      title: "Host role request declined",
      body: input.rejectionReason.trim().slice(0, 280),
      actionUrl: `${dashboardRoutes.settings}#roles`,
      metadata: {
        decision: "rejected",
        rejectionReason: input.rejectionReason.trim(),
      },
    });

    sendTemplatedEmailInBackground(
      {
        to: input.email.trim().toLowerCase(),
        template: "host-role-request-rejected",
        data: {
          appName: siteConfig.name,
          userName: input.userName.trim() || "there",
          rejectionReason: input.rejectionReason.trim(),
          settingsUrl,
          loginUrl: `${baseUrl}${authRoutes.login}`,
        },
      },
      { module: "host-role-request-notify" },
    );
  } catch (error) {
    log.error("Failed to notify user about host role rejection", {
      userId: input.userId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
