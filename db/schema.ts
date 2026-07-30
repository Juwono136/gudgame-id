import {
  pgTable,
  serial,
  text,
  varchar,
  boolean,
  jsonb,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { user } from "./schema/auth";
import { uuidFk } from "./schema/uuid";

export * from "./schema/auth";
export * from "./schema/roles";
export * from "./schema/admin-invite";
export * from "./schema/partners";
export * from "./schema/partner-leagues";
export * from "./schema/partner-players";
export * from "./schema/wiki";
export * from "./schema/player-competition";
export * from "./schema/tournaments";
export * from "./schema/tournament-registration";
export * from "./schema/tournament-payments";
export * from "./schema/tournament-matches";
export * from "./schema/tournament-groups";
export * from "./schema/tournament-courts";
export * from "./schema/tournament-invitations";
export * from "./schema/tournament-archives";
export * from "./schema/match-score-revisions";
export * from "./schema/user-sport-interests";
export * from "./schema/host-xendit";
export * from "./schema/host-bank-accounts";
export * from "./schema/host-payout-disbursements";
export * from "./schema/notifications";
export * from "./schema/wiki-scrape-hosts";

export { sports, type Sport, type NewSport } from "./schema/sports";
import { sports } from "./schema/sports";

// 2. Community Profile & Skills Tier System
export const playerProfiles = pgTable(
  "player_profiles",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    sportId: uuidFk("sport_id")
      .notNull()
      .references(() => sports.id, { onDelete: "restrict" }),
    fullName: varchar("full_name", { length: 100 }).notNull(),
    tier: varchar("tier", { length: 20 }).notNull().default("bronze"),
    isProVerified: boolean("is_pro_verified").default(false).notNull(),
    stats: jsonb("stats").default({}).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("player_profiles_tier_idx").on(table.tier),
    index("player_profiles_sport_idx").on(table.sportId),
    index("player_profiles_user_idx").on(table.userId),
  ],
);

// 3. Sports Equipments Table
export const equipments = pgTable(
  "equipments",
  {
    id: serial("id").primaryKey(),
    sportId: uuidFk("sport_id")
      .notNull()
      .references(() => sports.id, { onDelete: "restrict" }),
    brand: varchar("brand", { length: 50 }).notNull(),
    modelName: varchar("model_name", { length: 100 }).notNull(),
    specifications: jsonb("specifications").default({}).notNull(),
    imageUrl: text("image_url"),
    sourceType: varchar("source_type", { length: 20 }).default("scraped").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("equipments_sport_idx").on(table.sportId),
    index("equipments_brand_idx").on(table.brand),
  ],
);

export type PlayerProfile = typeof playerProfiles.$inferSelect;
export type Equipment = typeof equipments.$inferSelect;
