import { describe, expect, it } from "vitest";
import {
  partnerEligibilityListQuerySchema,
  partnerLeaguesListQuerySchema,
  partnerTournamentsListQuerySchema,
  toPartnerPagedResult,
} from "@/lib/partners/list-query";

describe("partner list query schemas", () => {
  it("parses tournament defaults", () => {
    const q = partnerTournamentsListQuerySchema.parse({});
    expect(q.page).toBe(1);
    expect(q.pageSize).toBe(20);
    expect(q.status).toBe("all");
    expect(q.sortBy).toBe("updatedAt");
  });

  it("parses league status public", () => {
    const q = partnerLeaguesListQuerySchema.parse({ status: "public", page: "2" });
    expect(q.status).toBe("public");
    expect(q.page).toBe(2);
  });

  it("parses eligibility search", () => {
    const q = partnerEligibilityListQuerySchema.parse({ q: "ada", sortBy: "playerName" });
    expect(q.q).toBe("ada");
    expect(q.sortBy).toBe("playerName");
  });

  it("builds paged result meta", () => {
    const result = toPartnerPagedResult([{ id: 1 }], 45, 2, 20);
    expect(result.totalPages).toBe(3);
    expect(result.items).toHaveLength(1);
  });
});
