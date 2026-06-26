import { isUuid } from "@/lib/domain/uuid";
import type { TournamentDetail } from "@/lib/tournaments/service";
import {
  coerceRichHtmlField,
  sanitizeTournamentRichField,
} from "@/lib/wiki/sanitize-rich-text";

export type TournamentRuleSections = {
  eligibilityHtml?: string;
  matchFormatHtml?: string;
  equipmentStandardsHtml?: string;
  gearEntityIds?: string[];
};

export type TournamentSettings = TournamentRuleSections & {
  venueMapsUrl?: string;
  /** Max playable rounds for reclub sessions (set at creation). */
  maxRounds?: number;
  scoringType?: TournamentScoringType;
  pointsPerMatch?: number;
  courtCount?: number;
  officialStaff?: OfficialTournamentStaffMember[];
};

export const TOURNAMENT_SCORING_TYPES = ["points", "timed"] as const;
export type TournamentScoringType = (typeof TOURNAMENT_SCORING_TYPES)[number];

export const TOURNAMENT_POINTS_PER_MATCH_OPTIONS = [11, 15, 21, 25, 30] as const;
export const TOURNAMENT_COURT_COUNT_OPTIONS = [1, 2, 3, 4, 5, 6, 8, 10, 12] as const;

export function getTournamentFormatLabel(format: string | null | undefined): string {
  return format === "americano" ? "Americano" : "Elimination";
}

export function getScoringTypeLabel(scoringType: string | null | undefined): string {
  return scoringType === "timed" ? "Timed rounds" : "Points";
}

export type OfficialTournamentStaffRole = "host" | "scorekeeper";

export type OfficialTournamentStaffMember = {
  userId: string;
  email: string;
  name: string;
  role: OfficialTournamentStaffRole;
  invitedAt: string;
  invitedByUserId: string;
};

export function parseTournamentSettings(
  raw: Record<string, unknown> | null | undefined,
): TournamentSettings {
  if (!raw || typeof raw !== "object") return {};

  const venueMapsUrl = raw.venueMapsUrl;
  const eligibilityHtml = raw.eligibilityHtml;
  const matchFormatHtml = raw.matchFormatHtml;
  const equipmentStandardsHtml = raw.equipmentStandardsHtml;
  const gearEntityIds = raw.gearEntityIds;
  const maxRounds = raw.maxRounds;
  const scoringType = raw.scoringType;
  const pointsPerMatch = raw.pointsPerMatch;
  const courtCount = raw.courtCount;
  const officialStaff = raw.officialStaff;

  const parsedGearIds = Array.isArray(gearEntityIds)
    ? gearEntityIds
        .map((id) => (typeof id === "string" ? id.trim() : String(id)))
        .filter((id) => isUuid(id))
    : undefined;

  return {
    venueMapsUrl:
      typeof venueMapsUrl === "string" && venueMapsUrl.trim() ? venueMapsUrl : undefined,
    eligibilityHtml: coerceRichHtmlField(
      typeof eligibilityHtml === "string" ? eligibilityHtml : null,
    ) ?? undefined,
    matchFormatHtml: coerceRichHtmlField(
      typeof matchFormatHtml === "string" ? matchFormatHtml : null,
    ) ?? undefined,
    equipmentStandardsHtml: coerceRichHtmlField(
      typeof equipmentStandardsHtml === "string" ? equipmentStandardsHtml : null,
    ) ?? undefined,
    gearEntityIds: parsedGearIds?.length ? parsedGearIds : undefined,
    maxRounds:
      typeof maxRounds === "number" && Number.isFinite(maxRounds) && maxRounds > 0
        ? Math.floor(maxRounds)
        : undefined,
    scoringType:
      scoringType === "points" || scoringType === "timed" ? scoringType : undefined,
    pointsPerMatch:
      typeof pointsPerMatch === "number" && Number.isFinite(pointsPerMatch) && pointsPerMatch > 0
        ? Math.floor(pointsPerMatch)
        : undefined,
    courtCount:
      typeof courtCount === "number" && Number.isFinite(courtCount) && courtCount > 0
        ? Math.floor(courtCount)
        : undefined,
    officialStaff: parseOfficialTournamentStaff(officialStaff),
  };
}

export function parseOfficialTournamentStaff(
  raw: unknown,
): OfficialTournamentStaffMember[] | undefined {
  if (!Array.isArray(raw)) return undefined;

  const seen = new Set<string>();
  const staff = raw
    .map((item): OfficialTournamentStaffMember | null => {
      if (!item || typeof item !== "object") return null;
      const value = item as Record<string, unknown>;
      const userId = typeof value.userId === "string" ? value.userId.trim() : "";
      const email = typeof value.email === "string" ? value.email.trim().toLowerCase() : "";
      const name = typeof value.name === "string" ? value.name.trim() : "";
      const role = value.role === "host" ? "host" : value.role === "scorekeeper" ? "scorekeeper" : null;
      const invitedAt =
        typeof value.invitedAt === "string" && value.invitedAt.trim()
          ? value.invitedAt.trim()
          : null;
      const invitedByUserId =
        typeof value.invitedByUserId === "string" ? value.invitedByUserId.trim() : "";

      if (!userId || !email || !name || !role || !invitedAt || !invitedByUserId) {
        return null;
      }
      if (seen.has(userId)) return null;
      seen.add(userId);
      return { userId, email, name, role, invitedAt, invitedByUserId };
    })
    .filter((item): item is OfficialTournamentStaffMember => item != null);

  return staff.length ? staff : undefined;
}

