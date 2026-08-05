import type { LucideIcon } from "lucide-react";
import { Home, Mail, UserRound } from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export const mainNavItems: NavItem[] = [
  { href: "/", label: "Home", icon: Home },
  { href: "/about", label: "About", icon: UserRound },
  { href: "/contact", label: "Contact Us", icon: Mail },
];

export { authRoutes, dashboardRoutes } from "@/lib/constants/routes";

export function isNavActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
