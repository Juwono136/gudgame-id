import { TOURNAMENT_FIELD_LIMITS } from "@/lib/tournaments/form/field-limits";

export type ReclubWizardFormState = {
  name: string;
  summary: string;
  description: string;
  rules: string;
  venue: string;
  venueMapsUrl: string;
  playersPerTeam: string;
  maxTeams: string;
  maxRounds: string;
  startsAt: string;
  endsAt: string;
};

const URL_RE = /^https?:\/\/.+/i;

export function validateReclubWizardStep(
  step: number,
  data: ReclubWizardFormState,
): string | null {
  if (step === 0) {
    const name = data.name.trim();
    if (!name) return "Session name is required.";
    if (name.length < 2) return "Name must be at least 2 characters.";
    if (name.length > TOURNAMENT_FIELD_LIMITS.name) {
      return `Name must be at most ${TOURNAMENT_FIELD_LIMITS.name} characters.`;
    }
    if (data.summary.length > TOURNAMENT_FIELD_LIMITS.summary) {
      return `Summary must be at most ${TOURNAMENT_FIELD_LIMITS.summary} characters.`;
    }
    if (data.venue.trim().length > TOURNAMENT_FIELD_LIMITS.venue) {
      return `Venue must be at most ${TOURNAMENT_FIELD_LIMITS.venue} characters.`;
    }
    const maps = data.venueMapsUrl.trim();
    if (maps && (!URL_RE.test(maps) || maps.length > 2000)) {
      return "Maps link must be a valid http(s) URL.";
    }
    return null;
  }

  if (step === 1) {
    const ppt = Number(data.playersPerTeam);
    if (!Number.isFinite(ppt) || ppt < 1 || ppt > 12) {
      return "Players per team must be between 1 and 12.";
    }
    const maxTeams = Number(data.maxTeams);
    if (!Number.isFinite(maxTeams) || maxTeams < 2 || maxTeams > 64) {
      return "Max squads must be between 2 and 64.";
    }
    const maxRounds = Number(data.maxRounds);
    if (!Number.isFinite(maxRounds) || maxRounds < 1 || maxRounds > 99) {
      return "Number of rounds must be between 1 and 99.";
    }
    if (!data.startsAt.trim()) {
      return "Start date & time is required.";
    }
    if (!data.endsAt.trim()) {
      return "End date & time is required.";
    }
    const start = new Date(data.startsAt).getTime();
    const end = new Date(data.endsAt).getTime();
    if (Number.isNaN(start)) return "Start date & time is invalid.";
    if (Number.isNaN(end)) return "End date & time is invalid.";
    if (end <= start) {
      return "End time must be after start time.";
    }
    return null;
  }

  if (step === 2) {
    if (data.description.length > TOURNAMENT_FIELD_LIMITS.description) {
      return `Description must be at most ${TOURNAMENT_FIELD_LIMITS.description.toLocaleString()} characters.`;
    }
    if (data.rules.length > TOURNAMENT_FIELD_LIMITS.rules) {
      return `House rules must be at most ${TOURNAMENT_FIELD_LIMITS.rules.toLocaleString()} characters.`;
    }
    return null;
  }

  return null;
}

export function validateReclubWizardAll(data: ReclubWizardFormState): string | null {
  for (let step = 0; step <= 2; step++) {
    const err = validateReclubWizardStep(step, data);
    if (err) return err;
  }
  return null;
}
