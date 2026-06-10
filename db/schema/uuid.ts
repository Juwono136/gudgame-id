import { uuid } from "drizzle-orm/pg-core";

/** Standard UUID primary key — use for all domain entity tables. */
export const uuidPrimaryKey = () => uuid("id").defaultRandom().primaryKey();

/** Standard UUID foreign key column. */
export const uuidFk = (name: string) => uuid(name);
