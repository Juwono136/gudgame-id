import "server-only";

import { and, count, desc, eq, ilike, isNull, or, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  notifications,
  type Notification,
  type NotificationType,
} from "@/db/schema/notifications";

export type CreateNotificationInput = {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  actionUrl?: string | null;
  metadata?: Record<string, unknown>;
};

export async function createNotification(
  input: CreateNotificationInput,
): Promise<Notification> {
  const [row] = await getDb()
    .insert(notifications)
    .values({
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body,
      actionUrl: input.actionUrl ?? null,
      metadata: input.metadata ?? {},
    })
    .returning();

  if (!row) {
    throw new Error("Failed to create notification");
  }
  return row;
}

export async function createNotifications(
  inputs: CreateNotificationInput[],
): Promise<void> {
  if (inputs.length === 0) return;
  await getDb().insert(notifications).values(
    inputs.map((input) => ({
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body,
      actionUrl: input.actionUrl ?? null,
      metadata: input.metadata ?? {},
    })),
  );
}

export async function listNotificationsForUser(
  userId: string,
  options: { limit?: number; offset?: number; search?: string } = {},
): Promise<{ items: Notification[]; total: number }> {
  const limit = Math.min(Math.max(options.limit ?? 20, 1), 100);
  const offset = Math.max(options.offset ?? 0, 0);
  const search = options.search?.trim();

  const conditions = [eq(notifications.userId, userId)];
  if (search) {
    conditions.push(
      or(
        ilike(notifications.title, `%${search}%`),
        ilike(notifications.body, `%${search}%`),
      )!,
    );
  }

  const whereClause = and(...conditions);

  const [items, [totalRow]] = await Promise.all([
    getDb()
      .select()
      .from(notifications)
      .where(whereClause)
      .orderBy(desc(notifications.createdAt))
      .limit(limit)
      .offset(offset),
    getDb()
      .select({ total: count() })
      .from(notifications)
      .where(whereClause),
  ]);

  return { items, total: Number(totalRow?.total ?? 0) };
}

export async function listRecentNotifications(
  userId: string,
  limit = 5,
): Promise<Notification[]> {
  return getDb()
    .select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);
}

export async function countUnreadNotifications(userId: string): Promise<number> {
  const [row] = await getDb()
    .select({ total: count() })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
  return Number(row?.total ?? 0);
}

export async function markNotificationRead(
  userId: string,
  notificationId: string,
): Promise<boolean> {
  const result = await getDb()
    .update(notifications)
    .set({ readAt: sql`COALESCE(${notifications.readAt}, NOW())` })
    .where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)))
    .returning({ id: notifications.id });
  return result.length > 0;
}

export async function markAllNotificationsRead(userId: string): Promise<number> {
  const rows = await getDb()
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)))
    .returning({ id: notifications.id });
  return rows.length;
}
