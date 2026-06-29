"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  GitBranch,
  Loader2,
  Shuffle,
  Swords,
  Users,
} from "lucide-react";
import { BracketTreeView } from "@/components/tournaments/bracket-tree-view";
import { BracketScoreSection } from "@/components/tournaments/manage/bracket-score-section";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useAssignBracketTeam,
  useGeneratePublicBracket,
  useTournamentBracket,
} from "@/hooks/use-tournament-bracket";
import { useTournamentManageScoring } from "@/hooks/use-tournament-manage-scoring";
import { useConfirmDialog } from "@/providers/confirm-dialog-provider";
import { isFunMatchType, isOfficialType } from "@/lib/tournaments/core/types";
import {
  getTournamentCourtCount,
  getTournamentPointsPerMatch,
} from "@/lib/tournaments/settings";
import type { TournamentParticipantContext } from "@/lib/tournaments/participant-access";
import type { TournamentDetail } from "@/lib/tournaments/service";
import { publicSportRoutes } from "@/lib/constants/routes";
import {
  cpSelectContentClass,
  cpSelectItemClass,
  cpSelectTriggerClass,
} from "@/lib/styles/surface-classes";
import { cn } from "@/lib/utils";

type BracketManagePanelProps = {
  tournament: TournamentDetail;
  participant: TournamentParticipantContext;
};

