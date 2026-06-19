import type { AppRole } from "@/lib/roles/constants";

/** Which bottom tab bar to show for dashboard routes on mobile. */
export function resolveDashboardMobileNavVariant(
  pathname: string,
  roles: AppRole[],
): "player" | "host" {
  if (pathname.startsWith("/dashboard/host")) {
    return "host";
  }

  if (pathname.startsWith("/dashboard/settings")) {
    if (roles.includes("player")) return "player";
    if (roles.includes("host") || roles.includes("super_admin")) return "host";
  }

  const onPublicAppShell =
    pathname === "/" ||
    pathname.startsWith("/sports") ||
    pathname.startsWith("/news") ||
    pathname.startsWith("/about") ||
    pathname.startsWith("/community");

  if (onPublicAppShell) {
    if (roles.includes("player")) return "player";
    if (roles.includes("host") || roles.includes("super_admin")) return "host";
  }

  return "player";
}
