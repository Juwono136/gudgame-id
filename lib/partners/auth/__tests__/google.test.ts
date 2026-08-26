import { describe, expect, it } from "vitest";
import { isPostgresUniqueViolation } from "@/lib/partners/auth/db-errors";
import { partnerPlayerGoogleAuthSchema } from "@/lib/validations/partner-auth";

describe("partner Google auth helpers", () => {
  it("detects Postgres unique violations", () => {
    expect(isPostgresUniqueViolation({ code: "23505" })).toBe(true);
    expect(isPostgresUniqueViolation({ cause: { code: "23505" } })).toBe(true);
    expect(
      isPostgresUniqueViolation(new Error("duplicate key value violates unique constraint")),
    ).toBe(true);
    expect(isPostgresUniqueViolation({ code: "23503" })).toBe(false);
    expect(isPostgresUniqueViolation(null)).toBe(false);
    expect(isPostgresUniqueViolation("nope")).toBe(false);
  });

  it("validates Google auth body", () => {
    expect(
      partnerPlayerGoogleAuthSchema.safeParse({ idToken: "short" }).success,
    ).toBe(false);
    expect(
      partnerPlayerGoogleAuthSchema.safeParse({
        idToken: "a-valid-looking-token",
        callbackUrl: "/acme/account",
      }).success,
    ).toBe(true);
  });
});
