"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  GitBranch,
  LayoutGrid,
  Loader2,
  Shuffle,
  Swords,
  Users,
} from "lucide-react";
import { BracketTreeView } from "@/components/tournaments/bracket-tree-view";
import { BracketPlayReadinessCard } from "@/components/tournaments/manage/bracket-play-readiness-card";
import { BracketSeedingStatusBanner } from "@/components/tournaments/manage/bracket-seeding-status-banner";
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
  useFinalizeBracketSeeding,
  useGeneratePublicBracket,
  useResetBracket,
  useTournamentBracket,
} from "@/hooks/use-tournament-bracket";
import { useTournamentManageScoring } from "@/hooks/use-tournament-manage-scoring";
import { useConfirmDialog } from "@/providers/confirm-dialog-provider";
import { isOfficialType } from "@/lib/tournaments/core/types";
import {
  getTournamentCourtCount,
  getTournamentMatchScoringHint,
} from "@/lib/tournaments/settings";
import type { TournamentParticipantContext } from "@/lib/tournaments/participant-access";
import type { TournamentDetail } from "@/lib/tournaments/service";
import { resolveTournamentSurfaceUrls } from "@/lib/constants/routes";
import {
  cpSelectContentClass,
  cpSelectItemClass,
  cpSelectTriggerClass,
  cpAlertInfoSurfaceClass,
  cpFunAccentTextClass,
} from "@/lib/styles/surface-classes";
import { cn } from "@/lib/utils";
import { hasPublicBracketTree } from "@/lib/tournaments/brackets/has-public-bracket";
import {
  canResetBracketTree,
  getBracketSeedingUiState,
  isBracketSeedingLocked,
} from "@/lib/tournaments/brackets/seeding-state";

async function runBracketMutation(action: () => Promise<unknown>) {
  try {
    await action();
  } catch {
    // Mutation onError already surfaces a toast — avoid unhandled rejections.
  }
}

type BracketManagePanelProps = {
  tournament: TournamentDetail;
  participant: TournamentParticipantContext;
  partnerSlug?: string | null;
  onOpenLiveScoring?: () => void;
  /** Double-stage: navigate to Groups to regenerate knockout after reset. */
  onOpenGroups?: () => void;
};

