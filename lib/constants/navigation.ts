import type { LucideIcon } from "lucide-react";
import { HeartHandshake, Newspaper, UserRound, Users } from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export const mainNavItems: NavItem[] = [
  { href: "/players", label: "Players", icon: Users },
  { href: "/news", label: "News", icon: Newspaper },
  { href: "/about", label: "About", icon: UserRound },
  { href: "/community", label: "Community", icon: HeartHandshake },
];

export { authRoutes, dashboardRoutes } from "@/lib/constants/routes";

export function isNavActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
