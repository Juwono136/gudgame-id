"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { ExternalLink, Loader2, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PartnerLeagueBanner } from "@/components/partners/partner-league-banner";
import { PartnerLeagueHistorySection } from "@/components/partners/partner-league-history-section";
import { PartnerLeagueStandingsSection } from "@/components/partners/partner-league-standings-section";
import { PartnerLeagueTournamentsSection } from "@/components/partners/partner-league-tournaments-section";
import { Button } from "@/components/ui/button";
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
import { PartnerLoadingOverlay } from "@/components/partners/partner-loading";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { parseJsonResponse } from "@/lib/api/parse-json-response";
import { dashboardRoutes, partnerPublicRoutes } from "@/lib/constants/routes";
import { partnerBrandCssVars } from "@/lib/partners/brand-style";
import type {
  PartnerLeagueDetail,
  PartnerLeagueMatchView,
} from "@/lib/partners/league-types";
import { isPartnerLeaguePubliclyVisible } from "@/lib/partners/league-types";
import { partnerPageWidthClass } from "@/lib/partners/layout";
import type { TournamentListItem } from "@/lib/tournaments/service";
import {
  cpSelectContentClass,
  cpSelectItemClass,
  cpSelectTriggerClass,
} from "@/lib/styles/surface-classes";
import { cn } from "@/lib/utils";
import { useConfirmDialog } from "@/providers/confirm-dialog-provider";

type PartnerLeagueManageClientProps = {
  leagueId: string;
  partnerSlug: string;
  initialLeague: PartnerLeagueDetail;
  initialTournaments: TournamentListItem[];
  initialTournamentTotal: number;
  primaryColor: string;
  accentColor: string;
};

