import { redirect } from "next/navigation";
import { dashboardRoutes } from "@/lib/constants/routes";

export default function PlayerMatchesRedirectPage() {
  redirect(`${dashboardRoutes.tournaments}?scope=history`);
}
