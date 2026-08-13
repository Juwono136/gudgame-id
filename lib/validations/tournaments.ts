import { z } from "zod";
import {
  OFFICIAL_BILLING_TYPES,
  TOURNAMENT_CATEGORIES,
  TOURNAMENT_FORMATS,
  TOURNAMENT_STATUSES,
  TOURNAMENT_TYPES,
} from "@/db/schema/tournaments";
import { PLAYER_TIER_LEVELS } from "@/lib/player/tier";
import { normalizeTournamentType } from "@/lib/tournaments/core/types";
import {
  BEST_OF_OPTIONS,
  CUSTOM_SCORE_TIE_POLICIES,
  CUSTOM_SCORE_VARIANTS,
  GROUP_MEETINGS_PER_PAIR_MAX,
  GROUP_MEETINGS_PER_PAIR_MIN,
  isFormatAllowedForFamily,
  KNOCKOUT_LEGS_PER_SLOT_MAX,
  KNOCKOUT_LEGS_PER_SLOT_MIN,
  MATCH_SCORING_MODES,
  MEXICANO_MODES,
  MEXICANO_ROUNDS_MAX,
  MEXICANO_ROUNDS_MIN,
  OFFICIAL_CREATABLE_FORMATS,
  RACE_TO_CUSTOM_MAX,
  RACE_TO_CUSTOM_MIN,
  TOURNAMENT_FORMAT_FAMILIES,
  TOURNAMENT_RANKING_MODES,
} from "@/lib/tournaments/match-config";
import {
  TOURNAMENT_POINTS_PER_MATCH_OPTIONS,
  TOURNAMENT_SCORING_TYPES,
} from "@/lib/tournaments/settings";

const tournamentTypeInput = z
  .string()
  .transform((v) => normalizeTournamentType(v))
  .pipe(z.enum(TOURNAMENT_TYPES));

const raceToTargetSchema = z.object({
  value: z.coerce.number().int().min(RACE_TO_CUSTOM_MIN).max(RACE_TO_CUSTOM_MAX),
});

const matchScoringLeafSchema = z.object({
  mode: z.enum(MATCH_SCORING_MODES),
  bestOf: z.union([z.literal(3), z.literal(5)]).optional(),
  setTarget: raceToTargetSchema.optional(),
  raceTo: raceToTargetSchema.optional(),
  totalSets: z.coerce.number().int().min(1).max(RACE_TO_CUSTOM_MAX).optional(),
  customScore: z
    .object({
      variant: z.enum(CUSTOM_SCORE_VARIANTS),
      allowDraw: z.boolean().default(false),
      tiePolicy: z.enum(CUSTOM_SCORE_TIE_POLICIES).default("continue"),
    })
    .optional(),
});

const matchScoringSchema = matchScoringLeafSchema.extend({
  /** Full leaf preferred; partial kept for legacy race-only stage overrides. */
  group: matchScoringLeafSchema.partial().extend({
    mode: z.enum(MATCH_SCORING_MODES).optional(),
  }).optional(),
  knockout: matchScoringLeafSchema.partial().extend({
    mode: z.enum(MATCH_SCORING_MODES).optional(),
  }).optional(),
});