export function BracketManagePanel({
  tournament,
  participant,
  partnerSlug = null,
  onOpenLiveScoring,
  onOpenGroups,
}: BracketManagePanelProps) {
  const { confirm } = useConfirmDialog();
  const isOfficial = isOfficialType(tournament.tournamentType);
  const isDoubleStage = tournament.format === "double_stage";
  const courtCount = getTournamentCourtCount(tournament);
  const surfaceUrls = resolveTournamentSurfaceUrls({
    sportSlug: tournament.sportSlug,
    slug: tournament.slug,
    partnerId: tournament.partnerId,
    partnerSlug,
  });
  const { data, isLoading, refetch } = useTournamentBracket(tournament.sportSlug, tournament.slug);
  const { data: workspace } = useTournamentManageScoring(tournament.sportSlug, tournament.slug);
  const generate = useGeneratePublicBracket(tournament.sportSlug, tournament.slug);
  const finalize = useFinalizeBracketSeeding(tournament.sportSlug, tournament.slug);
  const resetBracket = useResetBracket(tournament.sportSlug, tournament.slug);
  const assign = useAssignBracketTeam(tournament.sportSlug, tournament.slug);

  const [seedSlot, setSeedSlot] = useState<{ matchId: string; slot: "a" | "b" } | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const seedPickerRef = useRef<HTMLDivElement>(null);

  const generated = hasPublicBracketTree(data);
  const seedingFinalized = data?.seedingFinalized ?? false;
  const matches = data?.matches ?? [];
  const allTeams = workspace?.teams ?? [];

  const eligibleIdSet = useMemo(() => {
    if (!isOfficial) return null;
    return new Set(workspace?.bracketEligibleTeamIds ?? []);
  }, [isOfficial, workspace?.bracketEligibleTeamIds]);

  const seedableTeams = useMemo(() => {
    const withMembers = allTeams.filter((t) => t.memberCount > 0);
    if (!eligibleIdSet) return withMembers;
    return withMembers.filter((t) => eligibleIdSet.has(t.id));
  }, [allTeams, eligibleIdSet]);

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
    () => seedableTeams.filter((t) => !placedTeamIds.has(t.id)),
    [seedableTeams, placedTeamIds],
  );

  const placedTeamCount = placedTeamIds.size;
  const matchScoringHint = getTournamentMatchScoringHint(tournament);

  const knockoutEntryEmpty = useMemo(() => {
    if (!isDoubleStage || !generated) return false;
    const entry = matches.filter(
      (m) =>
        (m.roundNumber === 0 || m.roundNumber === 1) &&
        m.matchNumber !== 999 &&
        !m.seriesParentId,
    );
    if (entry.length === 0) return false;
    return !entry.some((m) => m.teamAId || m.teamBId);
  }, [generated, isDoubleStage, matches]);

  const [syncingKnockout, setSyncingKnockout] = useState(false);

  const syncKnockoutFromGroups = useCallback(async () => {
    setSyncingKnockout(true);
    try {
      const res = await fetch(
        `/api/tournaments/${tournament.sportSlug}/${tournament.slug}/manage/double-stage/advance`,
        { method: "POST" },
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? "Failed to sync knockout");
      await refetch();
    } catch (e) {
      const { toast } = await import("sonner");
      toast.error(e instanceof Error ? e.message : "Failed to sync knockout");
    } finally {
      setSyncingKnockout(false);
    }
  }, [refetch, tournament.slug, tournament.sportSlug]);

  const seedingLocked =
    isDoubleStage || isBracketSeedingLocked(matches, tournament.status);
  const seedingUi = useMemo(
    () => getBracketSeedingUiState(matches, tournament.status),
    [matches, tournament.status],
  );
  const resetLocked = !canResetBracketTree(matches, tournament.status);
  const canRandomReseed =
    generated &&
    !seedingLocked &&
    !isDoubleStage &&
    seedableTeams.length >= 2 &&
    tournament.format !== "americano";
  const liveScoringHref = `${surfaceUrls.manageUrl}?section=scoring`;

  const teamsForPicker = useMemo(() => {
    if (!seedSlot) return unplacedTeams;
    const match = matches.find((m) => m.id === seedSlot.matchId);
    const currentId =
      seedSlot.slot === "a" ? match?.teamAId : match?.teamBId;
    return seedableTeams.filter(
      (t) => !placedTeamIds.has(t.id) || t.id === currentId,
    );
  }, [seedSlot, unplacedTeams, matches, seedableTeams, placedTeamIds]);

  const selectedMatchLabel = useMemo(() => {
    if (!seedSlot) return null;
    const match = matches.find((m) => m.id === seedSlot.matchId);
    if (!match) return `Slot ${seedSlot.slot.toUpperCase()}`;
    return `Match ${match.matchNumber}, slot ${seedSlot.slot.toUpperCase()}`;
  }, [matches, seedSlot]);

  const openSeedSlot = (matchId: string, slot: "a" | "b") => {
    if (seedingLocked) return;
    setSeedSlot({ matchId, slot });
    setSelectedTeamId("");
    requestAnimationFrame(() => {
      seedPickerRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  };

  const handleGenerate = async (seedMode: "random" | "manual") => {
    if (generated && seedMode === "manual") {
      await runBracketMutation(async () => {
        await generate.mutateAsync(seedMode);
        await refetch();
      });
      return;
    }

    if (generated && seedMode === "random") {
      const ok = await confirm({
        title: "Randomly reshuffle round one?",
        description:
          "All current round-one placements are cleared and eligible teams are randomly re-seeded. This is only allowed before any match is scored.",
        confirmLabel: "Random seed",
      });
      if (!ok) return;
      await runBracketMutation(async () => {
        await generate.mutateAsync("random");
        await refetch();
      });
      return;
    }

    if (generated) return;

    const label =
      seedMode === "random"
        ? "Generate bracket with random seeding?"
        : "Open bracket for manual seeding?";
    const ok = await confirm({
      title: label,
      description:
        seedMode === "random"
          ? "Confirmed teams will be randomly placed in round one."
          : "The bracket tree will be ready. Place teams in round-one slots as they register — no need to wait for a full roster.",
      confirmLabel: seedMode === "random" ? "Random seed" : "Open bracket",
    });
    if (!ok) return;
    await runBracketMutation(async () => {
      await generate.mutateAsync(seedMode);
      await refetch();
    });
  };

  const handleFinalize = async () => {
    const ok = await confirm({
      title: "Save current bracket seeding?",
      description:
        "Processes walkovers for single-team slots and locks seeding for play. You can still add more teams later by resetting if the tournament has not started.",
      confirmLabel: "Save bracket",
    });
    if (!ok) return;
    await runBracketMutation(async () => {
      await finalize.mutateAsync();
      await refetch();
    });
  };

  const handleReset = async () => {
    const ok = await confirm({
      title: "Reset bracket?",
      description: isDoubleStage
        ? "This removes the knockout tree and returns the tournament to the group stage so you can regenerate from qualified teams (Groups → Generate knockout)."
        : "This removes the current bracket tree so you can generate and seed again.",
      confirmLabel: "Reset bracket",
      variant: "destructive",
    });
    if (!ok) return;
    await runBracketMutation(async () => {
      await resetBracket.mutateAsync();
      await refetch();
      if (isDoubleStage) onOpenGroups?.();
    });
  };

  const handleRecoverDoubleStage = async () => {
    const ok = await confirm({
      title: "Restore group stage for knockout?",
      description:
        "The knockout tree is missing. This clears the stuck knockout phase so you can regenerate from Groups using only qualified teams.",
      confirmLabel: "Restore & go to Groups",
      variant: "destructive",
    });
    if (!ok) return;
    await runBracketMutation(async () => {
      await resetBracket.mutateAsync();
      await refetch();
      onOpenGroups?.();
    });
  };

  const handleAssign = async () => {
    if (!seedSlot || !selectedTeamId) return;
    const team = seedableTeams.find((t) => t.id === selectedTeamId);
    const ok = await confirm({
      title: "Assign team to bracket slot?",
      description: `Place ${team?.name ?? "this team"} in the selected round-one slot. The public bracket updates immediately.`,
      confirmLabel: "Place team",
    });
    if (!ok) return;
    await runBracketMutation(async () => {
      await assign.mutateAsync({
        matchId: seedSlot.matchId,
        slot: seedSlot.slot,
        teamId: selectedTeamId,
      });
      setSeedSlot(null);
      setSelectedTeamId("");
    });
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
              <GitBranch className={cn("h-5 w-5", isOfficial ? "text-cp-primary" : cpFunAccentTextClass)} />
              Bracket setup
            </h2>
            <p className="mt-1 max-w-xl text-sm text-cp-muted">
              Place teams in round-one slots as they join — the public bracket updates live.
              {isOfficial
                ? " Only confirmed teams (paid when required) appear in the seeding list."
                : null}
            </p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href={surfaceUrls.publicUrl}>
              View public page
            </Link>
          </Button>
        </div>

        {!generated ? (
          isDoubleStage ? (
            <div className="mt-5 space-y-4">
              <p className={cn("px-3 py-2 text-sm", cpAlertInfoSurfaceClass)}>
                Double-stage knockout is built from qualified group teams only — not with Random
                seed. If the tree disappeared after a reset, restore the group phase and regenerate
                from Groups.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  disabled={resetBracket.isPending}
                  onClick={() => void handleRecoverDoubleStage()}
                >
                  {resetBracket.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <LayoutGrid className="mr-2 h-4 w-4" />
                  )}
                  Restore & go to Groups
                </Button>
                {onOpenGroups ? (
                  <Button type="button" variant="secondary" onClick={onOpenGroups}>
                    Open Groups
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                ) : null}
              </div>
            </div>
          ) : (
            <>
              {tournament.status === "live" ? (
                <p className={cn("mt-4 px-3 py-2 text-sm", cpAlertInfoSurfaceClass)}>
                  Tournament is live — open the bracket tree and place teams before scoring matches.
                </p>
              ) : null}
              <div className="mt-5 flex flex-wrap gap-2">
                <Button
                  type="button"
                  disabled={generate.isPending || seedableTeams.length < 2}
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
                  disabled={generate.isPending}
                  onClick={() => void handleGenerate("manual")}
                >
                  <Users className="mr-2 h-4 w-4" />
                  Open bracket
                </Button>
              </div>
            </>
          )
        ) : (
          <>
            <BracketSeedingStatusBanner
              state={seedingUi}
              liveScoringHref={liveScoringHref}
              onOpenLiveScoring={onOpenLiveScoring}
              variant={isOfficial ? "official" : "fun"}
            />
            {isDoubleStage && knockoutEntryEmpty ? (
              <div className="mt-4 rounded-xl border border-amber-600/25 bg-amber-500/10 px-4 py-4 text-sm text-amber-950 dark:text-amber-100">
                <p className="font-medium">Knockout bracket needs qualified teams</p>
                <p className="mt-1 text-amber-900/90 dark:text-amber-100/90">
                  The draw exists but slots are empty. Sync from group standings — only qualified
                  teams are placed automatically.
                </p>
                <Button
                  type="button"
                  className="mt-3"
                  disabled={syncingKnockout}
                  onClick={() => void syncKnockoutFromGroups()}
                >
                  {syncingKnockout ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Syncing…
                    </>
                  ) : (
                    "Sync qualified teams"
                  )}
                </Button>
              </div>
            ) : null}
            {!seedingLocked ? (
              <div className="mt-4 flex flex-col gap-3 rounded-xl border border-cp-border/80 bg-cp-elevated/20 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-cp-muted">
                  Seeding actions
                </p>
                <div className="flex flex-wrap gap-2">
                  {canRandomReseed ? (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      disabled={generate.isPending}
                      onClick={() => void handleGenerate("random")}
                    >
                      {generate.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Shuffle className="mr-2 h-4 w-4" />
                      )}
                      Random seed
                    </Button>
                  ) : null}
                  {!seedingFinalized && placedTeamCount >= 1 ? (
                    <Button
                      type="button"
                      size="sm"
                      disabled={finalize.isPending}
                      onClick={() => void handleFinalize()}
                    >
                      {finalize.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                      )}
                      Save bracket
                    </Button>
                  ) : null}
                  {!resetLocked ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={resetBracket.isPending}
                      onClick={() => void handleReset()}
                    >
                      Reset bracket
                    </Button>
                  ) : null}
                </div>
                <p className="text-xs text-cp-muted">
                  Manual edit: scroll to the bracket tree below → click a round-one slot → choose a
                  team in the picker that appears.
                </p>
              </div>
            ) : null}
          </>
        )}
      </section>

      {generated ? (
        <>
          <section className="rounded-2xl border border-cp-border bg-cp-card p-4 sm:p-5">
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-cp-muted">
                  <Swords className="h-4 w-4" />
                  Bracket tree
                </h3>
                {!seedingLocked ? (
                  <p className="mt-1 text-sm text-cp-muted">
                    Click a round-one slot labeled &ldquo;Drop squad here&rdquo;, then choose a team below.
                    {unplacedTeams.length > 0
                      ? ` ${unplacedTeams.length} eligible team${unplacedTeams.length === 1 ? "" : "s"} ready to place.`
                      : placedTeamCount > 0
                        ? " All eligible teams are placed."
                        : isOfficial
                          ? " No confirmed teams yet."
                          : " No squads with players yet."}
                  </p>
                ) : null}
              </div>
            </div>

            {!seedingLocked && seedSlot ? (
              <div
                ref={seedPickerRef}
                className="mb-4 rounded-xl border border-cp-primary/35 bg-cp-primary/5 p-4"
              >
                <p className="text-sm font-medium text-foreground">
                  Place team in {selectedMatchLabel}
                </p>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
                  <div className="min-w-0 flex-1 space-y-1">
                    <Select
                      value={selectedTeamId || "__none__"}
                      onValueChange={(v) => setSelectedTeamId(v === "__none__" ? "" : v)}
                    >
                      <SelectTrigger className={cpSelectTriggerClass}>
                        <SelectValue placeholder="Choose team" />
                      </SelectTrigger>
                      <SelectContent className={cpSelectContentClass}>
                        <SelectItem value="__none__" className={cpSelectItemClass}>
                          Choose team…
                        </SelectItem>
                        {teamsForPicker.map((t) => (
                          <SelectItem key={t.id} value={t.id} className={cpSelectItemClass}>
                            {t.name}
                            {t.members?.length
                              ? ` (${t.members.map((m) => m.displayName).join(", ")})`
                              : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    type="button"
                    onClick={() => void handleAssign()}
                    disabled={!selectedTeamId || assign.isPending}
                  >
                    {assign.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    Place team
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => setSeedSlot(null)}>
                    Cancel
                  </Button>
                </div>
                {teamsForPicker.length === 0 ? (
                  <p className="mt-2 text-xs text-cp-muted">
                    No eligible teams for this slot — confirm registrations or add squad members first.
                  </p>
                ) : null}
              </div>
            ) : null}

            <BracketTreeView
              matches={matches}
              seedingMode={!seedingLocked}
              showEmptySlots
              activeSeedSlot={seedSlot}
              onSlotClick={openSeedSlot}
            />
          </section>

          {seedingFinalized ? (
            <BracketPlayReadinessCard
              sportSlug={tournament.sportSlug}
              slug={tournament.slug}
              tournamentId={tournament.id}
              tournamentStatus={tournament.status}
              matches={matches}
              matchScoringHint={matchScoringHint}
              courtCount={courtCount}
              seedingFinalized={seedingFinalized}
              accentVariant={isOfficial ? "official" : "fun"}
              onOpenLiveScoring={onOpenLiveScoring}
              manageScoringHref={`${surfaceUrls.manageUrl}?section=scoring`}
            />
          ) : null}
        </>
      ) : null}
    </div>
  );
}
