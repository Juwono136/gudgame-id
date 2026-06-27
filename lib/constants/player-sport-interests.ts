/** Reference list for player sport preferences (not tied to wiki sports catalog). */
export const PLAYER_SPORT_INTEREST_OPTIONS = [
  { slug: "padel", name: "Padel" },
  { slug: "tennis", name: "Tennis" },
  { slug: "pickleball", name: "Pickleball" },
  { slug: "badminton", name: "Badminton" },
  { slug: "squash", name: "Squash" },
  { slug: "table-tennis", name: "Table tennis" },
  { slug: "basketball", name: "Basketball" },
  { slug: "football", name: "Football (soccer)" },
  { slug: "futsal", name: "Futsal" },
  { slug: "volleyball", name: "Volleyball" },
  { slug: "beach-volleyball", name: "Beach volleyball" },
  { slug: "golf", name: "Golf" },
  { slug: "running", name: "Running" },
  { slug: "cycling", name: "Cycling" },
  { slug: "swimming", name: "Swimming" },
  { slug: "martial-arts", name: "Martial arts" },
  { slug: "boxing", name: "Boxing" },
  { slug: "mma", name: "MMA" },
  { slug: "cricket", name: "Cricket" },
  { slug: "baseball", name: "Baseball" },
  { slug: "softball", name: "Softball" },
  { slug: "hockey", name: "Hockey" },
  { slug: "rugby", name: "Rugby" },
  { slug: "esports", name: "Esports" },
] as const;

export type PlayerSportInterestSlug = (typeof PLAYER_SPORT_INTEREST_OPTIONS)[number]["slug"];
