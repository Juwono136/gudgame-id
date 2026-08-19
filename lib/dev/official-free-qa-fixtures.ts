/**
 * Official FREE QA matrix: Original + Custom × match types × scoring modes.
 * Shared dummy players (`qa-p###@gudgame.local`) register into every event.
 */
import type { MatchScoringConfig } from "@/lib/tournaments/match-config";
import {
  CUSTOM_FORMATS,
  ORIGINAL_FORMATS,
  type OfficialCreatableFormat,
  type TournamentFormatFamily,
} from "@/lib/tournaments/match-config";

export const QA_SEED_EMAIL_PREFIX = "qa-p";
export const QA_SEED_TEAM_PREFIX = "QA Team";
export const QA_SEED_SLUG_PREFIX = "qa-free-";
/** SQL LIKE pattern for Official FREE QA slugs, including unique-suffix leftovers. */
export const QA_SEED_SLUG_LIKE = `${QA_SEED_SLUG_PREFIX}%`;
export const QA_TEAM_COUNT = 8;

export const QA_SCORING_KEYS = ["bo3", "bo5", "r4", "r6", "t4", "cs"] as const;
export type QaScoringKey = (typeof QA_SCORING_KEYS)[number];

export const FORMAT_SHORT: Record<OfficialCreatableFormat, string> = {
  double_stage: "ds",
  americano: "am",
  mexicano: "mx",
  single_elimination: "ko",
  group_only: "go",
};

export const FORMAT_LABEL: Record<OfficialCreatableFormat, string> = {
  double_stage: "Group+KO",
  americano: "Americano",
  mexicano: "Mexicano",
  single_elimination: "Knockout",
  group_only: "Group only",
};

export const SCORING_LABEL: Record<QaScoringKey, string> = {
  bo3: "Best of 3 · set race 4",
  bo5: "Best of 5 · set race 6",
  r4: "Race to 4",
  r6: "Race to 6",
  t4: "Total 4",
  cs: "Custom large score",
};

export type OfficialFreeQaFixtureDef = {
  key: string;
  slug: string;
  name: string;
  formatFamily: TournamentFormatFamily;
  format: OfficialCreatableFormat;
  scoringKey: QaScoringKey;
};

export function buildMatchScoring(
  format: OfficialCreatableFormat,
  scoringKey: QaScoringKey,
): MatchScoringConfig {
  const leaf = ((): MatchScoringConfig => {
    switch (scoringKey) {
      case "bo3":
        return { mode: "best_of", bestOf: 3, setTarget: { value: 4 } };
      case "bo5":
        return { mode: "best_of", bestOf: 5, setTarget: { value: 6 } };
      case "r4":
        return { mode: "race_to", raceTo: { value: 4 } };
      case "r6":
        return { mode: "race_to", raceTo: { value: 6 } };
      case "t4":
        return { mode: "total", totalSets: 4 };
      case "cs":
        return {
          mode: "custom_score",
          customScore: {
            variant: "large_score",
            allowDraw: false,
            tiePolicy: "continue",
          },
        };
    }
  })();

  if (format !== "double_stage") return leaf;

  if (scoringKey === "r4") {
    return {
      ...leaf,
      group: { mode: "race_to", raceTo: { value: 4 } },
      knockout: { mode: "race_to", raceTo: { value: 6 } },
    };
  }
  if (scoringKey === "bo3") {
    return {
      ...leaf,
      group: { mode: "best_of", bestOf: 3, setTarget: { value: 4 } },
      knockout: { mode: "best_of", bestOf: 5, setTarget: { value: 6 } },
    };
  }
  return {
    ...leaf,
    group: { ...leaf },
    knockout: { ...leaf },
  };
}

export function listOfficialFreeQaFixtures(): OfficialFreeQaFixtureDef[] {
  const defs: OfficialFreeQaFixtureDef[] = [];
  const families: TournamentFormatFamily[] = ["original", "custom"];

  for (const family of families) {
    const formats = family === "custom" ? CUSTOM_FORMATS : ORIGINAL_FORMATS;
    for (const format of formats) {
      for (const scoringKey of QA_SCORING_KEYS) {
        const fam = family === "custom" ? "cus" : "orig";
        const slug = `${QA_SEED_SLUG_PREFIX}${fam}-${FORMAT_SHORT[format]}-${scoringKey}`;
        defs.push({
          key: `${family}-${format}-${scoringKey}`,
          slug,
          name: `QA Free · ${family === "custom" ? "Custom" : "Original"} · ${FORMAT_LABEL[format]} · ${SCORING_LABEL[scoringKey]}`,
          formatFamily: family,
          format,
          scoringKey,
        });
      }
    }
  }

  return defs;
}

/** Legacy fixture slugs from older seed scripts (must be purged). */
export const LEGACY_SEED_TOURNAMENT_SLUGS = [
  "dev-official-free-americano",
  "dev-official-paid-americano",
  "dev-official-free-elim",
  "dev-official-paid-elim",
  "dev-fun-americano",
  "dev-fun-elim",
  "dev-double-stage-32",
  "dev-ds-bronze-32",
  "dev-ds-silver-32",
  "dev-ds-gold-32",
  "dev-ds-platinum-32",
  "dev-ds-international-32",
] as const;

export const LEGACY_SEED_PLAYER_PREFIXES = [
  "fx-ofa-p",
  "fx-opa-p",
  "fx-ofe-p",
  "fx-ope-p",
  "fx-fa-p",
  "fx-fe-p",
  "ds32-p",
  "ds32-bronze-p",
  "ds32-silver-p",
  "ds32-gold-p",
  "ds32-platinum-p",
  "ds32-international-p",
  QA_SEED_EMAIL_PREFIX,
] as const;
