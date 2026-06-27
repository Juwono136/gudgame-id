import { redirect } from "next/navigation";
import { dashboardRoutes } from "@/lib/constants/routes";

export default function HostCreateReclubRedirectPage() {
  redirect(dashboardRoutes.hostTournamentsNew);
}
