export function formatMatchDate(iso: string, style: "short" | "long" | "datetime" = "short") {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";

  if (style === "datetime") {
    return new Intl.DateTimeFormat("en", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date);
  }

  if (style === "long") {
    return new Intl.DateTimeFormat("en", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    }).format(date);
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function parseOpponentTeams(opponents: string): [string, string] | null {
  const parts = opponents.split(/\s+vs\s+/i);
  if (parts.length !== 2) return null;
  const a = parts[0]?.trim();
  const b = parts[1]?.trim();
  if (!a || !b) return null;
  return [a, b];
}
