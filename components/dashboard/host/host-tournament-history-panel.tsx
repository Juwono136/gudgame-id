"use client";

import { HostTournamentsScopedList } from "@/components/dashboard/host/host-tournaments-scoped-list";

/** History tab wrapper — completed / cancelled events + final records. */
export function HostTournamentHistoryPanel() {
  return <HostTournamentsScopedList scope="history" />;
}
