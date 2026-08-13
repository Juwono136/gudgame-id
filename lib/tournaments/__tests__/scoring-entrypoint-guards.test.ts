/**
 * Guards that prevent Double Stage / KO / group-only from calling round (reclub) APIs.
 */
import { describe, expect, it } from "vitest";
import { getFormatCapabilities } from "@/lib/tournaments/format-capabilities";
import { supportsRoundBasedPlay } from "@/lib/tournaments/core/types";
import type { TournamentDetail } from "@/lib/tournaments/service";

function stub(
  format: string,
  settings: Record<string, unknown> = {},
  tournamentType: "official" | "fun_match" = "official",
): TournamentDetail {
  return {
    id: "t1",
    name: "Test",
    slug: "test",
    sportSlug: "padel",
    status: "live",
    tournamentType,
    format,
    settings,
  } as TournamentDetail;
}

describe("scoring entrypoint · format → API lane", () => {
  const formats = [
    "double_stage",
    "group_only",
    "single_elimination",
    "americano",
    "mexicano",
  ] as const;

  it.each(formats)("%s never uses rounds lane unless americano/mexicano", (format) => {
    const settings =
      format === "double_stage" ? { doubleStage: { phase: "group" } } : {};
    const caps = getFormatCapabilities(stub(format, settings));
    const roundPlay = supportsRoundBasedPlay(stub(format, settings));

    if (format === "americano" || format === "mexicano") {
      expect(caps.manageScoringMode).toBe("rounds");
      expect(roundPlay).toBe(true);
      return;
    }

    expect(caps.manageScoringMode).not.toBe("rounds");
    expect(roundPlay).toBe(false);
  });

  it("double_stage group → groups lane; knockout → bracket lane", () => {
    expect(
      getFormatCapabilities(stub("double_stage", { doubleStage: { phase: "group" } }))
        .manageScoringMode,
    ).toBe("groups");
    expect(
      getFormatCapabilities(stub("double_stage", { doubleStage: { phase: "knockout" } }))
        .manageScoringMode,
    ).toBe("bracket");
  });

  it("original + custom families share the same manage scoring modes", () => {
    for (const family of ["original", "custom"] as const) {
      const dsGroup = getFormatCapabilities(
        stub("double_stage", {
          formatFamily: family,
          doubleStage: { phase: "group" },
        }),
      );
      const dsKo = getFormatCapabilities(
        stub("double_stage", {
          formatFamily: family,
          doubleStage: { phase: "knockout" },
        }),
      );
      expect(dsGroup.manageScoringMode).toBe("groups");
      expect(dsKo.manageScoringMode).toBe("bracket");
      expect(dsKo.hasGroupStage).toBe(false);
      expect(dsGroup.hasGroupStage).toBe(true);
    }
  });
});
