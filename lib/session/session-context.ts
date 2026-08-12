import { parseJsonResponse } from "@/lib/api/parse-json-response";
import type { AppRole } from "@/lib/roles/constants";
import type { ProfileMissingField } from "@/lib/auth/profile-completion-shared";

export const SESSION_CONTEXT_QUERY_KEY = ["session", "context"] as const;

export type SessionDashboardLink = {
  role: AppRole;
  label: string;
  href: string;
};

export type SessionContextUser = {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  nickname?: string | null;
  role?: string | null;
};

export type SessionContextData = {
  authenticated: boolean;
  user?: SessionContextUser | null;
  accountInactive?: boolean;
  roles: AppRole[];
  roleLabels: string[];
  dashboardLinks: SessionDashboardLink[];
  canAccessAdmin: boolean;
  permissions?: string[];
  mustChangePassword?: boolean;
  profileComplete?: boolean;
  profileCompletionPercent?: number;
  missingProfileFields?: ProfileMissingField[];
  isGoogleOnly?: boolean;
  hasGoogle?: boolean;
};

export async function fetchSessionContext(): Promise<SessionContextData> {
  const res = await fetch("/api/account/session-context", { cache: "no-store" });
  if (!res.ok) {
    return {
      authenticated: false,
      user: null,
      accountInactive: false,
      roles: [],
      roleLabels: [],
      dashboardLinks: [],
      canAccessAdmin: false,
      mustChangePassword: false,
    };
  }

  const json = await parseJsonResponse<{
    success: boolean;
    data: SessionContextData;
  }>(res);
  return json.data;
}
