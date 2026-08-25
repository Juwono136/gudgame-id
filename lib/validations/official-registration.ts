import { z } from "zod";

const pendingInviteSchema = z.object({
  kind: z.literal("pending"),
  displayName: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(255),
  phone: z
    .string()
    .trim()
    .max(32)
    .optional()
    .nullable()
    .transform((v) => (v && v.trim() ? v.trim() : null)),
});

const linkedMemberSchema = z.object({
  kind: z.literal("linked"),
  userId: z.string().min(1),
});

export const officialRosterMemberSchema = z.discriminatedUnion("kind", [
  linkedMemberSchema,
  pendingInviteSchema,
]);

export const startOfficialRegistrationSchema = z.object({
  teamName: z.string().trim().max(120).optional().default(""),
  members: z.array(officialRosterMemberSchema).max(8).default([]),
  /** @deprecated Prefer `members`. Kept for older clients. */
  memberUserIds: z.array(z.string().min(1)).max(8).optional(),
});

export const updateOfficialRegistrationSchema = z.object({
  sportSlug: z.string().min(1),
  slug: z.string().min(1),
  teamName: z.string().trim().min(2).max(120),
  members: z.array(officialRosterMemberSchema).max(11).default([]),
  /** @deprecated Prefer `members`. */
  memberUserIds: z.array(z.string().min(1)).max(11).optional(),
});

export type OfficialRosterMemberInput = z.infer<typeof officialRosterMemberSchema>;
export type StartOfficialRegistrationInput = z.infer<typeof startOfficialRegistrationSchema>;
export type UpdateOfficialRegistrationInput = z.infer<typeof updateOfficialRegistrationSchema>;

/** Merge legacy memberUserIds into members when `members` is empty. */
export function normalizeOfficialRosterMembers(input: {
  members?: OfficialRosterMemberInput[];
  memberUserIds?: string[];
}): OfficialRosterMemberInput[] {
  if (input.members?.length) return input.members;
  return (input.memberUserIds ?? []).map((userId) => ({
    kind: "linked" as const,
    userId,
  }));
}