export function getOfficialTournamentStaff(
  tournament: TournamentDetail,
): OfficialTournamentStaffMember[] {
  return parseTournamentSettings(tournament.settings).officialStaff ?? [];
}

export function isOfficialTournamentStaff(
  tournament: TournamentDetail,
  userId: string | null | undefined,
): boolean {
  if (!userId) return false;
  return getOfficialTournamentStaff(tournament).some((member) => member.userId === userId);
}

export function getMaxRounds(tournament: TournamentDetail): number | null {
  return parseTournamentSettings(tournament.settings).maxRounds ?? null;
}

export function getVenueMapsUrl(tournament: TournamentDetail): string | null {
  return parseTournamentSettings(tournament.settings).venueMapsUrl ?? null;
}

export function getTournamentScoringType(tournament: TournamentDetail): TournamentScoringType {
  return parseTournamentSettings(tournament.settings).scoringType ?? "points";
}

export function getTournamentPointsPerMatch(tournament: TournamentDetail): number {
  return parseTournamentSettings(tournament.settings).pointsPerMatch ?? 21;
}

export function getTournamentCourtCount(tournament: TournamentDetail): number {
  return parseTournamentSettings(tournament.settings).courtCount ?? 1;
}

export function getTournamentRuleSections(
  tournament: TournamentDetail,
): TournamentRuleSections {
  const settings = parseTournamentSettings(tournament.settings);
  return {
    eligibilityHtml: settings.eligibilityHtml,
    matchFormatHtml: settings.matchFormatHtml ?? tournament.rules ?? undefined,
    equipmentStandardsHtml: settings.equipmentStandardsHtml,
    gearEntityIds: settings.gearEntityIds,
  };
}

export type TournamentSettingsInput = {
  venueMapsUrl?: string;
  eligibilityHtml?: string;
  matchFormatHtml?: string;
  equipmentStandardsHtml?: string;
  gearEntityIds?: string[];
  maxRounds?: number;
  scoringType?: TournamentScoringType;
  pointsPerMatch?: number;
  courtCount?: number;
};

export type TournamentSettingsUpsertFields = {
  venueMapsUrl?: string;
  eligibilityRules?: string;
  matchFormatRules?: string;
  equipmentStandardsRules?: string;
  gearEntityIds?: string[];
  rules?: string;
  maxRounds?: number;
  scoringType?: TournamentScoringType;
  pointsPerMatch?: number;
  courtCount?: number;
};

export function settingsInputFromUpsert(
  input: TournamentSettingsUpsertFields,
): TournamentSettingsInput {
  return {
    venueMapsUrl: input.venueMapsUrl,
    eligibilityHtml: input.eligibilityRules,
    matchFormatHtml: input.matchFormatRules || input.rules,
    equipmentStandardsHtml: input.equipmentStandardsRules,
    gearEntityIds: input.gearEntityIds,
    maxRounds: input.maxRounds,
    scoringType: input.scoringType,
    pointsPerMatch: input.pointsPerMatch,
    courtCount: input.courtCount,
  };
}

export function buildTournamentSettings(
  existing: Record<string, unknown> | undefined,
  input: TournamentSettingsInput,
): Record<string, unknown> {
  const next = { ...(existing ?? {}) };

  if (input.venueMapsUrl?.trim()) {
    next.venueMapsUrl = input.venueMapsUrl.trim();
  } else if ("venueMapsUrl" in input) {
    delete next.venueMapsUrl;
  }

  const textFields = [
    ["eligibilityHtml", input.eligibilityHtml],
    ["matchFormatHtml", input.matchFormatHtml],
    ["equipmentStandardsHtml", input.equipmentStandardsHtml],
  ] as const;

  for (const [key, value] of textFields) {
    const sanitized = sanitizeTournamentRichField(value);
    if (sanitized) {
      next[key] = sanitized;
    } else if (key in input) {
      delete next[key];
    }
  }

  if (input.gearEntityIds?.length) {
    next.gearEntityIds = input.gearEntityIds;
  } else if ("gearEntityIds" in input) {
    delete next.gearEntityIds;
  }

  if (input.maxRounds != null && input.maxRounds > 0) {
    next.maxRounds = Math.floor(input.maxRounds);
  } else if ("maxRounds" in input) {
    delete next.maxRounds;
  }

  if (input.scoringType === "points" || input.scoringType === "timed") {
    next.scoringType = input.scoringType;
  } else if ("scoringType" in input) {
    delete next.scoringType;
  }

  if (input.pointsPerMatch != null && input.pointsPerMatch > 0) {
    next.pointsPerMatch = Math.floor(input.pointsPerMatch);
  } else if ("pointsPerMatch" in input) {
    delete next.pointsPerMatch;
  }

  if (input.courtCount != null && input.courtCount > 0) {
    next.courtCount = Math.floor(input.courtCount);
  } else if ("courtCount" in input) {
    delete next.courtCount;
  }

  return next;
}
