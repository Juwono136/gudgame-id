import { describe, expect, it } from "vitest";
import {
  isSyntheticPartnerPhone,
  isValidPartnerPhone,
  partnerPhoneForAutofill,
} from "@/lib/partners/registration/phone";

describe("partner registration phone helpers", () => {
  it("accepts Indonesian mobiles", () => {
    expect(isValidPartnerPhone("081234567890")).toBe(true);
    expect(isValidPartnerPhone("+62 812-3456-7890")).toBe(true);
    expect(isValidPartnerPhone("6281234567890")).toBe(true);
  });

  it("rejects empty and synthetic oauth phones", () => {
    expect(isValidPartnerPhone("")).toBe(false);
    expect(isSyntheticPartnerPhone("pabcdef012345678")).toBe(true);
    expect(partnerPhoneForAutofill("pabcdef012345678")).toBeNull();
    expect(partnerPhoneForAutofill("081234567890")).toBe("081234567890");
    expect(partnerPhoneForAutofill(null)).toBeNull();
  });
});
