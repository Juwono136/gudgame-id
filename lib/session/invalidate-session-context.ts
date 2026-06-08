import type { QueryClient } from "@tanstack/react-query";

/** Refresh profile menu roles/links after account or admin user changes */
export function invalidateSessionContext(qc: QueryClient) {
  void qc.invalidateQueries({ queryKey: ["session", "context"] });
}
