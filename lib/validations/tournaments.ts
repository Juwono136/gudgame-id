import { z } from "zod";
import {
  TOURNAMENT_FORMATS,
  TOURNAMENT_STATUSES,
  TOURNAMENT_TYPES,
} from "@/db/schema/tournaments";

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
    tournamentType: z.enum(TOURNAMENT_TYPES),
    format: z.enum(TOURNAMENT_FORMATS).default("single_elimination"),
    categoryLabel: z.string().trim().max(80).optional().or(z.literal("")),
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
  })
  .superRefine((data, ctx) => {
    if (data.tournamentType === "official") {
      if (!data.registrationFeeIdr || data.registrationFeeIdr <= 0) {
        ctx.addIssue({
          code: "custom",
          message: "Official tournaments require a registration fee (IDR).",
          path: ["registrationFeeIdr"],
        });
      }
    }
    if (data.tournamentType === "recreational" && data.registrationFeeIdr && data.registrationFeeIdr > 0) {
      ctx.addIssue({
        code: "custom",
        message: "Reclub tournaments must be free (no registration fee).",
        path: ["registrationFeeIdr"],
      });
    }
    if (data.tournamentType === "recreational") {
      if (!data.startsAt?.trim()) {
        ctx.addIssue({
          code: "custom",
          message: "Reclub sessions require a start date & time.",
          path: ["startsAt"],
        });
      }
      if (!data.endsAt?.trim()) {
        ctx.addIssue({
          code: "custom",
          message: "Reclub sessions require an end date & time.",
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
  sortBy: z.enum(["startsAt", "name", "updated"]).default("startsAt"),
  sortDir: z.enum(["asc", "desc"]).default("desc"),
});

export type TournamentsListQuery = z.infer<typeof tournamentsListQuerySchema>;

export const publicTournamentsListQuerySchema = tournamentsListQuerySchema.extend({
  bucket: z.enum(["all", "live", "upcoming", "past"]).default("all"),
  type: z.enum(["all", ...TOURNAMENT_TYPES] as const).default("all"),
});

export type PublicTournamentsListQuery = z.infer<typeof publicTournamentsListQuerySchema>;
