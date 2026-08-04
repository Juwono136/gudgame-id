"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ExternalLink, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PartnerPageHeader } from "@/components/partners/partner-page-header";
import { PartnerStatusBadge } from "@/components/partners/partner-status-badge";
import { PartnerLeagueMatchesPanel } from "@/components/partners/partner-league-matches-panel";
import { Button } from "@/components/ui/button";
import { partnerPageWidthClass } from "@/lib/partners/layout";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingOverlay } from "@/components/ui/loading-overlay";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { parseJsonResponse } from "@/lib/api/parse-json-response";
import { dashboardRoutes, partnerPublicRoutes } from "@/lib/constants/routes";
import type {
  PartnerLeagueDetail,
  PartnerLeagueMatchView,
  PartnerLeagueStatus,
} from "@/lib/partners/league-types";
import {
  cpSelectContentClass,
  cpSelectItemClass,
  cpSelectTriggerClass,
} from "@/lib/styles/surface-classes";
import { useConfirmDialog } from "@/providers/confirm-dialog-provider";

const LEAGUE_STATUS_OPTIONS: { value: PartnerLeagueStatus; label: string }[] = [
  { value: "draft", label: "Draft" },
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
  { value: "archived", label: "Archived" },
];

type PartnerLeagueManageClientProps = {
  leagueId: string;
  partnerSlug: string;
  initialLeague: PartnerLeagueDetail;
};

