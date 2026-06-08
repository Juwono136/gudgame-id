import { redirect } from "next/navigation";
import { dashboardRoutes } from "@/lib/constants/routes";

/** Legacy URL — contributor role renamed to host */
export default function LegacyContributorDashboardPage() {
  redirect(dashboardRoutes.host);
}
