"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  GripVertical,
  Loader2,
  Radio,
  RefreshCw,
  Settings2,
  Trophy,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { DoubleStageStandingsLegend, DoubleStageStandingsTable } from "@/components/tournaments/double-stage/double-stage-standings-table";
import { TeamPlayerList } from "@/components/tournaments/team-player-list";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LoadingOverlay } from "@/components/ui/loading-overlay";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTournamentManageScoring } from "@/hooks/use-tournament-manage-scoring";
import { resolveTournamentSurfaceUrls } from "@/lib/constants/routes";
import type { TournamentDetail } from "@/lib/tournaments/service";
import { getTournamentMatchScoreMode, isClassicSetsFormat } from "@/lib/tournaments/settings";
import { tournamentUsesBestieCupPoolRules } from "@/lib/tournaments/partner/bestie-cup-config";

type DoubleStageManagePanelProps = {
  tournament: TournamentDetail;
  partnerSlug?: string | null;
  onOpenLiveScoring?: () => void;
  onOpenSchedule?: () => void;
};

type AssignmentEditorDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tournament: TournamentDetail;
  overview: NonNullable<ReturnType<typeof useTournamentManageScoring>["data"]>["doubleStage"];
  onSaved: () => Promise<void>;
};

function AssignmentEditorDialog({
  open,
  onOpenChange,
  tournament,
  overview,
  onSaved,
}: AssignmentEditorDialogProps) {
  const eligibleTeams = useMemo(() => {
    const map = new Map<
      string,
      {
        id: string;
        name: string;
        players: { displayName: string }[];
      }
    >();
    for (const group of overview?.groups ?? []) {
      for (const row of group.standings) {
        map.set(row.teamId, {
          id: row.teamId,
          name: row.teamName,
          players: row.players,
        });
      }
    }
    for (const team of overview?.unassignedEligibleTeams ?? []) {
      map.set(team.id, {
        id: team.id,
        name: team.name,
        players: team.players,
      });
    }
    return [...map.values()].sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
    );
  }, [overview]);

  const groupNames = useMemo(
    () => (overview?.groups ?? []).map((group) => group.name),
    [overview],
  );

  const initialAssignments = useMemo(() => {
    const next: Record<string, string> = {};
    for (const group of overview?.groups ?? []) {
      for (const row of group.standings) {
        next[row.teamId] = group.name;
      }
    }
    for (const team of overview?.unassignedEligibleTeams ?? []) {
      next[team.id] = "__unassigned__";
    }
    return next;
  }, [overview]);

  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setAssignments(initialAssignments);
    }
  }, [initialAssignments, open]);

  const unassignedCount = eligibleTeams.filter(
    (team) => assignments[team.id] === "__unassigned__" || !assignments[team.id],
  ).length;

  const saveAssignments = useCallback(async () => {
    if (!overview) return;
    if (unassignedCount > 0) {
      toast.error("Assign every eligible team to a group before saving.");
      return;
    }

    const grouped = groupNames.map((groupName) => ({
      groupName,
      teamIds: eligibleTeams
        .filter((team) => assignments[team.id] === groupName)
        .map((team) => team.id),
    }));

    if (grouped.some((group) => group.teamIds.length < 2)) {
      toast.error("Each group must contain at least 2 teams.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(
        `/api/tournaments/${tournament.sportSlug}/${tournament.slug}/manage/double-stage`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ assignments: grouped }),
        },
      );
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message ?? "Failed to save group assignments");
      }
      await onSaved();
      onOpenChange(false);
      toast.success("Group assignments updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save group assignments");
    } finally {
      setSaving(false);
    }
  }, [assignments, eligibleTeams, groupNames, onOpenChange, onSaved, overview, tournament.slug, tournament.sportSlug, unassignedCount]);

  if (!overview) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="grid h-[min(88vh,820px)] w-[min(100vw-2rem,1120px)] max-w-5xl grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden rounded-[28px] border-cp-border p-0 shadow-2xl sm:w-[min(100vw-3rem,1120px)]">
        <LoadingOverlay show={saving} label="Saving group assignments…" />
        <DialogHeader className="border-b border-cp-border bg-cp-card px-5 pt-5 pb-4 sm:px-6 sm:pt-6">
          <DialogTitle className="text-base sm:text-lg">Manage group assignments</DialogTitle>
          <DialogDescription>
            Move eligible teams into the correct group before group-stage matches begin. Saving will
            rebuild pending fixtures so manage and public views stay synchronized.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <Badge variant="muted">{eligibleTeams.length} eligible teams</Badge>
            <Badge variant={unassignedCount > 0 ? "warning" : "success"}>
              {unassignedCount > 0 ? `${unassignedCount} unassigned` : "All assigned"}
            </Badge>
          </div>

          <div className="space-y-3">
            {eligibleTeams.map((team) => (
              <div
                key={team.id}
                className="grid gap-3 rounded-3xl border border-cp-border bg-cp-elevated/15 p-4 shadow-sm transition-colors hover:bg-cp-elevated/25 md:grid-cols-[minmax(0,1fr)_260px]"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <span className="mt-0.5 hidden rounded-full border border-cp-border bg-cp-card/70 p-1.5 text-cp-muted md:inline-flex">
                    <GripVertical className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground sm:text-base">
                      {team.name}
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-cp-muted">
                      {team.players.length} player{team.players.length === 1 ? "" : "s"}
                    </p>
                    {team.players.length > 0 ? (
                      <TeamPlayerList
                        names={team.players}
                        maxNames={6}
                        className="mt-1"
                      />
                    ) : (
                      <p className="mt-1 break-words text-xs text-cp-muted">Players not loaded</p>
                    )}
                  </div>
                </div>
                <div className="space-y-1 md:pl-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-cp-muted">
                    Group
                  </p>
                  <Select
                    value={assignments[team.id] ?? "__unassigned__"}
                    onValueChange={(value) =>
                      setAssignments((prev) => ({ ...prev, [team.id]: value }))
                    }
                  >
                    <SelectTrigger className="w-full border-cp-border bg-cp-bg-input">
                      <SelectValue placeholder="Choose group" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__unassigned__">Unassigned</SelectItem>
                      {groupNames.map((groupName) => (
                        <SelectItem key={groupName} value={groupName}>
                          {groupName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter className="bg-cp-card px-4 py-4 sm:px-6 sm:py-5">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={() => void saveAssignments()} disabled={saving || unassignedCount > 0}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save assignments
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function DoubleStageManagePanel({
  tournament,
  partnerSlug = null,
  onOpenLiveScoring,
  onOpenSchedule,
}: DoubleStageManagePanelProps) {
  const { data, refetch, isFetching } = useTournamentManageScoring(
    tournament.sportSlug,
    tournament.slug,
  );
  const manageUrls = resolveTournamentSurfaceUrls({
    sportSlug: tournament.sportSlug,
    slug: tournament.slug,
    partnerId: tournament.partnerId,
    partnerSlug,
  });
  const overview = data?.doubleStage;
  const [advancing, setAdvancing] = useState(false);
  const [assignmentOpen, setAssignmentOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const gamesScoreMode = getTournamentMatchScoreMode(tournament, "group") === "games";
  const scoreDisplay = isClassicSetsFormat(tournament, "group")
    ? "sets"
    : gamesScoreMode
      ? "games"
      : "diff";
  const showGameWinPct = tournamentUsesBestieCupPoolRules(tournament);
  const showQualification = Boolean(overview?.allGroupMatchesCompleted);

  const advanceToKnockout = useCallback(async () => {
    setAdvancing(true);
    try {
      const res = await fetch(
        `/api/tournaments/${tournament.sportSlug}/${tournament.slug}/manage/double-stage/advance`,
        { method: "POST" },
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? "Failed to generate bracket");
      await refetch();
      toast.success("Knockout bracket ready");
      window.location.href = `${manageUrls.manageUrl}?section=bracket`;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to generate bracket");
    } finally {
      setAdvancing(false);
    }
  }, [manageUrls.manageUrl, refetch, tournament.slug, tournament.sportSlug]);

  const syncGroups = useCallback(async () => {
    setSyncing(true);
    try {
      await refetch();
      toast.success("Groups synchronized");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to sync groups");
    } finally {
      setSyncing(false);
    }
  }, [refetch]);

  if (!overview) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-cp-muted">
          {isFetching ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading groups…
            </span>
          ) : (
            "Groups will appear when the tournament goes live with at least 2 confirmed teams."
          )}
        </CardContent>
      </Card>
    );
  }

  if (overview.phase === "knockout") {
    return (
      <div className="space-y-4">
        <div className="flex flex-col gap-3 rounded-xl border border-cp-primary/30 bg-cp-primary/5 px-3 py-3 sm:flex-row sm:items-center sm:px-4">
          <Trophy className="h-6 w-6 shrink-0 text-cp-primary" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground">Group stage complete</p>
            <p className="text-xs text-cp-muted">
              Final tables below · open Match Schedule or Bracket for the draw.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {onOpenSchedule ? (
              <Button type="button" variant="outline" size="sm" onClick={onOpenSchedule}>
                <CalendarDays className="mr-1.5 h-3.5 w-3.5" />
                Schedule
              </Button>
            ) : null}
            <Button asChild variant="outline" size="sm" className="shrink-0">
              <Link href={`${manageUrls.manageUrl}?section=bracket`}>Open bracket</Link>
            </Button>
          </div>
        </div>

        <DoubleStageStandingsLegend scoreDisplay={scoreDisplay} showGameWinPct={showGameWinPct} />

        <div className="grid gap-3 lg:grid-cols-2">
          {overview.groups.map((group) => (
            <Card key={group.id} className="overflow-hidden">
              <CardHeader className="border-b border-cp-border/50 py-3">
                <CardTitle className="text-sm sm:text-base">{group.name}</CardTitle>
              </CardHeader>
              <CardContent className="p-3 sm:p-4">
                <DoubleStageStandingsTable
                  group={group}
                  showQualification={showQualification}
                  scoreDisplay={scoreDisplay}
                  showGameWinPct={showGameWinPct}
                  compact
                />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const openMatches = overview.groups.reduce(
    (n, g) => n + g.matches.filter((m) => m.status !== "completed").length,
    0,
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-2xl border border-cp-border bg-cp-card p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-semibold text-foreground">Groups</h2>
            <Badge variant="success" className="border-0 text-[10px]">
              {overview.assignedTeamCount}/{overview.eligibleTeamCount} assigned
            </Badge>
            {openMatches > 0 ? (
              <Badge variant="muted" className="text-[10px] normal-case tracking-normal">
                {openMatches} open
              </Badge>
            ) : null}
          </div>
          <DoubleStageStandingsLegend
            scoreDisplay={scoreDisplay}
            showGameWinPct={showGameWinPct}
            className="mt-1.5"
          />
        </div>
        <div className="flex flex-wrap gap-2 sm:justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void syncGroups()}
            disabled={syncing}
          >
            {syncing ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            )}
            Sync
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setAssignmentOpen(true)}
            disabled={!overview.canManageAssignments}
            title={
              overview.canManageAssignments
                ? "Move teams between groups"
                : "Assignments are locked because group-stage matches have already started"
            }
          >
            <Settings2 className="mr-1.5 h-3.5 w-3.5" />
            Assign
          </Button>
          {onOpenLiveScoring ? (
            <Button type="button" size="sm" onClick={onOpenLiveScoring}>
              <Radio className="mr-1.5 h-3.5 w-3.5" />
              Score
              <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Button>
          ) : null}
          {onOpenSchedule ? (
            <Button type="button" variant="outline" size="sm" onClick={onOpenSchedule}>
              <CalendarDays className="mr-1.5 h-3.5 w-3.5" />
              Schedule
            </Button>
          ) : null}
        </div>
      </div>

      {overview.unassignedEligibleTeams.length > 0 ? (
        <div className="rounded-xl border border-amber-600/25 bg-amber-500/8 px-3 py-3 sm:px-4">
          <p className="text-sm font-semibold text-foreground">
            {overview.unassignedEligibleTeams.length} team
            {overview.unassignedEligibleTeams.length === 1 ? "" : "s"} not in a group
          </p>
          <p className="mt-0.5 text-xs text-cp-muted">
            {overview.canManageAssignments
              ? "Sync to auto-balance, or Assign to place manually."
              : "Assignments locked — group matches have started."}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {overview.unassignedEligibleTeams.map((team) => (
              <Badge key={team.id} variant="warning" className="normal-case tracking-normal">
                <Users className="mr-1 h-3 w-3" />
                {team.name}
              </Badge>
            ))}
          </div>
        </div>
      ) : null}

      {overview.knockoutReady && tournament.format !== "group_only" ? (
        <div className="flex flex-col gap-3 rounded-xl border border-emerald-600/30 bg-emerald-500/5 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">Group stage complete</p>
            <p className="text-xs text-cp-muted">
              {overview.qualifiedCount} qualified · bracket generates automatically — retry below if
              needed.
            </p>
          </div>
          <Button
            onClick={() => void advanceToKnockout()}
            disabled={advancing}
            size="sm"
            className="shrink-0"
          >
            {advancing ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                Generating…
              </>
            ) : (
              "Generate knockout"
            )}
          </Button>
        </div>
      ) : overview.knockoutReady && tournament.format === "group_only" ? (
        <div className="rounded-xl border border-cp-primary/25 bg-cp-primary/5 px-3 py-3 sm:px-4">
          <p className="text-sm font-semibold text-foreground">Group stage complete</p>
          <p className="mt-0.5 text-xs text-cp-muted">
            Group-only format — final standings decide the winner.
          </p>
        </div>
      ) : null}

      <div className="grid gap-3 lg:grid-cols-2">
        {overview.groups.map((group) => (
          <Card key={group.id} className="overflow-hidden">
            <CardHeader className="border-b border-cp-border/50 py-3">
              <CardTitle className="text-sm sm:text-base">{group.name}</CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-4">
              <DoubleStageStandingsTable
                group={group}
                showQualification={showQualification}
                scoreDisplay={scoreDisplay}
                showGameWinPct={showGameWinPct}
                compact
              />
            </CardContent>
          </Card>
        ))}
      </div>

      {onOpenSchedule ? (
        <div className="flex flex-col gap-2 rounded-xl border border-cp-border bg-cp-card/60 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">Match Schedule</p>
            <p className="text-xs text-cp-muted">
              Order of Play, start times, and court calls live on a separate tab.
            </p>
          </div>
          <Button type="button" size="sm" variant="outline" onClick={onOpenSchedule}>
            <CalendarDays className="mr-1.5 h-3.5 w-3.5" />
            Open schedule
            <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
          </Button>
        </div>
      ) : null}

      {overview ? (
        <AssignmentEditorDialog
          open={assignmentOpen}
          onOpenChange={setAssignmentOpen}
          tournament={tournament}
          overview={overview}
          onSaved={async () => {
            await refetch();
          }}
        />
      ) : null}
    </div>
  );
}
