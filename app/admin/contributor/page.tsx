import { redirect } from "next/navigation";
import { dashboardRoutes } from "@/lib/constants/routes";

/** Legacy URL — host workspace uses the public site shell */
export default function LegacyAdminContributorRedirectPage() {
  redirect(dashboardRoutes.host);
}
