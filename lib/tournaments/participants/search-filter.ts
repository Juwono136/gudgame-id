import "server-only";

import { ilike, or, sql, type SQL } from "drizzle-orm";
import { user } from "@/db/schema/auth";
import { tournamentTeams } from "@/db/schema/tournament-registration";
import {
  sanitizeSearchTerm,
  toIlikeContainsPattern,
} from "@/lib/search/sanitize-search-term";

const displayNameSql = sql<string>`coalesce(nullif(${user.nickname}, ''), ${user.name})`;

/**
 * Participant list filter: match player display name / name / nickname or team name.
 * Returns `undefined` when search is empty (no extra WHERE clause).
 */
export function buildParticipantSearchFilter(rawSearch: string | undefined): SQL | undefined {
  const term = sanitizeSearchTerm(rawSearch);
  if (!term) return undefined;

  const pattern = toIlikeContainsPattern(term);
  return or(
    ilike(displayNameSql, pattern),
    ilike(user.name, pattern),
    ilike(user.nickname, pattern),
    ilike(tournamentTeams.name, pattern),
  );
}