export const tournamentUpsertSchema = z
  .object({
    name: z.string().trim().min(2, "Name is required").max(200),
    slug: z
      .string()
      .trim()
      .min(2)
      .max(120)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers, and hyphens")
      .optional()
      .or(z.literal("")),
    summary: z.string().trim().max(500).optional().or(z.literal("")),
    description: z.string().trim().max(20000).optional().or(z.literal("")),
    status: z.enum(TOURNAMENT_STATUSES).default("upcoming"),
    tournamentType: tournamentTypeInput,
    officialBilling: z.enum(OFFICIAL_BILLING_TYPES).optional().nullable(),
    format: z.enum(TOURNAMENT_FORMATS).default("single_elimination"),
    categoryLabel: z.enum(TOURNAMENT_CATEGORIES).optional().or(z.literal("")),
    rules: z.string().trim().max(50000).optional().or(z.literal("")),
    venue: z.string().trim().max(200).optional().or(z.literal("")),
    venueMapsUrl: z.string().trim().url().max(2000).optional().or(z.literal("")),
    maxTeams: z.coerce.number().int().min(2).max(256).optional(),
    playersPerTeam: z.coerce.number().int().min(1).max(12).default(2),
    registrationFeeIdr: z.coerce.number().int().min(0).optional(),
    prizePoolIdr: z.coerce.number().int().min(0).optional(),
    registrationOpensAt: z.string().datetime().optional().or(z.literal("")),
    registrationClosesAt: z.string().datetime().optional().or(z.literal("")),
    startsAt: z.string().datetime().optional().or(z.literal("")),
    endsAt: z.string().datetime().optional().or(z.literal("")),
    coverImageUrl: z.string().trim().url().max(2000).optional().or(z.literal("")),
    coverImageStorageKey: z.string().trim().max(512).optional().or(z.literal("")),
    eligibilityRules: z.string().trim().max(50000).optional().or(z.literal("")),
    matchFormatRules: z.string().trim().max(50000).optional().or(z.literal("")),
    equipmentStandardsRules: z.string().trim().max(50000).optional().or(z.literal("")),
    gearEntityIds: z.array(z.string().uuid()).max(24).optional(),
    maxRounds: z.coerce.number().int().min(1).max(99).optional(),
    scoringType: z.enum(TOURNAMENT_SCORING_TYPES).default("points"),
    pointsPerMatch: z.coerce
      .number()
      .int()
      .refine(
        (value) => TOURNAMENT_POINTS_PER_MATCH_OPTIONS.includes(value as never),
        "Point per match must be one of the supported options.",
      )
      .default(21),
    matchScoreMode: z.enum(["points", "games"]).optional(),
    raceToGames: z.union([z.literal(2), z.literal(3), z.literal(4), z.literal(6)]).optional(),
    raceToGamesGroup: z.union([z.literal(2), z.literal(3), z.literal(4), z.literal(6)]).optional(),
    raceToGamesKnockout: z
      .union([z.literal(2), z.literal(3), z.literal(4), z.literal(6)])
      .optional(),
    gameDecider: z.enum(["golden_point", "star_point", "advantage"]).optional(),
    matchFormat: z.enum(["race_to_games", "classic_sets"]).optional(),
    courtCount: z.coerce.number().int().min(1).max(12).default(1),
    roundDurationMinutes: z.coerce.number().int().min(1).max(120).optional(),
    suddenDeathExtensionMinutes: z.coerce.number().int().min(1).max(30).optional(),
    maxTeamsPerGroup: z.coerce.number().int().min(2).max(8).optional(),
    teamsAdvancePerGroup: z.coerce.number().int().min(0).max(4).optional(),
    allowDraw: z.boolean().optional(),
    winPoints: z.coerce.number().min(0).max(10).optional(),
    drawPoints: z.coerce.number().min(0).max(10).optional(),
    lossPoints: z.coerce.number().min(0).max(10).optional(),
    thirdPlaceEnabled: z.boolean().optional(),
    bestRunnerUpSlots: z.coerce.number().int().min(0).max(16).optional(),
    scoreEntryMode: z.enum(["live", "paper"]).optional(),
    partnerTenant: z.boolean().optional(),
    partnerLeagueId: z.union([z.string().uuid(), z.literal(""), z.null()]).optional(),
    rankingMode: z.enum(TOURNAMENT_RANKING_MODES).optional(),
    formatFamily: z.enum(TOURNAMENT_FORMAT_FAMILIES).optional(),
    matchScoring: matchScoringSchema.optional(),
    customMatch: z
      .object({
        groupMeetingsPerPair: z.coerce
          .number()
          .int()
          .min(GROUP_MEETINGS_PER_PAIR_MIN)
          .max(GROUP_MEETINGS_PER_PAIR_MAX)
          .default(1),
        knockoutLegsPerSlot: z.coerce
          .number()
          .int()
          .min(KNOCKOUT_LEGS_PER_SLOT_MIN)
          .max(KNOCKOUT_LEGS_PER_SLOT_MAX)
          .default(1),
      })
      .optional(),
    mexicano: z
      .object({
        mode: z.enum(MEXICANO_MODES),
        roundCount: z.coerce.number().int().min(MEXICANO_ROUNDS_MIN).max(MEXICANO_ROUNDS_MAX),
      })
      .optional(),
    allowedTierLevels: z
      .array(z.enum(PLAYER_TIER_LEVELS))
      .max(1, "Official tournaments use exactly one skill tier")
      .optional(),
  })
  .superRefine((data, ctx) => {
    const creatable = OFFICIAL_CREATABLE_FORMATS as readonly string[];
    const partnerLegacyOk =
      data.partnerTenant &&
      ["americano", "single_elimination", "double_stage"].includes(data.format);

    if (!creatable.includes(data.format) && !partnerLegacyOk) {
      ctx.addIssue({
        code: "custom",
        message:
          "Match type must be Group stage+knockout, Americano, Mexicano, Knockout, or Group only.",
        path: ["format"],
      });
    }

    const family = data.formatFamily ?? "original";
    if (
      data.tournamentType === "official" &&
      !data.partnerTenant &&
      !isFormatAllowedForFamily(family, data.format)
    ) {
      ctx.addIssue({
        code: "custom",
        message:
          family === "custom"
            ? "Custom match does not support Mexicano."
            : "Selected format is not available for this match family.",
        path: ["format"],
      });
    }

    if (data.format === "mexicano" && family === "custom") {
      ctx.addIssue({
        code: "custom",
        message: "Mexicano is only available under Original match formats.",
        path: ["format"],
      });
    }

    if (data.format === "mexicano" && !data.mexicano) {
      ctx.addIssue({
        code: "custom",
        message: "Select Mexicano mode (Individual or Team) and round count.",
        path: ["mexicano"],
      });
    }

    if (
      (data.format === "double_stage" || data.format === "group_only") &&
      data.tournamentType !== "official" &&
      !data.partnerTenant
    ) {
      ctx.addIssue({
        code: "custom",
        message: "This format is only available for official or partner tournaments.",
        path: ["format"],
      });
    }

    if (data.format === "double_stage") {
      const maxPer = data.maxTeamsPerGroup ?? 4;
      const advance = data.teamsAdvancePerGroup ?? 2;
      if (advance > maxPer) {
        ctx.addIssue({
          code: "custom",
          message: "Teams advancing per group cannot exceed max teams per group.",
          path: ["teamsAdvancePerGroup"],
        });
      }
    }

    if (data.matchScoring?.mode === "best_of") {
      if (
        data.matchScoring.bestOf != null &&
        !BEST_OF_OPTIONS.includes(data.matchScoring.bestOf as (typeof BEST_OF_OPTIONS)[number])
      ) {
        ctx.addIssue({
          code: "custom",
          message: "Best of must be 3 or 5.",
          path: ["matchScoring", "bestOf"],
        });
      }
    }

    if (data.tournamentType === "official") {
      if (!data.categoryLabel) {
        ctx.addIssue({
          code: "custom",
          message: "Category is required for official tournaments (Male, Female, or Mix).",
          path: ["categoryLabel"],
        });
      }
      if (!data.officialBilling) {
        ctx.addIssue({
          code: "custom",
          message: "Select paid or free for official tournaments.",
          path: ["officialBilling"],
        });
      }
      if (data.officialBilling === "paid") {
        if (!data.registrationFeeIdr || data.registrationFeeIdr <= 0) {
          ctx.addIssue({
            code: "custom",
            message: "Paid official tournaments require a registration fee (IDR).",
            path: ["registrationFeeIdr"],
          });
        }
      }
      if (data.officialBilling === "free" && data.registrationFeeIdr && data.registrationFeeIdr > 0) {
        ctx.addIssue({
          code: "custom",
          message: "Free official tournaments cannot have a registration fee.",
          path: ["registrationFeeIdr"],
        });
      }
      if (!data.partnerTenant) {
        const rankingMode = data.rankingMode ?? "tiered";
        if (rankingMode !== "open") {
          if (!data.allowedTierLevels?.length) {
            ctx.addIssue({
              code: "custom",
              message: "Select the tournament skill tier (or No Rank).",
              path: ["allowedTierLevels"],
            });
          } else if (data.allowedTierLevels.length !== 1) {
            ctx.addIssue({
              code: "custom",
              message: "Official tournaments must use exactly one skill tier.",
              path: ["allowedTierLevels"],
            });
          }
        }
      }
    }

    if (data.tournamentType === "fun_match") {
      if (data.partnerTenant) {
        if (data.officialBilling === "paid") {
          if (!data.registrationFeeIdr || data.registrationFeeIdr <= 0) {
            ctx.addIssue({
              code: "custom",
              message: "Paid partner tournaments require an entry fee (IDR).",
              path: ["registrationFeeIdr"],
            });
          }
        }
        if (data.officialBilling === "free" && data.registrationFeeIdr && data.registrationFeeIdr > 0) {
          ctx.addIssue({
            code: "custom",
            message: "Free partner tournaments cannot have an entry fee.",
            path: ["registrationFeeIdr"],
          });
        }
        if (!data.registrationClosesAt?.trim()) {
          ctx.addIssue({
            code: "custom",
            message: "Registration deadline is required for partner tournaments.",
            path: ["registrationClosesAt"],
          });
        } else if (data.endsAt?.trim()) {
          const end = new Date(data.endsAt).getTime();
          const closes = new Date(data.registrationClosesAt).getTime();
          if (!Number.isNaN(end) && !Number.isNaN(closes) && closes > end) {
            ctx.addIssue({
              code: "custom",
              message: "Registration must close on or before the tournament end.",
              path: ["registrationClosesAt"],
            });
          }
        }
        if (!data.venue?.trim()) {
          ctx.addIssue({
            code: "custom",
            message: "Venue is required for partner tournaments.",
            path: ["venue"],
          });
        }
      } else {
        if (data.officialBilling) {
          ctx.addIssue({
            code: "custom",
            message: "Fun Match tournaments do not use official billing.",
            path: ["officialBilling"],
          });
        }
        if (data.registrationFeeIdr && data.registrationFeeIdr > 0) {
          ctx.addIssue({
            code: "custom",
            message: "Fun Match tournaments must be free (no registration fee).",
            path: ["registrationFeeIdr"],
          });
        }
      }
      if (!data.startsAt?.trim()) {
        ctx.addIssue({
          code: "custom",
          message: "Fun Match sessions require a start date & time.",
          path: ["startsAt"],
        });
      }
      if (!data.endsAt?.trim()) {
        ctx.addIssue({
          code: "custom",
          message: "Fun Match sessions require an end date & time.",
          path: ["endsAt"],
        });
      }
      if (data.startsAt?.trim() && data.endsAt?.trim()) {
        const start = new Date(data.startsAt).getTime();
        const end = new Date(data.endsAt).getTime();
        if (!Number.isNaN(start) && !Number.isNaN(end) && end <= start) {
          ctx.addIssue({
            code: "custom",
            message: "End time must be after start time.",
            path: ["endsAt"],
          });
        }
      }
    }
  });

