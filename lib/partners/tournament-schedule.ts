/**
 * Partner tournament schedule helpers (client + server safe).
 * Registration stays open until registrationClosesAt (falls back to endsAt),
 * including after the tournament has started — same idea as Gud Game Official.
 */

export type PartnerScheduleValidationInput = {
  startsAt: string;
  endsAt: string;
  registrationClosesAt: string;
};

export type PartnerScheduleValidationResult =
  | { ok: true }
  | { ok: false; field: "startsAt" | "endsAt" | "registrationClosesAt"; message: string };

function parseLocalOrIso(value: string): number | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  const ms = new Date(trimmed).getTime();
  return Number.isNaN(ms) ? null : ms;
}

/** Validate starts / ends / registration deadline ordering for partner tournaments. */
export function validatePartnerTournamentSchedule(
  input: PartnerScheduleValidationInput,
): PartnerScheduleValidationResult {
  const startsAt = parseLocalOrIso(input.startsAt);
  const endsAt = parseLocalOrIso(input.endsAt);
  const closesAt = parseLocalOrIso(input.registrationClosesAt);

  if (startsAt == null) {
    return { ok: false, field: "startsAt", message: "Start date & time is required." };
  }
  if (endsAt == null) {
    return { ok: false, field: "endsAt", message: "End date & time is required." };
  }
  if (closesAt == null) {
    return {
      ok: false,
      field: "registrationClosesAt",
      message: "Registration deadline is required.",
    };
  }
  if (endsAt <= startsAt) {
    return {
      ok: false,
      field: "endsAt",
      message: "End time must be after start time.",
    };
  }
  if (closesAt > endsAt) {
    return {
      ok: false,
      field: "registrationClosesAt",
      message: "Registration must close on or before the tournament end.",
    };
  }

  return { ok: true };
}

/** Format a datetime for review rows (locale-friendly). */
export function formatPartnerScheduleLabel(value: string | null | undefined): string {
  if (!value?.trim()) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