export function BracketManagePanel({ tournament, participant }: BracketManagePanelProps) {
  const { confirm } = useConfirmDialog();
  const isOfficial = isOfficialType(tournament.tournamentType);
  const courtCount = getTournamentCourtCount(tournament);
  const { data, isLoading, refetch } = useTournamentBracket(tournament.sportSlug, tournament.slug);
  const { data: workspace } = useTournamentManageScoring(tournament.sportSlug, tournament.slug);
  const generate = useGeneratePublicBracket(tournament.sportSlug, tournament.slug);
  const assign = useAssignBracketTeam(tournament.sportSlug, tournament.slug);
  const pointsPerMatch = getTournamentPointsPerMatch(tournament);

  const [seedSlot, setSeedSlot] = useState<{ matchId: string; slot: "a" | "b" } | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState("");

  const generated = data?.generated ?? false;
  const matches = data?.matches ?? [];
  const matchCount = matches.length;
  const teams = workspace?.teams ?? [];

  const placedTeamIds = useMemo(() => {
    const ids = new Set<string>();
    for (const m of matches) {
      if (m.roundNumber === 1) {
        if (m.teamAId) ids.add(m.teamAId);
        if (m.teamBId) ids.add(m.teamBId);
      }
    }
    return ids;
  }, [matches]);

  const unplacedTeams = useMemo(
    () => teams.filter((t) => t.memberCount > 0 && !placedTeamIds.has(t.id)),
    [teams, placedTeamIds],
  );

  const readyTeamCount = teams.filter((t) => t.memberCount > 0).length;
  const completedMatchCount = matches.filter((m) => m.status === "completed").length;
  const liveMatchCount = matches.filter((m) => m.status === "in_progress").length;

  const seedingLocked = matches.some(
    (m) => m.status === "in_progress" || m.status === "completed",
  );

  const handleGenerate = async (seedMode: "random" | "manual") => {
    if (generated) return;
    const label =
      seedMode === "random"
        ? "Generate bracket with random seeding?"
        : "Generate bracket for manual seeding?";
    const ok = await confirm({
      title: label,
      description:
        seedMode === "random"
          ? "Teams will be randomly placed in round one. You can still adjust before matches start."
          : "An empty bracket tree will be created. Drag teams into round-one slots below.",
      confirmLabel: "Generate",
    });
    if (!ok) return;
    await generate.mutateAsync(seedMode);
    void refetch();
  };

  const handleAssign = async () => {
    if (!seedSlot || !selectedTeamId) return;
    const team = teams.find((t) => t.id === selectedTeamId);
    const ok = await confirm({
      title: "Assign team to bracket slot?",
      description: `Place ${team?.name ?? "this team"} in the selected round-one slot.`,
      confirmLabel: "Assign",
    });
    if (!ok) return;
    await assign.mutateAsync({
      matchId: seedSlot.matchId,
      slot: seedSlot.slot,
      teamId: selectedTeamId,
    });
    setSeedSlot(null);
    setSelectedTeamId("");
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner label="Loading bracket…" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-cp-border bg-cp-card p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
              <GitBranch className="h-5 w-5 text-emerald-400" />
              Bracket setup
            </h2>
            <p className="mt-1 max-w-xl text-sm text-cp-muted">
              {isOfficial
                ? "Full elimination workflow: seed teams, track every match, and score on assigned courts with detailed bracket status."
                : "Generate the elimination tree, seed teams (random or manual), then score matches from Live scoring or below."}
            </p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href={publicSportRoutes.tournament(tournament.sportSlug, tournament.slug)}>
              View public page
            </Link>
          </Button>
        </div>

        {isOfficial ? (
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                label: "Teams ready",
                value: `${readyTeamCount}${tournament.maxTeams ? ` / ${tournament.maxTeams}` : ""}`,
              },
              { label: "Bracket matches", value: String(matchCount) },
              { label: "Completed", value: String(completedMatchCount) },
              {
                label: "Scoring",
                value: `${pointsPerMatch} pts · ${courtCount} courts`,
              },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-lg border border-cp-border bg-cp-elevated/30 px-3 py-2"
              >
                <p className="text-[10px] font-semibold uppercase tracking-wider text-cp-muted">
                  {stat.label}
                </p>
                <p className="mt-0.5 text-sm font-semibold tabular-nums text-foreground">
                  {stat.value}
                </p>
              </div>
            ))}
          </div>
        ) : null}

        <ol className="mt-5 grid gap-2 sm:grid-cols-2">
          {[
            { done: readyTeamCount >= 2, text: `At least 2 teams ready (${readyTeamCount})` },
            { done: generated, text: `Bracket generated (${matchCount} matches)` },
            { done: tournament.status === "live", text: "Tournament published (Live)" },
            {
              done: completedMatchCount > 0,
              text: `Matches scored (${completedMatchCount} done${liveMatchCount ? ` · ${liveMatchCount} live` : ""})`,
            },
          ].map((step) => (
            <li
              key={step.text}
              className={cn(
                "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm",
                step.done
                  ? "border-emerald-500/30 bg-emerald-950/20 text-emerald-100"
                  : "border-cp-border bg-cp-elevated/30 text-cp-muted",
              )}
            >
              <CheckCircle2
                className={cn("h-4 w-4 shrink-0", step.done ? "text-emerald-400" : "opacity-40")}
              />
              {step.text}
            </li>
          ))}
        </ol>

        {!generated ? (
          <div className="mt-5 flex flex-wrap gap-2">
            <Button
              type="button"
              disabled={generate.isPending || teams.filter((t) => t.memberCount > 0).length < 2}
              onClick={() => void handleGenerate("random")}
            >
              {generate.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Shuffle className="mr-2 h-4 w-4" />
              )}
              Random seed
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={generate.isPending || teams.filter((t) => t.memberCount > 0).length < 2}
              onClick={() => void handleGenerate("manual")}
            >
              <Users className="mr-2 h-4 w-4" />
              Manual seed
            </Button>
          </div>
        ) : (
          <p className="mt-4 text-sm text-emerald-200/80">
            Bracket is ready. {seedingLocked ? "Seeding is locked while matches are active." : "Assign remaining teams below."}
          </p>
        )}
      </section>

      {generated && !seedingLocked && unplacedTeams.length > 0 ? (
        <section className="rounded-2xl border border-cp-border bg-cp-card p-5">
          <h3 className="text-sm font-semibold text-foreground">Manual seeding</h3>
          <p className="mt-1 text-sm text-cp-muted">
            Click a round-one slot in the tree, then pick a team to place.
          </p>
          {seedSlot ? (
            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end">
              <div className="min-w-0 flex-1 space-y-1">
                <p className="text-xs text-cp-muted">
                  Placing in slot {seedSlot.slot.toUpperCase()}
                </p>
                <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
                  <SelectTrigger className={cpSelectTriggerClass}>
                    <SelectValue placeholder="Choose team" />
                  </SelectTrigger>
                  <SelectContent className={cpSelectContentClass}>
                    {unplacedTeams.map((t) => (
                      <SelectItem key={t.id} value={t.id} className={cpSelectItemClass}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button type="button" onClick={() => void handleAssign()} disabled={!selectedTeamId || assign.isPending}>
                Place team
              </Button>
              <Button type="button" variant="ghost" onClick={() => setSeedSlot(null)}>
                Cancel
              </Button>
            </div>
          ) : null}
        </section>
      ) : null}

      {generated ? (
        <>
          <section className="rounded-2xl border border-cp-border bg-cp-card p-4 sm:p-5">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-cp-muted">
              <Swords className="h-4 w-4" />
              Bracket tree
            </h3>
            <BracketTreeView
              matches={matches}
              seedingMode={!seedingLocked}
              onSlotClick={(matchId, slot) => {
                if (seedingLocked) return;
                setSeedSlot({ matchId, slot });
                setSelectedTeamId("");
              }}
            />
          </section>

          <BracketScoreSection
            sportSlug={tournament.sportSlug}
            slug={tournament.slug}
            matches={matches}
            participant={participant}
            pointsPerMatch={pointsPerMatch}
          />
        </>
      ) : null}
    </div>
  );
}