export type TournamentUpsertInput = z.infer<typeof tournamentUpsertSchema>;

export const tournamentsListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(5).max(50).default(10),
  search: z.string().trim().max(100).optional(),
  status: z.enum([...TOURNAMENT_STATUSES, "all"] as const).default("all"),
  createdBy: z.string().trim().min(1).optional(),
  tournamentType: z.enum(["all", ...TOURNAMENT_TYPES] as const).optional(),
  officialBilling: z.enum(["all", ...OFFICIAL_BILLING_TYPES] as const).optional(),
  format: z
    .enum([
      "all",
      "americano",
      "single_elimination",
      "double_stage",
      "mexicano",
      "group_only",
    ] as const)
    .optional(),
  category: z.enum(["all", ...TOURNAMENT_CATEGORIES] as const).optional(),
  sortBy: z.enum(["startsAt", "name", "updated"]).default("startsAt"),
  sortDir: z.enum(["asc", "desc"]).default("desc"),
});

export type TournamentsListQuery = z.infer<typeof tournamentsListQuerySchema>;

export const publicTournamentsListQuerySchema = tournamentsListQuerySchema.extend({
  bucket: z.enum(["all", "live", "upcoming", "past"]).default("all"),
  type: z.enum(["all", ...TOURNAMENT_TYPES, "recreational"] as const).default("all"),
});

export type PublicTournamentsListQuery = z.infer<typeof publicTournamentsListQuerySchema>;

export const funMatchJoinSchema = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("join_squad"),
    teamId: z.string().uuid(),
  }),
  z.object({
    mode: z.literal("create_squad"),
    teamName: z.string().trim().min(1).max(120).optional(),
  }),
]);

export type FunMatchJoinInput = z.infer<typeof funMatchJoinSchema>;

export const bracketGenerateSchema = z.object({
  seedMode: z.enum(["random", "manual"]).default("manual"),
});

export const inviteRedeemSchema = z
  .object({
    token: z.string().trim().min(1).optional(),
    code: z.string().trim().min(4).max(12).optional(),
    tournamentId: z.string().uuid().optional(),
  })
  .refine((data) => Boolean(data.token?.trim() || data.code?.trim()), {
    message: "Provide an invite token or code.",
  });

export const accessInviteCreateSchema = z.object({
  role: z.enum(["scorekeeper", "bracket_manager"]),
});

export const playerInviteCreateSchema = z.object({
  teamId: z.string().uuid().optional().nullable(),
});
