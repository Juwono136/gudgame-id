import type { TournamentStatus, TournamentType } from "@/db/schema/tournaments";

export const TOURNAMENT_STATUS_LABELS: Record<TournamentStatus, string> = {
  draft: "Draft",
  upcoming: "Upcoming",
  live: "Live",
  completed: "Completed",
  cancelled: "Cancelled",
};

export const TOURNAMENT_TYPE_LABELS: Record<TournamentType, string> = {
  official: "Official — paid & ranked",
  recreational: "Fun Match — free community play",
};
