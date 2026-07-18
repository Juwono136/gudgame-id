import { z } from "zod";
import {
  OFFICIAL_BILLING_TYPES,
  TOURNAMENT_CATEGORIES,
  TOURNAMENT_FORMATS,
  TOURNAMENT_STATUSES,
  TOURNAMENT_TYPES,
} from "@/db/schema/tournaments";
import { normalizeTournamentType } from "@/lib/tournaments/core/types";
import {
  TOURNAMENT_POINTS_PER_MATCH_OPTIONS,
  TOURNAMENT_SCORING_TYPES,
} from "@/lib/tournaments/settings";

const tournamentTypeInput = z
  .string()
  .transform((v) => normalizeTournamentType(v))
  .pipe(z.enum(TOURNAMENT_TYPES));

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
    categoryLabel: z
      .enum(TOURNAMENT_CATEGORIES)
      .optional()
      .or(z.literal("")),
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
    gameDecider: z.enum(["golden_point", "advantage"]).optional(),
    courtCount: z.coerce.number().int().min(1).max(12).default(1),
    roundDurationMinutes: z.coerce.number().int().min(1).max(120).optional(),
    maxTeamsPerGroup: z.coerce.number().int().min(2).max(8).optional(),
    teamsAdvancePerGroup: z.coerce.number().int().min(1).max(4).optional(),
    allowDraw: z.boolean().optional(),
    winPoints: z.coerce.number().min(0).max(10).optional(),
    drawPoints: z.coerce.number().min(0).max(10).optional(),
    lossPoints: z.coerce.number().min(0).max(10).optional(),
    thirdPlaceEnabled: z.boolean().optional(),
  })
  .superRefine((data, ctx) => {
    const allowedFormats = ["americano", "single_elimination", "double_stage"] as const;
    if (!allowedFormats.includes(data.format as (typeof allowedFormats)[number])) {
      ctx.addIssue({
        code: "custom",
        message: "Match type must be Americano, Elimination, or Double Stage.",
        path: ["format"],
      });
    }

    if (data.format === "double_stage" && data.tournamentType !== "official") {
      ctx.addIssue({
        code: "custom",
        message: "Double Stage is only available for official tournaments.",
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

    if (data.categoryLabel && !TOURNAMENT_CATEGORIES.includes(data.categoryLabel as never)) {
      ctx.addIssue({
        code: "custom",
        message: "Category must be Male, Female, or Mix.",
        path: ["categoryLabel"],
      });
    }

    if (data.tournamentType === "official") {
      if (!data.categoryLabel) {
        ctx.addIssue({
          code: "custom",
          message: "Category is required for official tournaments (Male, Female, or Mix).",
          path: ["categoryLabel"],
        });
      }
      if (!data.format) {
        ctx.addIssue({
          code: "custom",
          message: "Match format is required for official tournaments.",
          path: ["format"],
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
      if (data.officialBilling === "free") {
        if (data.registrationFeeIdr && data.registrationFeeIdr > 0) {
          ctx.addIssue({
            code: "custom",
            message: "Free official tournaments cannot have a registration fee.",
            path: ["registrationFeeIdr"],
          });
        }
      }
    }

    if (data.tournamentType === "fun_match") {
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
  format: z.enum(["all", "americano", "single_elimination", "double_stage"] as const).optional(),
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
  email: z.string().trim().email().optional(),
  role: z.enum(["scorekeeper", "bracket_manager"]),
});

export const playerInviteCreateSchema = z.object({
  teamId: z.string().uuid().optional().nullable(),
});