export function PartnerLeagueManageClient({
  leagueId,
  partnerSlug,
  initialLeague,
  initialTournaments,
  initialTournamentTotal,
  primaryColor,
  accentColor,
}: PartnerLeagueManageClientProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { confirm } = useConfirmDialog();
  const brandStyle = partnerBrandCssVars(primaryColor, accentColor);

  const [league, setLeague] = useState(initialLeague);
  const [tournamentTotal, setTournamentTotal] = useState(initialTournamentTotal);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [busyLabel, setBusyLabel] = useState("Saving…");

  const [teamDialogOpen, setTeamDialogOpen] = useState(false);
  const [teamName, setTeamName] = useState("");

  const [matchDialogOpen, setMatchDialogOpen] = useState(false);
  const [teamAId, setTeamAId] = useState("");
  const [teamBId, setTeamBId] = useState("");

  const [scoreMatch, setScoreMatch] = useState<PartnerLeagueMatchView | null>(null);
  const [scoreA, setScoreA] = useState("");
  const [scoreB, setScoreB] = useState("");

  const [rosterTeamId, setRosterTeamId] = useState<string | null>(null);
  const [rosterSelected, setRosterSelected] = useState<string[]>([]);
  const [rosterOptions, setRosterOptions] = useState<
    { id: string; fullName: string }[]
  >([]);
  const [rosterLoading, setRosterLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const leagueRes = await fetch(`/api/partner/leagues/${leagueId}`);
      const leagueJson = await parseJsonResponse<{ success: true; data: PartnerLeagueDetail }>(
        leagueRes,
      );
      if (leagueRes.ok && "data" in leagueJson) setLeague(leagueJson.data);
      await queryClient.invalidateQueries({
        queryKey: ["partner-league-tournaments", "dashboard", partnerSlug, leagueId],
      });
    } finally {
      setLoading(false);
    }
  }, [leagueId, partnerSlug, queryClient]);

  useEffect(() => {
    setLeague(initialLeague);
    setTournamentTotal(initialTournamentTotal);
  }, [initialLeague, initialTournamentTotal]);

  const deleteLeague = async () => {
    const ok = await confirm({
      title: `Delete "${league.name}"?`,
      description:
        "This permanently removes the league, teams, matches, and standings. Linked tournaments stay but become ungrouped.",
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

  const openRosterEditor = async (teamId: string) => {
    const team = league.teams.find((t) => t.id === teamId);
    setRosterTeamId(teamId);
    setRosterSelected(team?.playerIds ?? []);
    setRosterLoading(true);
    try {
      const res = await fetch(
        `/api/partner/public/${encodeURIComponent(partnerSlug)}/players?page=1&pageSize=100&sortBy=name&sortDir=asc`,
      );
      const json = await parseJsonResponse<{
        success: true;
        data: { items: { id: string; fullName: string }[] };
      }>(res);
      if (res.ok && "data" in json) {
        setRosterOptions(json.data.items.map((p) => ({ id: p.id, fullName: p.fullName })));
      } else {
        setRosterOptions([]);
        toast.error("Could not load players for roster");
      }
    } finally {
      setRosterLoading(false);
    }
  };

  const saveRoster = async () => {
    if (!rosterTeamId) return;
    setBusyLabel("Saving roster…");
    setBusy(true);
    try {
      const res = await fetch(`/api/partner/leagues/${leagueId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "set_team_roster",
          teamId: rosterTeamId,
          playerIds: rosterSelected,
        }),
      });
      const json = await parseJsonResponse<{ success: true; data: PartnerLeagueDetail }>(res);
      if (!res.ok) {
        toast.error(
          (json as { error?: { message?: string } }).error?.message ??
            "Could not save roster",
        );
        return;
      }
      if ("data" in json) setLeague(json.data);
      toast.success("Roster updated");
      setRosterTeamId(null);
      await queryClient.invalidateQueries({ queryKey: ["partner-players", partnerSlug] });
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
  const editHref = dashboardRoutes.partnerLeagueEdit(leagueId);
  const showPublicLink = isPartnerLeaguePubliclyVisible(league.status);

  return (
    <div
      className={cn("relative space-y-6 py-8 sm:space-y-8", partnerPageWidthClass)}
      style={brandStyle}
    >
      {(busy || loading) && (
        <PartnerLoadingOverlay
          show
          label={busy ? busyLabel : "Refreshing…"}
          variant="fullscreen"
        />
      )}

      <PartnerLeagueBanner
        league={league}
        backHref={dashboardRoutes.partnerLeagues}
        backLabel="Leagues"
        tournamentCount={tournamentTotal}
        primaryColor={primaryColor}
        accentColor={accentColor}
        actions={
          <>
            <Button asChild className="bg-cp-primary hover:bg-cp-primary-light">
              <Link href={editHref}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit league
              </Link>
            </Button>
            {showPublicLink ? (
              <Button asChild variant="outline" className="border-cp-border">
                <Link href={publicHref} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Public page
                </Link>
              </Button>
            ) : null}
            <Button
              type="button"
              variant="outline"
              className="border-destructive/40 text-destructive hover:bg-destructive/10"
              onClick={() => void deleteLeague()}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          </>
        }
      />

      <PartnerLeagueTournamentsSection
        partnerSlug={partnerSlug}
        leagueId={leagueId}
        leagueName={league.name}
        mode="dashboard"
        initialItems={initialTournaments}
        initialTotal={initialTournamentTotal}
        onTotalChange={setTournamentTotal}
      />

      <PartnerLeagueStandingsSection
        standings={league.standings}
        onAddTeam={() => setTeamDialogOpen(true)}
      />

      {league.teams.length > 0 ? (
        <section className="overflow-hidden rounded-2xl border border-cp-border bg-cp-card shadow-sm">
          <div className="border-b border-cp-border px-4 py-3 sm:px-5">
            <h2 className="text-sm font-semibold text-foreground sm:text-base">
              Team rosters
            </h2>
            <p className="text-xs text-cp-muted">
              Link Players list members so league scores update their W/L stats.
            </p>
          </div>
          <ul className="divide-y divide-cp-border">
            {league.teams.map((team) => (
              <li
                key={team.id}
                className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 sm:px-5"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{team.name}</p>
                  <p className="text-xs text-cp-muted">
                    {team.playerIds?.length
                      ? `${team.playerIds.length} player${team.playerIds.length === 1 ? "" : "s"} linked`
                      : "No players linked yet"}
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="border-cp-border"
                  onClick={() => openRosterEditor(team.id)}
                >
                  Edit roster
                </Button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <PartnerLeagueHistorySection
        matches={league.matches}
        mode="dashboard"
        onNewMatch={() => setMatchDialogOpen(true)}
        canCreateMatch={league.teams.length >= 2}
        onEditScore={(match) => {
          setScoreMatch(match);
          setScoreA(match.scoreA != null ? String(match.scoreA) : "");
          setScoreB(match.scoreB != null ? String(match.scoreB) : "");
        }}
      />

      <Dialog open={teamDialogOpen} onOpenChange={setTeamDialogOpen}>
        <DialogContent className="border-cp-border bg-cp-card sm:max-w-md" style={brandStyle}>
          <DialogHeader>
            <DialogTitle>Add team</DialogTitle>
            <DialogDescription>Teams appear on the optional standings table.</DialogDescription>
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
        <DialogContent className="border-cp-border bg-cp-card sm:max-w-md" style={brandStyle}>
          <DialogHeader>
            <DialogTitle>New match</DialogTitle>
            <DialogDescription>Schedule a fixture between two teams.</DialogDescription>
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
        <DialogContent className="border-cp-border bg-cp-card sm:max-w-md" style={brandStyle}>
          <DialogHeader>
            <DialogTitle>Record score</DialogTitle>
            <DialogDescription>
              {scoreMatch
                ? `${scoreMatch.teamAName} vs ${scoreMatch.teamBName}`
                : "Enter the final score."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            <div className="space-y-2">
              <Label htmlFor="score-a">{scoreMatch?.teamAName ?? "Team A"}</Label>
              <Input
                id="score-a"
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

      <Dialog
        open={Boolean(rosterTeamId)}
        onOpenChange={(open) => {
          if (!open) setRosterTeamId(null);
        }}
      >
        <DialogContent className="border-cp-border bg-cp-card sm:max-w-md" style={brandStyle}>
          <DialogHeader>
            <DialogTitle>Edit team roster</DialogTitle>
            <DialogDescription>
              Select players from your Players list. Their W/L will update when this
              team&apos;s league matches are scored.
            </DialogDescription>
          </DialogHeader>
          <div className="relative max-h-64 space-y-2 overflow-y-auto py-2">
            {rosterLoading ? (
              <PartnerLoadingOverlay show label="Loading players…" />
            ) : rosterOptions.length === 0 ? (
              <p className="text-sm text-cp-muted">
                No players yet. Add players via tournaments or the Players list first.
              </p>
            ) : (
              rosterOptions.map((p) => {
                const checked = rosterSelected.includes(p.id);
                return (
                  <label
                    key={p.id}
                    className="flex cursor-pointer items-center gap-2 rounded-lg border border-cp-border/70 px-3 py-2 text-sm hover:bg-cp-elevated/40"
                  >
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-[var(--cp-primary)]"
                      checked={checked}
                      onChange={() => {
                        setRosterSelected((prev) =>
                          checked ? prev.filter((id) => id !== p.id) : [...prev, p.id],
                        );
                      }}
                    />
                    <span className="truncate font-medium text-foreground">{p.fullName}</span>
                  </label>
                );
              })
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="border-cp-border"
              onClick={() => setRosterTeamId(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-cp-primary hover:bg-cp-primary-light"
              disabled={busy || rosterLoading}
              onClick={() => void saveRoster()}
            >
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save roster
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
