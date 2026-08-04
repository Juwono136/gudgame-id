import { PartnerBrandingSettingsForm } from "@/components/partners/partner-branding-settings-form";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Branding & landing",
};

export default function PartnerSettingsPage() {
  return <PartnerBrandingSettingsForm />;
}
