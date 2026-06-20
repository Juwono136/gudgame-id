import {
  boolean,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";
import { user } from "./auth";
import { sports } from "./sports";
import { uuidFk, uuidPrimaryKey } from "./uuid";

export const WIKI_SCRAPE_PARSER_PROFILES = [
  "padeltop",
  "padelful",
  "padelracket",
  "decathlon",
  "generic",
] as const;

export type WikiScrapeParserProfile = (typeof WIKI_SCRAPE_PARSER_PROFILES)[number];

export const wikiScrapeHosts = pgTable(
  "wiki_scrape_hosts",
  {
    id: uuidPrimaryKey(),
    sportId: uuidFk("sport_id").references(() => sports.id, { onDelete: "cascade" }),
    hostname: varchar("hostname", { length: 253 }).notNull(),
    label: varchar("label", { length: 120 }).notNull(),
    parserProfile: varchar("parser_profile", { length: 40 }).notNull().default("generic"),
    enabled: boolean("enabled").notNull().default(true),
    createdBy: text("created_by").references(() => user.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("wiki_scrape_hosts_sport_hostname_uidx").on(table.sportId, table.hostname),
    index("wiki_scrape_hosts_enabled_idx").on(table.enabled),
  ],
);

export type WikiScrapeHost = typeof wikiScrapeHosts.$inferSelect;
export type NewWikiScrapeHost = typeof wikiScrapeHosts.$inferInsert;
