"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  GripVertical,
  Loader2,
  Radio,
  RefreshCw,
  Settings2,
  Trophy,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { DoubleStageConfigBanner } from "@/components/tournaments/double-stage/double-stage-config-banner";
import { DoubleStageFlowGuide } from "@/components/tournaments/double-stage/double-stage-flow-guide";
import { DoubleStageStandingsLegend, DoubleStageStandingsTable } from "@/components/tournaments/double-stage/double-stage-standings-table";
import { DoubleStageScheduleManage } from "@/components/tournaments/manage/double-stage-schedule-manage";
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
import {
  formatKickoffDateTime,
  formatKickoffTime,
} from "@/lib/tournaments/double-stage/schedule-view";
import type { TournamentDetail } from "@/lib/tournaments/service";
import { getTournamentMatchScoreMode, isClassicSetsFormat } from "@/lib/tournaments/settings";
import { cn } from "@/lib/utils";

type DoubleStageManagePanelProps = {
  tournament: TournamentDetail;
  partnerSlug?: string | null;
  onOpenLiveScoring?: () => void;
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
                    <p className="mt-1 break-words text-xs text-cp-muted">
                      {team.players.length > 0
                        ? team.players.map((player) => player.displayName).join(", ")
                        : "Players not loaded"}
                    </p>
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

function FixtureList({
  matches,
  gamesScoreMode,
}: {
  matches: {
    id: string;
    teamAName: string | null;
    teamBName: string | null;
    scoreA: number | null;
    scoreB: number | null;
    status: string;
    scheduledAt: string | null;
  }[];
  gamesScoreMode: boolean;
}) {
  if (!matches.length) return null;

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium uppercase tracking-wide text-cp-muted">Fixtures</p>
      <ul className="space-y-1.5">
        {matches.map((match) => {
          const hasKickoff = Boolean(match.scheduledAt);
          const kickoffLabel = hasKickoff
            ? formatKickoffDateTime(match.scheduledAt)
            : "TBA";

          return (
            <li
              key={match.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-cp-border/80 bg-cp-elevated/20 px-3 py-2 text-sm"
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium text-foreground">
                  {match.teamAName} vs {match.teamBName}
                </p>
                <p
                  className={cn(
                    "mt-0.5 text-[11px] font-medium tabular-nums",
                    hasKickoff ? "text-cp-muted" : "text-amber-700 dark:text-amber-300",
                  )}
                  title={
                    hasKickoff
                      ? `Kickoff ${formatKickoffTime(match.scheduledAt)}`
                      : "Kickoff time not set yet"
                  }
                >
                  {kickoffLabel}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {match.status === "completed" ? (
                  <span className="inline-flex flex-col items-end">
                    <span className="font-mono text-sm tabular-nums text-foreground">
                      {match.scoreA}–{match.scoreB}
                    </span>
                    {gamesScoreMode ? (
                      <span className="text-[9px] font-semibold uppercase tracking-wide text-cp-muted">
                        Games
                      </span>
                    ) : null}
                  </span>
                ) : null}
                <Badge
                  variant="muted"
                  className={cn(
                    "text-[10px] capitalize",
                    match.status === "completed" &&
                      "border-emerald-600/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200",
                    match.status === "in_progress" &&
                      "border-amber-600/30 bg-amber-500/10 text-amber-900 dark:text-amber-200",
                    match.status === "pending" &&
                      !hasKickoff &&
                      "border-amber-600/25 bg-amber-500/10 text-amber-800 dark:text-amber-200",
                  )}
                >
                  {match.status === "completed"
                    ? "Ended"
                    : match.status === "pending" && !hasKickoff
                      ? "Pending · TBA"
                      : match.status.replace("_", " ")}
                </Badge>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function DoubleStageManagePanel({
  tournament,
  partnerSlug = null,
  onOpenLiveScoring,
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
  const bracketMatches = data?.bracketMatches ?? [];
  const [advancing, setAdvancing] = useState(false);
  const [assignmentOpen, setAssignmentOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const gamesScoreMode = getTournamentMatchScoreMode(tournament) === "games";
  const scoreDisplay = isClassicSetsFormat(tournament)
    ? "sets"
    : gamesScoreMode
      ? "games"
      : "diff";
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
      toast.success("Knockout bracket generated");
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
      <div className="space-y-5">
        <Card className="border-cp-primary/30 bg-cp-primary/5">
          <CardContent className="flex flex-col items-center gap-3 text-center sm:flex-row sm:text-left">
            <Trophy className="h-8 w-8 shrink-0 text-cp-primary" />
            <div className="flex-1">
              <p className="font-semibold text-foreground">Group stage complete</p>
              <p className="mt-1 text-sm text-cp-muted">
                Knockout bracket is active. View final group tables below, set match times, or open
                the Bracket tab.
              </p>
            </div>
            <Button asChild variant="outline" className="shrink-0">
              <Link
                href={`${manageUrls.manageUrl}?section=bracket`}
              >
                Open bracket
              </Link>
            </Button>
          </CardContent>
        </Card>

        <DoubleStageStandingsLegend scoreDisplay={scoreDisplay} className="px-1" />

        <div className="grid gap-4 lg:grid-cols-2">
          {overview.groups.map((group) => (
            <Card key={group.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{group.name} — final standings</CardTitle>
              </CardHeader>
              <CardContent>
                <DoubleStageStandingsTable
                  group={group}
                  showQualification={showQualification}
                  scoreDisplay={scoreDisplay}
                />
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Match schedule</CardTitle>
          </CardHeader>
          <CardContent>
            <DoubleStageScheduleManage
              tournament={tournament}
              groups={overview.groups}
              bracketMatches={bracketMatches}
              onUpdated={() => void refetch()}
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  const openMatches = overview.groups.reduce(
    (n, g) => n + g.matches.filter((m) => m.status !== "completed").length,
    0,
  );

  return (
    <div className="space-y-5">
      <DoubleStageConfigBanner tournament={tournament} />

      <div className="grid gap-4 rounded-2xl border border-cp-border bg-cp-card p-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-start md:p-5">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground sm:text-base">
            Groups — live synced workspace
          </p>
          <p className="mt-1 text-xs leading-relaxed text-cp-muted sm:text-sm">
            New eligible teams are synchronized into groups automatically before group matches
            start. You can also adjust team-to-group placement manually while the group stage is
            still pending.
          </p>
          <DoubleStageStandingsLegend scoreDisplay={scoreDisplay} className="mt-2.5" />
        </div>
        <div className="grid gap-2 sm:grid-cols-2 md:flex md:w-[230px] md:flex-col">
          <Button
            type="button"
            variant="outline"
            className="w-full justify-center md:justify-start"
            onClick={() => void syncGroups()}
            disabled={syncing}
          >
            {syncing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Sync groups
          </Button>
          <Button
            type="button"
            variant="outline"
            className="w-full justify-center md:justify-start"
            onClick={() => setAssignmentOpen(true)}
            disabled={!overview.canManageAssignments}
            title={
              overview.canManageAssignments
                ? "Move teams between groups"
                : "Assignments are locked because group-stage matches have already started"
            }
          >
            <Settings2 className="mr-2 h-4 w-4" />
            Manage groups
          </Button>
          {onOpenLiveScoring ? (
            <Button
              type="button"
              className="w-full justify-center md:justify-start"
              onClick={onOpenLiveScoring}
            >
              <Radio className="mr-2 h-4 w-4" />
              Score group matches
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : null}
        </div>
      </div>

      {overview.unassignedEligibleTeams.length > 0 ? (
        <Card className="border-amber-600/25 bg-amber-500/8">
          <CardContent className="flex flex-col gap-3 py-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="font-semibold text-foreground">
                {overview.unassignedEligibleTeams.length} eligible team
                {overview.unassignedEligibleTeams.length === 1 ? "" : "s"} not yet placed in a
                group
              </p>
              <p className="mt-1 text-sm text-cp-muted">
                {overview.canManageAssignments
                  ? "Use Sync groups for automatic balancing, or open Manage assignments to place teams manually."
                  : "Group matches have already started, so assignments are locked."}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {overview.unassignedEligibleTeams.map((team) => (
                  <Badge key={team.id} variant="warning" className="normal-case tracking-normal">
                    <Users className="mr-1 h-3 w-3" />
                    {team.name}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-wrap items-center gap-2 text-xs text-cp-muted sm:text-sm">
          <Badge variant="success" className="border-0">
            {overview.assignedTeamCount} / {overview.eligibleTeamCount} eligible teams assigned
          </Badge>
          {!overview.canManageAssignments ? (
            <span>Assignments are locked because group-stage matches have already started.</span>
          ) : null}
        </div>
      )}

      {overview.knockoutReady ? (
        <Card className="border-emerald-600/30 bg-emerald-500/5">
          <CardContent className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold text-foreground">All group matches completed</p>
              <p className="text-sm text-cp-muted">
                {overview.qualifiedCount} teams qualified · knockout generates automatically after
                the last result. Use the button if you need to retry.
              </p>
            </div>
            <Button onClick={() => void advanceToKnockout()} disabled={advancing} className="shrink-0">
              {advancing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating…
                </>
              ) : (
                "Generate knockout bracket"
              )}
            </Button>
          </CardContent>
        </Card>
      ) : openMatches > 0 ? (
        <p className="text-xs text-cp-muted sm:text-sm">
          {openMatches} group match{openMatches === 1 ? "" : "es"} still to play. Qualified /
          Eliminated badges appear only after every group fixture is finished.
        </p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        {overview.groups.map((group) => (
          <Card key={group.id} className="overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-base sm:text-lg">{group.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <DoubleStageStandingsTable
                group={group}
                showQualification={showQualification}
                scoreDisplay={scoreDisplay}
              />
              <FixtureList matches={group.matches} gamesScoreMode={gamesScoreMode} />
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Match schedule</CardTitle>
        </CardHeader>
        <CardContent>
          <DoubleStageScheduleManage
            tournament={tournament}
            groups={overview.groups}
            bracketMatches={bracketMatches}
            onUpdated={() => void refetch()}
          />
        </CardContent>
      </Card>

      <DoubleStageFlowGuide phase="group" variant="manage" />

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
