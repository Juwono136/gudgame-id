import type { AppRole } from "@/lib/roles/constants";

/** Player/Host workspace switcher — only when the user explicitly has the host role. */
export function canShowHostWorkspaceSwitcher(roles: AppRole[]): boolean {
  return roles.includes("host");
}
