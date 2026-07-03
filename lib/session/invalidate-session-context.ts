import type { QueryClient } from "@tanstack/react-query";
import { refreshClientAuthSession } from "@/lib/session/refresh-client-auth-session";

/** Refresh profile menu roles/links after account or admin user changes */
export function invalidateSessionContext(qc: QueryClient) {
  void qc.invalidateQueries({ queryKey: ["session", "context"] });
}

/** After login/logout: sync Better Auth client cache + refetch session context. */
export async function syncAuthSessionAfterChange(qc: QueryClient): Promise<void> {
  await refreshClientAuthSession();
  invalidateSessionContext(qc);
  await qc.refetchQueries({ queryKey: ["session", "context"] });
}
