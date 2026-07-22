import { describe, expect, it } from "vitest";
import {
  optionalAuthUserIdSchema,
  optionalScorerNameSchema,
} from "@/lib/validations/scoring";
import { z } from "zod";

const updateSchema = z.object({
  scorerName: optionalScorerNameSchema,
  scorerUserId: optionalAuthUserIdSchema,
});

describe("scoring validations", () => {
  it("accepts Better Auth text user ids (not only UUIDs)", () => {
    const parsed = updateSchema.safeParse({
      scorerName: "Marina Asalam",
      scorerUserId: "cm3abcXYZ123_betterAuthId",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.scorerUserId).toBe("cm3abcXYZ123_betterAuthId");
    }
  });

  it("still accepts UUID user ids", () => {
    const parsed = updateSchema.safeParse({
      scorerUserId: "550e8400-e29b-41d4-a716-446655440000",
    });
    expect(parsed.success).toBe(true);
  });

  it("strips synthetic roster keys and empty strings", () => {
    const parsed = updateSchema.safeParse({
      scorerName: "   ",
      scorerUserId: "name:0:Marina",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.scorerName).toBeUndefined();
      expect(parsed.data.scorerUserId).toBeUndefined();
    }
  });
});
