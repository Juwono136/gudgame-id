/**
 * Human-readable tournament final-record (audit) presentation.
 * Hosts see roster + results — not raw database JSON.
 */

export type AuditReportOverview = {
  name: string;
  statusLabel: string;
  closedReasonLabel: string;
  formatLabel: string | null;
  typeLabel: string | null;
  billingLabel: string | null;
  categoryLabel: string | null;
  venue: string | null;
  scheduleLabel: string | null;
  statsTierLabel: string;
  archivedAtLabel: string;
};

export type AuditReportTeam = {
  id: string;
  name: string;
  players: string[];
};

export type AuditReportMatch = {
  id: string;
  section: "bracket" | "rounds";
  label: string;
  teamA: string;
  teamB: string;
  scoreLabel: string;
  statusLabel: string;
  winner: string | null;
};

export type AuditReportRegistration = {
  id: string;
  teamName: string;
  statusLabel: string;
};

export type TournamentAuditReport = {
  overview: AuditReportOverview;
  summary: {
    teamCount: number;
    playerCount: number;
    registrationCount: number;
    confirmedRegistrationCount: number;
    bracketMatchCount: number;
    roundMatchCount: number;
    completedMatchCount: number;
  };
  teams: AuditReportTeam[];
  matches: AuditReportMatch[];
  registrations: AuditReportRegistration[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function formatDateTime(value: unknown): string | null {
  if (typeof value !== "string" && !(value instanceof Date)) return null;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}

function formatSchedule(startsAt: unknown, endsAt: unknown): string | null {
  const start = formatDateTime(startsAt);
  const end = formatDateTime(endsAt);
  if (!start && !end) return null;
  return `${start ?? "—"} — ${end ?? "—"}`;
}

function humanizeKey(value: string | null | undefined): string | null {
  if (!value?.trim()) return null;
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function statusLabel(status: string | null | undefined): string {
  switch (status) {
    case "completed":
      return "Completed";
    case "cancelled":
      return "Cancelled";
    case "live":
      return "Live";
    case "upcoming":
      return "Upcoming";
    case "draft":
      return "Draft";
    case "pending":
      return "Not played";
    case "in_progress":
      return "In progress";
    case "bye":
      return "Walkover";
    case "confirmed":
      return "Confirmed";
    case "pending_payment":
      return "Pending payment";
    case "awaiting_confirmation":
      return "Awaiting confirmation";
    case "declined":
      return "Declined";
    default:
      return humanizeKey(status) ?? "Unknown";
  }
}

function statsTierLabel(tier: string): string {
  switch (tier) {
    case "official_paid":
      return "Official paid";
    case "official_free":
      return "Official free";
    case "fun_match":
      return "Fun Match";
    default:
      return humanizeKey(tier) ?? tier;
  }
}

function closedReasonLabel(reason: unknown, status: string | null): string {
  if (reason === "cancelled" || status === "cancelled") return "Event cancelled";
  if (reason === "completed" || status === "completed") return "Event completed";
  return "Final record saved";
}

function scoreLabel(scoreA: unknown, scoreB: unknown, status: string): string {
  if (status === "bye") return "Walkover";
  const a = asNumber(scoreA);
  const b = asNumber(scoreB);
  if (a == null && b == null) return "—";
  return `${a ?? 0} – ${b ?? 0}`;
}

function matchLabel(section: "bracket" | "rounds", roundNumber: number, matchNumber: number): string {
  if (section === "rounds") {
    return `Round ${roundNumber}${matchNumber ? ` · Match ${matchNumber}` : ""}`;
  }
  if (roundNumber === 0) return `Play-in · Match ${matchNumber}`;
  if (matchNumber === 999) return "3rd place";
  return `Round ${roundNumber} · Match ${matchNumber}`;
}

type BuildInput = {
  snapshot: unknown;
  statsTier: string;
  archivedAt: Date | string;
};

/**
 * Convert an archived JSONB snapshot into a host-facing report.
 * Safe for legacy snapshots that lack display names.
 */
export function buildTournamentAuditReport(input: BuildInput): TournamentAuditReport {
  const root = isRecord(input.snapshot) ? input.snapshot : {};
  const tournament = isRecord(root.tournament) ? root.tournament : {};
  const teamsRaw = Array.isArray(root.teams) ? root.teams : [];
  const membersRaw = Array.isArray(root.members) ? root.members : [];
  const registrationsRaw = Array.isArray(root.registrations) ? root.registrations : [];
  const bracketRaw = Array.isArray(root.bracketMatches) ? root.bracketMatches : [];
  const reclubRaw = Array.isArray(root.reclubMatches) ? root.reclubMatches : [];

  const membersByTeam = new Map<string, string[]>();
  for (const row of membersRaw) {
    if (!isRecord(row)) continue;
    const teamId = asString(row.teamId);
    if (!teamId) continue;
    const name =
      asString(row.displayName).trim() ||
      asString(row.playerName).trim() ||
      (asString(row.userId) ? "Player" : "Guest");
    const list = membersByTeam.get(teamId) ?? [];
    list.push(name);
    membersByTeam.set(teamId, list);
  }

  const teamNameById = new Map<string, string>();
  const teams: AuditReportTeam[] = teamsRaw
    .filter(isRecord)
    .map((row) => {
      const id = asString(row.id);
      const name = asString(row.name, "Unnamed team");
      if (id) teamNameById.set(id, name);
      return {
        id: id || name,
        name,
        players: membersByTeam.get(id) ?? [],
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  const mapMatch = (
    row: Record<string, unknown>,
    section: "bracket" | "rounds",
  ): AuditReportMatch | null => {
    const id = asString(row.id);
    if (!id) return null;
    const status = asString(row.status, "pending");
    const teamA =
      asString(row.teamAName).trim() ||
      (asString(row.teamAId) ? teamNameById.get(asString(row.teamAId)) : null) ||
      "TBD";
    const teamB =
      asString(row.teamBName).trim() ||
      (asString(row.teamBId) ? teamNameById.get(asString(row.teamBId)) : null) ||
      (status === "bye" ? "BYE" : "TBD");
    const winnerId = asString(row.winnerTeamId);
    const winner =
      winnerId && teamNameById.get(winnerId)
        ? teamNameById.get(winnerId)!
        : winnerId === asString(row.teamAId)
          ? teamA
          : winnerId === asString(row.teamBId)
            ? teamB
            : null;

    return {
      id,
      section,
      label: matchLabel(
        section,
        asNumber(row.roundNumber) ?? 1,
        asNumber(row.matchNumber) ?? 0,
      ),
      teamA,
      teamB,
      scoreLabel: scoreLabel(row.scoreA, row.scoreB, status),
      statusLabel: statusLabel(status),
      winner,
    };
  };

  const matches: AuditReportMatch[] = [
    ...bracketRaw.filter(isRecord).map((row) => mapMatch(row, "bracket")),
    ...reclubRaw.filter(isRecord).map((row) => mapMatch(row, "rounds")),
  ].filter((m): m is AuditReportMatch => Boolean(m));

  const registrations: AuditReportRegistration[] = registrationsRaw
    .filter(isRecord)
    .map((row) => {
      const teamId = asString(row.teamId);
      return {
        id: asString(row.id) || `${teamId}-${asString(row.status)}`,
        teamName: teamId ? teamNameById.get(teamId) ?? "Team" : "Team",
        statusLabel: statusLabel(asString(row.status)),
      };
    });

  const completedMatchCount = matches.filter(
    (m) => m.statusLabel === "Completed" || m.statusLabel === "Walkover",
  ).length;

  const status = asString(tournament.status);
  const archivedAt =
    input.archivedAt instanceof Date
      ? input.archivedAt
      : new Date(input.archivedAt);

  return {
    overview: {
      name: asString(tournament.name, "Tournament"),
      statusLabel: statusLabel(status),
      closedReasonLabel: closedReasonLabel(root.archivedReason, status),
      formatLabel: humanizeKey(asString(tournament.format) || null),
      typeLabel: humanizeKey(asString(tournament.tournamentType) || null),
      billingLabel: humanizeKey(asString(tournament.officialBilling) || null),
      categoryLabel: asString(tournament.categoryLabel) || null,
      venue: asString(tournament.venue) || null,
      scheduleLabel: formatSchedule(tournament.startsAt, tournament.endsAt),
      statsTierLabel: statsTierLabel(input.statsTier),
      archivedAtLabel: formatDateTime(archivedAt) ?? "—",
    },
    summary: {
      teamCount: teams.length,
      playerCount: membersRaw.length,
      registrationCount: registrations.length,
      confirmedRegistrationCount: registrations.filter((r) => r.statusLabel === "Confirmed")
        .length,
      bracketMatchCount: bracketRaw.length,
      roundMatchCount: reclubRaw.length,
      completedMatchCount,
    },
    teams,
    matches,
    registrations,
  };
}
