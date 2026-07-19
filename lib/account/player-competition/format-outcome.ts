/**
 * Display helpers for player competition lists (public profile + dashboard).
 * Maps internal role labels like "Organizer" into player-useful outcomes.
 */

const WEAK_PLACEMENTS = new Set([
  "organizer",
  "hosted",
  "hosting",
  "participant",
  "competed",
  "registered",
  "pending",
]);

export function formatTournamentStatusLabel(status: string | null | undefined): string | null {
  if (!status?.trim()) return null;
  switch (status.trim().toLowerCase()) {
    case "draft":
      return "Draft";
    case "published":
    case "registration_open":
    case "registration":
      return "Upcoming";
    case "registration_closed":
    case "check_in":
    case "ready":
      return "Starting soon";
    case "in_progress":
    case "live":
    case "active":
      return "Live";
    case "completed":
    case "finished":
    case "archived":
      return "Completed";
    case "cancelled":
    case "canceled":
      return "Cancelled";
    default: {
      const raw = status.trim().replace(/_/g, " ");
      return raw.charAt(0).toUpperCase() + raw.slice(1);
    }
  }
}

/**
 * Prefer competitive placements; fall back to tournament lifecycle status.
 * Never surface raw "Organizer" as a placement on player-facing UIs.
 */
export function formatPlayerTournamentResult(input: {
  placement: string;
  status?: string | null;
}): string {
  const placement = input.placement?.trim() || "";
  const lower = placement.toLowerCase();
  const statusLabel = formatTournamentStatusLabel(input.status);

  if (placement && !WEAK_PLACEMENTS.has(lower)) {
    return placement;
  }

  if (lower === "organizer" || lower === "hosted" || lower === "hosting") {
    if (statusLabel === "Live") return "Hosting · Live";
    if (statusLabel === "Upcoming" || statusLabel === "Starting soon") return "Hosting";
    if (statusLabel === "Completed") return "Hosted";
    return statusLabel ? `Hosted · ${statusLabel}` : "Hosted";
  }

  if (lower === "registered") return statusLabel === "Live" ? "Registered · Live" : "Registered";
  if (lower === "pending") return "Pending registration";

  if (lower === "participant" || lower === "competed") {
    if (statusLabel === "Live") return "Competing";
    if (statusLabel === "Upcoming" || statusLabel === "Starting soon") return "Registered";
    return statusLabel ?? "Competed";
  }

  return statusLabel ?? (placement || "—");
}

/** Higher = more useful as a player result when merging list rows. */
export function tournamentResultPriority(placement: string): number {
  const lower = placement.trim().toLowerCase();
  if (!lower) return 0;
  if (lower === "organizer" || lower === "hosted" || lower === "hosting") return 1;
  if (lower === "pending") return 2;
  if (lower === "registered" || lower === "participant" || lower === "competed") return 3;
  return 10;
}

export function formatMatchPlayedAt(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatMatchResultLabel(input: {
  resultType: "win" | "loss" | string;
  score: string | null;
}): string {
  if (input.score?.trim()) return input.score.trim();
  return input.resultType === "win" ? "Win" : input.resultType === "loss" ? "Loss" : "—";
}
