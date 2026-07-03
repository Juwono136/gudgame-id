"use client";

import { useQuery } from "@tanstack/react-query";
import { parseJsonResponse } from "@/lib/api/parse-json-response";
import type { AppRole } from "@/lib/roles/constants";
import type { ProfileMissingField } from "@/lib/auth/profile-completion-shared";

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

export function useSessionContext(enabled = true) {
  return useQuery({
    queryKey: ["session", "context"],
    queryFn: async () => {
      const res = await fetch("/api/account/session-context");
      if (!res.ok) {
        return {
          authenticated: false,
          user: null,
          accountInactive: false,
          roles: [] as AppRole[],
          roleLabels: [],
          dashboardLinks: [],
          canAccessAdmin: false,
          mustChangePassword: false,
        } satisfies SessionContextData;
      }

      const json = await parseJsonResponse<{
        success: boolean;
        data: SessionContextData;
      }>(res);
      return json.data;
    },
    enabled,
    staleTime: 10_000,
    refetchOnWindowFocus: true,
  });
}