export function PartnerLeagueManageClient({
  leagueId,
  partnerSlug,
  initialLeague,
}: PartnerLeagueManageClientProps) {
  const router = useRouter();
  const { confirm } = useConfirmDialog();
  const [league, setLeague] = useState(initialLeague);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [busyLabel, setBusyLabel] = useState("Saving…");

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [editName, setEditName] = useState(initialLeague.name);
  const [editStatus, setEditStatus] = useState<PartnerLeagueStatus>(initialLeague.status);

  const [teamDialogOpen, setTeamDialogOpen] = useState(false);
  const [teamName, setTeamName] = useState("");

  const [matchDialogOpen, setMatchDialogOpen] = useState(false);
  const [teamAId, setTeamAId] = useState("");
  const [teamBId, setTeamBId] = useState("");

  const [scoreMatch, setScoreMatch] = useState<PartnerLeagueMatchView | null>(null);
  const [scoreA, setScoreA] = useState("");
  const [scoreB, setScoreB] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/partner/leagues/${leagueId}`);
      const json = await parseJsonResponse<{ success: true; data: PartnerLeagueDetail }>(res);
      if (res.ok && "data" in json) setLeague(json.data);
    } finally {
      setLoading(false);
    }
  }, [leagueId]);

  useEffect(() => {
    setLeague(initialLeague);
  }, [initialLeague]);

  const openSettings = () => {
    setEditName(league.name);
    setEditStatus(league.status);
    setSettingsOpen(true);
  };

  const saveSettings = async () => {
    const name = editName.trim();
    if (name.length < 2) {
      toast.error("Name must be at least 2 characters");
      return;
    }
    setBusyLabel("Saving settings…");
    setBusy(true);
    try {
      const res = await fetch(`/api/partner/leagues/${leagueId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, status: editStatus }),
      });
      const json = await parseJsonResponse<{ success: true; data: PartnerLeagueDetail }>(res);
      if (!res.ok || !("data" in json)) {
        toast.error(
          (json as { error?: { message?: string } }).error?.message ?? "Could not update league",
        );
        return;
      }
      setLeague(json.data);
      setSettingsOpen(false);
      toast.success("League settings saved");
    } finally {
      setBusy(false);
    }
  };

  const deleteLeague = async () => {
    const ok = await confirm({
      title: `Delete "${league.name}"?`,
      description:
        "This permanently removes the league, teams, matches, and standings. This cannot be undone.",
      confirmLabel: "Delete league",
      cancelLabel: "Cancel",
      variant: "destructive",
    });
    if (!ok) return;

    setBusyLabel("Deleting league…");
    setBusy(true);
    try {
      const res = await fetch(`/api/partner/leagues/${leagueId}`, { method: "DELETE" });
      const json = await parseJsonResponse(res);
      if (!res.ok) {
        toast.error(
          (json as { error?: { message?: string } }).error?.message ?? "Could not delete league",
        );
        return;
      }
      toast.success("League deleted");
      router.push(dashboardRoutes.partnerLeagues);
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  const addTeam = async () => {
    if (teamName.trim().length < 1) {
      toast.error("Enter a team name");
      return;
    }
    setBusyLabel("Saving…");
    setBusy(true);
    try {
      const res = await fetch(`/api/partner/leagues/${leagueId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "add_team", name: teamName.trim() }),
      });
      const json = await parseJsonResponse(res);
      if (!res.ok) {
        toast.error(
          (json as { error?: { message?: string } }).error?.message ?? "Could not add team",
        );
        return;
      }
      toast.success("Team added");
      setTeamName("");
      setTeamDialogOpen(false);
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const createMatch = async () => {
    if (!teamAId || !teamBId) {
      toast.error("Select both teams");
      return;
    }
    setBusyLabel("Saving…");
    setBusy(true);
    try {
      const res = await fetch(`/api/partner/leagues/${leagueId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create_match", teamAId, teamBId }),
      });
      const json = await parseJsonResponse(res);
      if (!res.ok) {
        toast.error(
          (json as { error?: { message?: string } }).error?.message ?? "Could not create match",
        );
        return;
      }
      toast.success("Match scheduled");
      setMatchDialogOpen(false);
      setTeamAId("");
      setTeamBId("");
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const saveScore = async () => {
    if (!scoreMatch) return;
    const a = Number(scoreA);
    const b = Number(scoreB);
    if (!Number.isInteger(a) || !Number.isInteger(b) || a < 0 || b < 0) {
      toast.error("Enter valid non-negative scores");
      return;
    }

    const isEdit = scoreMatch.status === "completed";
    const ok = await confirm({
      title: isEdit ? "Update match score?" : "Save match score?",
      description: (
        <>
          Record{" "}
          <span className="font-medium text-foreground">
            {scoreMatch.teamAName} {a}–{b} {scoreMatch.teamBName}
          </span>
          . League standings will update immediately.
          {isEdit ? " Previous result will be replaced." : null}
        </>
      ),
      confirmLabel: isEdit ? "Update score" : "Save score",
      variant: isEdit ? "destructive" : "default",
    });
    if (!ok) return;

    setBusyLabel("Saving…");
    setBusy(true);
    try {
      const res = await fetch(
        `/api/partner/leagues/${leagueId}/matches/${scoreMatch.id}/score`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ scoreA: a, scoreB: b }),
        },
      );
      const json = await parseJsonResponse(res);
      if (!res.ok) {
        toast.error(
          (json as { error?: { message?: string } }).error?.message ?? "Could not save score",
        );
        return;
      }
      toast.success("Score recorded");
      setScoreMatch(null);
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const publicHref = partnerPublicRoutes.league(partnerSlug, league.slug);

  return (
    <div className={cn("relative space-y-6 py-8", partnerPageWidthClass)}>
        {(busy || loading) && (
          <LoadingOverlay
            show
            label={busy ? busyLabel : "Refreshing…"}
          />
        )}

        <PartnerPageHeader
          backHref={dashboardRoutes.partnerLeagues}
          backLabel="Leagues"
          title={league.name}
          description={
            <span className="mt-1 flex flex-wrap items-center gap-2">
              <PartnerStatusBadge status={league.status} />
              <span>
                {league.sportName} · {league.teamCount} teams · {league.matchCount} matches
              </span>
            </span>
          }
          actions={
            <>
              <Button asChild variant="outline" className="border-cp-border">
                <Link href={publicHref} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Public page
                </Link>
              </Button>
              <Button
                type="button"
                variant="outline"
                className="border-cp-border"
                onClick={openSettings}
              >
                <Pencil className="mr-2 h-4 w-4" />
                Edit settings
              </Button>
              <Button
                type="button"
                variant="outline"
                className="border-destructive/40 text-destructive hover:bg-destructive/10"
                onClick={() => void deleteLeague()}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
              <Button
                type="button"
                variant="outline"
                className="border-cp-border"
                onClick={() => setTeamDialogOpen(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add team
              </Button>
              <Button
                type="button"
                className="bg-cp-primary hover:bg-cp-primary-light"
                onClick={() => setMatchDialogOpen(true)}
                disabled={league.teams.length < 2}
              >
                <Plus className="mr-2 h-4 w-4" />
                New match
              </Button>
            </>
          }
        />

        <section className="overflow-hidden rounded-2xl border border-cp-border bg-cp-card shadow-sm">
          <div className="border-b border-cp-border px-4 py-3 sm:px-5">
            <h2 className="text-sm font-semibold text-foreground">Standings</h2>
          </div>
          {league.standings.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-cp-muted sm:px-5">
              Add teams to start the table.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[36rem] text-left text-sm">
                <thead className="border-b border-cp-border bg-cp-elevated/40 text-[11px] uppercase tracking-wider text-cp-muted">
                  <tr>
                    <th className="px-3 py-2 font-semibold sm:px-4">#</th>
                    <th className="px-3 py-2 font-semibold sm:px-4">Team</th>
                    <th className="px-3 py-2 font-semibold tabular-nums sm:px-4">P</th>
                    <th className="px-3 py-2 font-semibold tabular-nums sm:px-4">W</th>
                    <th className="px-3 py-2 font-semibold tabular-nums sm:px-4">D</th>
                    <th className="px-3 py-2 font-semibold tabular-nums sm:px-4">L</th>
                    <th className="px-3 py-2 font-semibold tabular-nums sm:px-4">Diff</th>
                    <th className="px-3 py-2 font-semibold tabular-nums sm:px-4">Pts</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-cp-border">
                  {league.standings.map((row, idx) => (
                    <tr key={row.teamId}>
                      <td className="px-3 py-2.5 tabular-nums text-cp-muted sm:px-4">{idx + 1}</td>
                      <td className="px-3 py-2.5 font-medium text-foreground sm:px-4">
                        {row.teamName}
                      </td>
                      <td className="px-3 py-2.5 tabular-nums sm:px-4">{row.played}</td>
                      <td className="px-3 py-2.5 tabular-nums sm:px-4">{row.wins}</td>
                      <td className="px-3 py-2.5 tabular-nums sm:px-4">{row.draws}</td>
                      <td className="px-3 py-2.5 tabular-nums sm:px-4">{row.losses}</td>
                      <td className="px-3 py-2.5 tabular-nums sm:px-4">
                        {row.diff > 0 ? `+${row.diff}` : row.diff}
                      </td>
                      <td className="px-3 py-2.5 font-semibold tabular-nums sm:px-4">
                        {row.points}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-foreground">Matches</h2>
          </div>
          <PartnerLeagueMatchesPanel
            matches={league.matches}
            defaultStatus="all"
            onEditScore={(match) => {
              setScoreMatch(match);
              setScoreA(match.scoreA != null ? String(match.scoreA) : "");
              setScoreB(match.scoreB != null ? String(match.scoreB) : "");
            }}
          />
        </section>

        <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
          <DialogContent className="border-cp-border bg-cp-card sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Edit league settings</DialogTitle>
              <DialogDescription>
                Rename the league or change its visibility status on your partner site.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="league-name">Name</Label>
                <Input
                  id="league-name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="border-cp-border bg-cp-elevated/40"
                  placeholder="League name"
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={editStatus}
                  onValueChange={(v) => setEditStatus(v as PartnerLeagueStatus)}
                >
                  <SelectTrigger className={cpSelectTriggerClass}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className={cpSelectContentClass}>
                    {LEAGUE_STATUS_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value} className={cpSelectItemClass}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                className="border-cp-border"
                onClick={() => setSettingsOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="bg-cp-primary hover:bg-cp-primary-light"
                disabled={busy}
                onClick={() => void saveSettings()}
              >
                {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Save changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={teamDialogOpen} onOpenChange={setTeamDialogOpen}>
          <DialogContent className="border-cp-border bg-cp-card sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add team</DialogTitle>
              <DialogDescription>Teams appear on the public standings table.</DialogDescription>
            </DialogHeader>
            <div className="space-y-2 py-2">
              <Label htmlFor="team-name">Team name</Label>
              <Input
                id="team-name"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                className="border-cp-border bg-cp-elevated/40"
                placeholder="e.g. Court Hawks"
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                className="border-cp-border"
                onClick={() => setTeamDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="bg-cp-primary hover:bg-cp-primary-light"
                disabled={busy}
                onClick={() => void addTeam()}
              >
                {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Add team
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={matchDialogOpen} onOpenChange={setMatchDialogOpen}>
          <DialogContent className="border-cp-border bg-cp-card sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Schedule match</DialogTitle>
              <DialogDescription>Pick two different teams for a fixture.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-2">
              <div className="space-y-2">
                <Label>Team A</Label>
                <Select value={teamAId} onValueChange={setTeamAId}>
                  <SelectTrigger className={cpSelectTriggerClass}>
                    <SelectValue placeholder="Select team" />
                  </SelectTrigger>
                  <SelectContent className={cpSelectContentClass}>
                    {league.teams.map((t) => (
                      <SelectItem key={t.id} value={t.id} className={cpSelectItemClass}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Team B</Label>
                <Select value={teamBId} onValueChange={setTeamBId}>
                  <SelectTrigger className={cpSelectTriggerClass}>
                    <SelectValue placeholder="Select team" />
                  </SelectTrigger>
                  <SelectContent className={cpSelectContentClass}>
                    {league.teams.map((t) => (
                      <SelectItem key={t.id} value={t.id} className={cpSelectItemClass}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                className="border-cp-border"
                onClick={() => setMatchDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="bg-cp-primary hover:bg-cp-primary-light"
                disabled={busy}
                onClick={() => void createMatch()}
              >
                {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Create match
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog
          open={Boolean(scoreMatch)}
          onOpenChange={(open) => {
            if (!open) setScoreMatch(null);
          }}
        >
          <DialogContent className="border-cp-border bg-cp-card sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Record score</DialogTitle>
              <DialogDescription>
                {scoreMatch
                  ? `${scoreMatch.teamAName} vs ${scoreMatch.teamBName}`
                  : "Enter final score"}
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="score-a">{scoreMatch?.teamAName ?? "Team A"}</Label>
                <Input
                  id="score-a"
                  type="number"
                  min={0}
                  inputMode="numeric"
                  value={scoreA}
                  onChange={(e) => setScoreA(e.target.value)}
                  className="border-cp-border bg-cp-elevated/40"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="score-b">{scoreMatch?.teamBName ?? "Team B"}</Label>
                <Input
                  id="score-b"
                  type="number"
                  min={0}
                  inputMode="numeric"
                  value={scoreB}
                  onChange={(e) => setScoreB(e.target.value)}
                  className="border-cp-border bg-cp-elevated/40"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                className="border-cp-border"
                onClick={() => setScoreMatch(null)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="bg-cp-primary hover:bg-cp-primary-light"
                disabled={busy}
                onClick={() => void saveScore()}
              >
                {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Save score
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
    </div>
  );
}
