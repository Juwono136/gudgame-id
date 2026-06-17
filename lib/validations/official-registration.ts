import { z } from "zod";

export const updateOfficialRegistrationSchema = z.object({
  sportSlug: z.string().min(1),
  slug: z.string().min(1),
  teamName: z.string().trim().min(2).max(120),
  memberUserIds: z.array(z.string().min(1)).max(11).default([]),
});

export type UpdateOfficialRegistrationInput = z.infer<typeof updateOfficialRegistrationSchema>;
