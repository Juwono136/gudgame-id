import { index, pgTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/pg-core";
import { user } from "./auth";

/** Many-to-many user roles — source of truth for authorization */
export const userRoleAssignments = pgTable(
  "user_role_assignments",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: varchar("role", { length: 32 }).notNull(),
    assignedAt: timestamp("assigned_at").defaultNow().notNull(),
    assignedBy: text("assigned_by").references(() => user.id, {
      onDelete: "set null",
    }),
  },
  (table) => [
    uniqueIndex("user_role_assignments_user_role_uidx").on(
      table.userId,
      table.role,
    ),
    index("user_role_assignments_user_idx").on(table.userId),
    index("user_role_assignments_role_idx").on(table.role),
  ],
);

export type UserRoleAssignment = typeof userRoleAssignments.$inferSelect;
