"use client";

import { Badge } from "@/components/ui/badge";
import { WorkspaceSection } from "@/components/dashboard/host/host-tournament-ui";

type RegistrationRow = {
  id: number;
  status: string;
  teamName: string | null;
  registeredByName: string;
  paymentStatus: string | null;
  amountIdr: number | null;
  confirmedAt: string | null;
  paymentDueAt: string | null;
  members: { userId: string; displayName: string; role: string }[];
};

function formatIdr(amount: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}

type HostOfficialRegistrationsPanelProps = {
  registrations: RegistrationRow[];
};

export function HostOfficialRegistrationsPanel({
  registrations,
}: HostOfficialRegistrationsPanelProps) {
  if (registrations.length === 0) {
    return (
      <WorkspaceSection
        title="Registrations & payments"
        description="Teams will appear here once players register for your event."
      >
        <div className="rounded-2xl border border-dashed border-cp-border px-4 py-10 text-center text-sm text-cp-muted">
          No registrations yet.
        </div>
      </WorkspaceSection>
    );
  }

  return (
    <WorkspaceSection
      title="Registrations & payments"
      description="All teams that registered — including awaiting confirmation and pending payment."
    >
      <div className="space-y-3 sm:space-y-4">
        {registrations.map((r) => (
          <article
            key={r.id}
            className="overflow-hidden rounded-2xl border border-cp-border bg-cp-card cp-shadow-card"
          >
            <div className="flex flex-col gap-3 border-b border-cp-border bg-cp-elevated/40 p-4 sm:flex-row sm:items-start sm:justify-between sm:px-5">
              <div className="min-w-0">
                <p className="font-semibold text-foreground">{r.teamName ?? "—"}</p>
                <p className="mt-0.5 text-xs text-cp-muted">
                  Captain: {r.registeredByName} · Registration #{r.id}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="muted" className="capitalize">
                  {r.status.replace(/_/g, " ")}
                </Badge>
                <Badge variant="muted" className="capitalize">
                  {r.paymentStatus ?? "no payment"}
                </Badge>
                {r.amountIdr != null ? (
                  <Badge className="border-0 bg-cp-primary/15 text-cp-primary">
                    {formatIdr(r.amountIdr)}
                  </Badge>
                ) : null}
              </div>
            </div>
            <div className="grid gap-4 p-4 sm:grid-cols-2 sm:px-5 sm:py-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-cp-muted">
                  Team roster
                </p>
                <ul className="mt-2 space-y-1.5">
                  {r.members.length ? (
                    r.members.map((m) => (
                      <li key={m.userId} className="text-sm text-foreground">
                        {m.displayName}
                        <span className="ml-1 text-xs capitalize text-cp-muted">({m.role})</span>
                      </li>
                    ))
                  ) : (
                    <li className="text-sm text-cp-muted">No members listed</li>
                  )}
                </ul>
              </div>
              <div className="space-y-1 text-xs text-cp-muted">
                {r.confirmedAt ? (
                  <p>Confirmed: {new Date(r.confirmedAt).toLocaleString()}</p>
                ) : null}
                {r.paymentDueAt ? (
                  <p>Payment due: {new Date(r.paymentDueAt).toLocaleString()}</p>
                ) : null}
              </div>
            </div>
          </article>
        ))}
      </div>
    </WorkspaceSection>
  );
}
