"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Banknote,
  ExternalLink,
  Loader2,
  Trash2,
  Users,
  GitBranch,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LoadingOverlay } from "@/components/ui/loading-overlay";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useDeleteHostTournament,
  useHostTournamentWorkspace,
  useUpdateTournamentStatus,
} from "@/hooks/use-host-tournaments";
import { useGenerateBracket, useTournamentBracket } from "@/hooks/use-tournament-bracket";
import { dashboardRoutes, publicSportRoutes } from "@/lib/constants/routes";
import { TOURNAMENT_STATUSES, type TournamentStatus } from "@/lib/domain/tournaments";
import { useConfirmDialog } from "@/providers/confirm-dialog-provider";

function formatIdr(amount: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}

type HostTournamentWorkspaceProps = {
  tournamentId: number;
};

const STATUS_LABELS: Record<TournamentStatus, string> = {
  draft: "Draft",
  upcoming: "Upcoming",
  live: "Live",
  completed: "Completed",
  cancelled: "Cancelled",
};

export function HostTournamentWorkspace({ tournamentId }: HostTournamentWorkspaceProps) {
  const router = useRouter();
  const { confirm } = useConfirmDialog();
  const { data: ws, isLoading, isError, error } = useHostTournamentWorkspace(tournamentId);
  const updateStatus = useUpdateTournamentStatus(tournamentId);
  const generateBracket = useGenerateBracket(tournamentId);
  const deleteTournament = useDeleteHostTournament();

  const sportSlug = ws?.tournament.sportSlug ?? "";
  const tournamentSlug = ws?.tournament.slug ?? "";
  const isOfficial = ws?.tournament.tournamentType === "official";

  const { data: bracketData } = useTournamentBracket(sportSlug, tournamentSlug, {
    enabled: isOfficial,
  });

  const handleStatusChange = async (status: TournamentStatus) => {
    const ok = await confirm({
      title: `Set status to "${STATUS_LABELS[status]}"?`,
      description: "Players will see this status on the public tournament page.",
      confirmLabel: "Update",
      cancelLabel: "Cancel",
    });
    if (!ok) return;
    updateStatus.mutate(status);
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <LoadingSpinner label="Loading workspace…" />
      </div>
    );
  }

  if (isError || !ws) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center text-sm text-red-300">
        {error instanceof Error ? error.message : "Workspace unavailable"}
      </div>
    );
  }

  const { tournament, summary, teams, matches, registrations, revenue } = ws;

  const handleDelete = async () => {
    const ok = await confirm({
      title: "Delete this tournament?",
      description: "This cannot be undone. Tournaments with paid registrations cannot be deleted.",
      confirmLabel: "Delete",
      cancelLabel: "Cancel",
      variant: "destructive",
    });
    if (!ok) return;
    deleteTournament.mutate(tournamentId, {
      onSuccess: () => router.push(dashboardRoutes.hostTournaments),
    });
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <LoadingOverlay show={updateStatus.isPending} label="Updating…" />

      <Link
        href={dashboardRoutes.hostTournaments}
        className="inline-flex items-center text-sm text-cp-muted hover:text-foreground"
      >
        <ArrowLeft className="mr-1 h-4 w-4" />
        All tournaments
      </Link>

      <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap gap-2">
            <Badge className="border-cp-border bg-cp-elevated capitalize">
              {tournament.tournamentType}
            </Badge>
            <Badge className="border-cp-border bg-cp-elevated capitalize">
              {tournament.status}
            </Badge>
          </div>
          <h1 className="mt-3 text-2xl font-bold text-foreground sm:text-3xl">{tournament.name}</h1>
          <p className="mt-1 text-sm text-cp-muted">
            {tournament.sportName} · {summary.registeredPlayers} players ·{" "}
            {summary.registeredTeams} teams
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Select
            value={tournament.status}
            onValueChange={(v) => void handleStatusChange(v as TournamentStatus)}
          >
            <SelectTrigger className="w-[160px] border-cp-border bg-cp-bg-input">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              {TOURNAMENT_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {STATUS_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button asChild variant="outline" className="border-cp-border">
            <Link
              href={publicSportRoutes.tournament(tournament.sportSlug, tournament.slug)}
              target="_blank"
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              Public page
            </Link>
          </Button>
          <Button
            variant="outline"
            className="border-red-500/40 text-red-300"
            disabled={deleteTournament.isPending}
            onClick={() => void handleDelete()}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>

      {tournament.tournamentType === "official" ? (
        <div className="mt-6 flex flex-wrap gap-3">
          <Button
            className="bg-cp-primary"
            disabled={generateBracket.isPending || bracketData?.generated}
            onClick={() => generateBracket.mutate()}
          >
            <GitBranch className="mr-2 h-4 w-4" />
            {bracketData?.generated ? "Bracket generated" : "Generate bracket"}
          </Button>
        </div>
      ) : null}

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Players" value={String(summary.registeredPlayers)} icon={Users} />
        <StatCard label="Teams" value={String(summary.registeredTeams)} icon={Users} />
        {tournament.tournamentType === "official" ? (
          <>
            <StatCard
              label="Collected"
              value={formatIdr(revenue.totalCollectedIdr)}
              icon={Banknote}
            />
            <StatCard
              label="Your payout"
              value={formatIdr(revenue.hostPayoutIdr)}
              icon={Banknote}
            />
          </>
        ) : (
          <StatCard label="Rounds played" value={String(matches.length)} icon={Users} />
        )}
      </div>

      {tournament.tournamentType === "official" && registrations.length > 0 ? (
        <section className="mt-10">
          <h2 className="text-lg font-semibold text-foreground">Registrations & payments</h2>
          <div className="mt-4 overflow-x-auto rounded-2xl border border-cp-border">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead className="border-b border-cp-border bg-cp-elevated/50 text-xs uppercase text-cp-muted">
                <tr>
                  <th className="px-4 py-3">Team</th>
                  <th className="px-4 py-3">Captain</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Payment</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {registrations.map((r) => (
                  <tr key={r.id} className="border-b border-cp-border/60 last:border-0">
                    <td className="px-4 py-3 font-medium">{r.teamName ?? "—"}</td>
                    <td className="px-4 py-3 text-cp-muted">{r.registeredByName}</td>
                    <td className="px-4 py-3 capitalize">{r.status}</td>
                    <td className="px-4 py-3">
                      <Badge variant="muted" className="capitalize">
                        {r.paymentStatus ?? "—"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {r.amountIdr != null ? formatIdr(r.amountIdr) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {tournament.tournamentType === "recreational" ? (
        <section className="mt-10">
          <h2 className="text-lg font-semibold text-foreground">Lobby & rounds</h2>
          <p className="mt-1 text-sm text-cp-muted">
            Manage live rounds from the public reclub lobby page.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {teams.map((team, i) => (
              <motion.div
                key={team.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="rounded-xl border border-cp-border bg-cp-card p-4"
              >
                <p className="font-medium text-foreground">{team.name}</p>
                <p className="mt-1 text-xs text-cp-muted">
                  {team.memberCount} / {tournament.playersPerTeam} ·{" "}
                  {team.members.map((m) => m.displayName).join(", ") || "Empty"}
                </p>
              </motion.div>
            ))}
          </div>
          {matches.length > 0 ? (
            <ul className="mt-4 space-y-2">
              {matches.map((m) => (
                <li
                  key={m.id}
                  className="rounded-lg border border-cp-border bg-cp-card/60 px-4 py-2 text-sm"
                >
                  R{m.roundNumber}: {m.teamAName} {m.scoreA ?? "–"} – {m.scoreB ?? "–"} {m.teamBName}
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-2xl border border-cp-border bg-cp-card p-5">
      <Icon className="h-5 w-5 text-cp-primary" />
      <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-cp-muted">{label}</p>
      <p className="mt-1 text-xl font-bold text-foreground">{value}</p>
    </div>
  );
}
