"use client";

import { useConfirmDialog } from "@/providers/confirm-dialog-provider";
import { useLogoutMutation } from "@/hooks/use-logout-mutation";
import { siteConfig } from "@/lib/config/site";

type UseLogoutWithConfirmOptions = {
  onNavigate?: () => void;
};

export function useLogoutWithConfirm(options?: UseLogoutWithConfirmOptions) {
  const { confirm } = useConfirmDialog();
  const logout = useLogoutMutation();

  const requestLogout = async () => {
    const confirmed = await confirm({
      title: `Sign out of ${siteConfig.shortName}?`,
      description:
        "You will need to sign in again to access your dashboard and settings. Unsaved changes on open pages may be lost.",
      confirmLabel: "Sign out",
      cancelLabel: "Stay signed in",
      variant: "destructive",
    });

    if (confirmed) {
      options?.onNavigate?.();
      logout.mutate();
    }
  };

  return { requestLogout, isLoggingOut: logout.isPending };
}
