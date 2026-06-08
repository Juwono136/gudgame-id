import { redirect } from "next/navigation";
import { dashboardRoutes } from "@/lib/constants/routes";

/** Legacy URL — contributor workspace uses the public site shell */
export default function AdminContributorRedirectPage() {
  redirect(dashboardRoutes.contributor);
}
