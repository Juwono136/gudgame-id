"use client";

import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { CalendarClock, ListOrdered, Loader2, MapPin, Megaphone } from "lucide-react";
import {
  MatchScheduleBoard,
  type ScheduleCourtOption,
} from "@/components/tournaments/double-stage/match-schedule-board";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { GroupOverview } from "@/lib/tournaments/double-stage/service";
import {
  MATCH_CALL_STATUSES,
  parseCallStatus,
  type MatchCallStatus,
  type ScheduleMatchRow,
} from "@/lib/tournaments/double-stage/schedule-view";
import { getBracketRoundLabel } from "@/lib/tournaments/brackets/round-labels";
import type { BracketMatchView } from "@/lib/tournaments/brackets/service";
import { getTournamentMatchScoreMode } from "@/lib/tournaments/settings";
import type { TournamentDetail } from "@/lib/tournaments/service";
import { useStartGroupMatchOnCourt } from "@/hooks/use-double-stage-group-score";
import { useStartBracketMatchOnCourt } from "@/hooks/use-tournament-bracket";
import {
  cpSelectContentClass,
  cpSelectItemClass,
  cpSelectTriggerClass,
} from "@/lib/styles/surface-classes";
import { cn } from "@/lib/utils";

const COURT_NONE = "__none__";

type DoubleStageScheduleManageProps = {
  tournament: TournamentDetail;
  groups: GroupOverview[];
  bracketMatches?: BracketMatchView[];
  courts?: ScheduleCourtOption[];
  onUpdated?: () => void;
  /** After a successful Start — typically navigate to Live scoring. */
  onStarted?: (match: ScheduleMatchRow, courtId: string) => void;
};

type FieldErrors = {
  queueNumber?: string;
  scheduledAt?: string;
  courtStatus?: string;
};

const COURT_STATUS_OPTIONS: {
  value: MatchCallStatus;
  label: string;
  hint: string;
}[] = [
  { value: "queued", label: "In queue", hint: "Waiting — not called yet" },
  { value: "called", label: "Called", hint: "Teams should head to court" },
  { value: "on_court", label: "On court", hint: "Match is playing / about to start" },
  { value: "done", label: "Finished", hint: "This fixture is complete" },
];

function toLocalInputValue(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function validateDraft(input: {
  queueNumber: string;
  scheduledAt: string;
  courtStatus: string;
}): FieldErrors {
  const errors: FieldErrors = {};
  const q = input.queueNumber.trim();
  if (q !== "") {
    if (!/^\d+$/.test(q)) {
      errors.queueNumber = "Enter a whole number (0–9999), or leave blank.";
    } else {
      const n = Number.parseInt(q, 10);
      if (n < 0 || n > 9999) {
        errors.queueNumber = "Queue number must be between 0 and 9999.";
      }
    }
  }
  if (input.scheduledAt.trim()) {
    const d = new Date(input.scheduledAt);
    if (Number.isNaN(d.getTime())) {
      errors.scheduledAt = "Enter a valid date and time, or clear the field for TBA.";
    }
  }
  if (!MATCH_CALL_STATUSES.includes(input.courtStatus as MatchCallStatus)) {
    errors.courtStatus = "Choose a valid court status.";
  }
  return errors;
}

export function DoubleStageScheduleManage({
  tournament,
  groups,
  bracketMatches = [],
  courts = [],
  onUpdated,
  onStarted,
}: DoubleStageScheduleManageProps) {
  const gamesScoreMode = getTournamentMatchScoreMode(tournament, "group") === "games";
  const [saving, setSaving] = useState(false);
  const [startingMatchId, setStartingMatchId] = useState<string | null>(null);
  const [editing, setEditing] = useState<ScheduleMatchRow | null>(null);
  const [scheduledDraft, setScheduledDraft] = useState("");
  const [queueDraft, setQueueDraft] = useState("");
  const [courtStatusDraft, setCourtStatusDraft] = useState<MatchCallStatus>("queued");
  const [courtIdDraft, setCourtIdDraft] = useState<string>(COURT_NONE);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  const startGroupOnCourt = useStartGroupMatchOnCourt(tournament.sportSlug, tournament.slug);
  const startBracketOnCourt = useStartBracketMatchOnCourt(tournament.sportSlug, tournament.slug);

  const courtNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of courts) map.set(c.id, c.name);
    return map;
  }, [courts]);

  const rows = useMemo((): ScheduleMatchRow[] => {
    const groupRows: ScheduleMatchRow[] = groups.flatMap((g) =>
      g.matches.map((m) => ({
        id: m.id,
        kind: "group" as const,
        stageLabel: `Group stage · ${g.name}`,
        stageKindLabel: "Group stage",
        groupName: g.name,
        teamAName: m.teamAName,
        teamBName: m.teamBName,
        teamAPlayers: m.teamAPlayers?.map((p) => p.displayName).filter(Boolean) ?? [],
        teamBPlayers: m.teamBPlayers?.map((p) => p.displayName).filter(Boolean) ?? [],
        scoreA: m.scoreA,
        scoreB: m.scoreB,
        status: m.status,
        scheduledAt: m.scheduledAt,
        startedAt: m.startedAt,
        courtId: m.courtId,
        courtName: m.courtId ? courtNameById.get(m.courtId) ?? null : null,
        playOrder: m.playOrder,
        callStatus: parseCallStatus(m.callStatus),
      })),
    );

    const totalRounds = bracketMatches.length
      ? Math.max(...bracketMatches.map((m) => m.roundNumber), 1)
      : 1;
    const bracketRows: ScheduleMatchRow[] = bracketMatches.map((m) => ({
      id: m.id,
      kind: "bracket" as const,
      stageLabel: getBracketRoundLabel(m.roundNumber, totalRounds),
      stageKindLabel: getBracketRoundLabel(m.roundNumber, totalRounds),
      groupName: null,
      teamAName: m.teamAName,
      teamBName: m.teamBName,
      teamAPlayers: m.teamAPlayers ?? [],
      teamBPlayers: m.teamBPlayers ?? [],
      scoreA: m.scoreA,
      scoreB: m.scoreB,
      status: m.status,
      scheduledAt: m.scheduledAt,
      courtId: m.courtId,
      courtName: m.courtId ? courtNameById.get(m.courtId) ?? null : null,
      playOrder: m.playOrder,
      callStatus: parseCallStatus(m.callStatus),
    }));

    return [...groupRows, ...bracketRows];
  }, [groups, bracketMatches, courtNameById]);

  const occupiedCourtIds = useMemo(() => {
    const set = new Set<string>();
    for (const row of rows) {
      if (row.status === "in_progress" && row.courtId) set.add(row.courtId);
    }
    return set;
  }, [rows]);

  const openEditor = useCallback((match: ScheduleMatchRow) => {
    setEditing(match);
    setScheduledDraft(toLocalInputValue(match.scheduledAt));
    setQueueDraft(match.playOrder != null ? String(match.playOrder) : "");
    setCourtStatusDraft(match.callStatus ?? "queued");
    setCourtIdDraft(match.courtId ?? COURT_NONE);
    setFieldErrors({});
    setFormError(null);
  }, []);

  const clearDrafts = () => {
    setScheduledDraft("");
    setQueueDraft("");
    setCourtStatusDraft("queued");
    setCourtIdDraft(COURT_NONE);
    setFieldErrors({});
    setFormError(null);
  };

  const postSchedule = async (input: {
    kind: "group" | "bracket";
    matchId: string;
    scheduledAt?: string | null;
    playOrder?: number | null;
    callStatus?: MatchCallStatus;
    courtId?: string | null;
  }) => {
    const res = await fetch(
      `/api/tournaments/${tournament.sportSlug}/${tournament.slug}/manage/schedule`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      },
    );
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error?.message ?? "Failed to save schedule");
    }
    return json;
  };

  const save = async () => {
    if (!editing) return;
    const errors = validateDraft({
      queueNumber: queueDraft,
      scheduledAt: scheduledDraft,
      courtStatus: courtStatusDraft,
    });
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      setFormError("Fix the highlighted fields before saving.");
      return;
    }

    setSaving(true);
    setFormError(null);
    try {
      const scheduledAt = scheduledDraft.trim()
        ? new Date(scheduledDraft).toISOString()
        : null;
      const playOrder =
        queueDraft.trim() === "" ? null : Number.parseInt(queueDraft.trim(), 10);
      const courtId = courtIdDraft === COURT_NONE ? null : courtIdDraft;

      await postSchedule({
        kind: editing.kind,
        matchId: editing.id,
        scheduledAt,
        playOrder,
        callStatus: courtStatusDraft,
        courtId,
      });
      toast.success("Match schedule updated");
      setEditing(null);
      onUpdated?.();
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to save schedule";
      setFormError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleCourtChange = useCallback(
    async (match: ScheduleMatchRow, courtId: string | null) => {
      if (match.status === "in_progress" || match.status === "completed" || match.status === "bye") {
        return;
      }
      try {
        await postSchedule({
          kind: match.kind,
          matchId: match.id,
          courtId,
        });
        onUpdated?.();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Could not assign court");
      }
    },
    // postSchedule closes over tournament ids — stable enough per mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tournament.sportSlug, tournament.slug, onUpdated],
  );

  const handleStartMatch = useCallback(
    async (match: ScheduleMatchRow, courtId: string) => {
      if (!courtId) {
        toast.error("Select a court before starting");
        return;
      }
      if (occupiedCourtIds.has(courtId) && match.courtId !== courtId) {
        toast.error("That court already has a live match");
        return;
      }
      if (!match.teamAName || !match.teamBName) {
        toast.error("Both teams must be set before starting");
        return;
      }

      setStartingMatchId(match.id);
      try {
        if (match.kind === "group") {
          await startGroupOnCourt.mutateAsync({ matchId: match.id, courtId });
        } else {
          await startBracketOnCourt.mutateAsync({ matchId: match.id, courtId });
        }
        toast.success(
          `Started on ${courtNameById.get(courtId) ?? "court"} — opening live scoring`,
        );
        onUpdated?.();
        onStarted?.(match, courtId);
      } catch {
        // Hook already toasts API errors
      } finally {
        setStartingMatchId(null);
      }
    },
    [
      occupiedCourtIds,
      startGroupOnCourt,
      startBracketOnCourt,
      courtNameById,
      onUpdated,
      onStarted,
    ],
  );

  const canStartFromSchedule = courts.length > 0;

  return (
    <>
      <MatchScheduleBoard
        matches={rows}
        gamesScoreMode={gamesScoreMode}
        onEditSchedule={openEditor}
        onStartMatch={canStartFromSchedule ? handleStartMatch : undefined}
        courts={canStartFromSchedule ? courts : undefined}
        occupiedCourtIds={occupiedCourtIds}
        startingMatchId={startingMatchId}
        onCourtChange={canStartFromSchedule ? handleCourtChange : undefined}
        defaultView="orderOfPlay"
        emptyMessage="Fixtures appear after groups are generated. Use Schedule on a match to set queue position and start time."
      />

      <Dialog
        open={Boolean(editing)}
        onOpenChange={(o) => {
          if (!o && !saving) {
            setEditing(null);
            setFieldErrors({});
            setFormError(null);
          }
        }}
      >
        <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-lg">
          <div className="border-b border-cp-border bg-gradient-to-br from-cp-primary/12 via-cp-card to-cp-card px-5 pb-4 pt-5 sm:px-6">
            <DialogHeader className="space-y-2 text-left">
              <DialogTitle className="flex items-center gap-2 text-lg">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-cp-primary/20 text-cp-primary">
                  <CalendarClock className="h-4 w-4" aria-hidden />
                </span>
                Edit match schedule
              </DialogTitle>
              <DialogDescription className="sr-only">
                Set queue position, court, call status, and optional start time.
              </DialogDescription>
              <div className="space-y-0.5">
                <p className="text-sm font-semibold text-foreground">
                  {editing
                    ? `${editing.teamAName ?? "TBD"} vs ${editing.teamBName ?? "TBD"}`
                    : null}
                </p>
                <p className="text-xs text-cp-muted">{editing?.stageLabel}</p>
              </div>
            </DialogHeader>
          </div>

          <div className="space-y-5 px-5 py-4 sm:px-6">
            <div className="space-y-2">
              <Label htmlFor="queue-number" className="inline-flex items-center gap-1.5">
                <ListOrdered className="h-3.5 w-3.5 text-cp-primary" aria-hidden />
                Queue number
              </Label>
              <Input
                id="queue-number"
                type="number"
                min={0}
                max={9999}
                inputMode="numeric"
                value={queueDraft}
                aria-invalid={Boolean(fieldErrors.queueNumber)}
                aria-describedby={
                  fieldErrors.queueNumber ? "queue-number-error" : "queue-number-hint"
                }
                onChange={(e) => {
                  setQueueDraft(e.target.value);
                  if (fieldErrors.queueNumber) {
                    setFieldErrors((prev) => ({ ...prev, queueNumber: undefined }));
                  }
                }}
                placeholder="e.g. 101"
                className={cn(
                  "border-cp-border bg-cp-elevated",
                  fieldErrors.queueNumber && "border-red-500/60 focus-visible:ring-red-500/30",
                )}
              />
              {fieldErrors.queueNumber ? (
                <p id="queue-number-error" className="text-[11px] text-red-400" role="alert">
                  {fieldErrors.queueNumber}
                </p>
              ) : (
                <p id="queue-number-hint" className="text-[11px] text-cp-muted">
                  Position in Order of Play. Lower numbers appear earlier (Now → Next → Later).
                </p>
              )}
            </div>

            {courts.length > 0 ? (
              <div className="space-y-2">
                <Label className="inline-flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-cp-primary" aria-hidden />
                  Court
                </Label>
                <Select value={courtIdDraft} onValueChange={setCourtIdDraft}>
                  <SelectTrigger className={cn(cpSelectTriggerClass, "w-full")}>
                    <SelectValue placeholder="Assign court (optional)" />
                  </SelectTrigger>
                  <SelectContent className={cpSelectContentClass}>
                    <SelectItem value={COURT_NONE} className={cpSelectItemClass}>
                      No court yet
                    </SelectItem>
                    {courts.map((c) => {
                      const busy =
                        occupiedCourtIds.has(c.id) && editing?.courtId !== c.id;
                      return (
                        <SelectItem
                          key={c.id}
                          value={c.id}
                          disabled={busy}
                          className={cpSelectItemClass}
                        >
                          {c.name}
                          {busy ? " · live" : ""}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-cp-muted">
                  Optional pre-assign. You can also pick a court on the row and press Start.
                </p>
              </div>
            ) : null}

            <div className="space-y-2">
              <Label className="inline-flex items-center gap-1.5">
                <Megaphone className="h-3.5 w-3.5 text-cp-primary" aria-hidden />
                Court call
              </Label>
              <div
                className="grid gap-2 sm:grid-cols-2"
                role="radiogroup"
                aria-label="Court call status"
              >
                {COURT_STATUS_OPTIONS.map((opt) => {
                  const selected = courtStatusDraft === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => {
                        setCourtStatusDraft(opt.value);
                        if (fieldErrors.courtStatus) {
                          setFieldErrors((prev) => ({ ...prev, courtStatus: undefined }));
                        }
                      }}
                      className={cn(
                        "rounded-xl border px-3 py-2.5 text-left transition-colors",
                        selected
                          ? "border-cp-primary/50 bg-cp-primary/10 ring-1 ring-cp-primary/30"
                          : "border-cp-border bg-cp-elevated/30 hover:border-cp-primary/30",
                      )}
                    >
                      <p className="text-sm font-semibold text-foreground">{opt.label}</p>
                      <p className="mt-0.5 text-[11px] text-cp-muted">{opt.hint}</p>
                    </button>
                  );
                })}
              </div>
              {fieldErrors.courtStatus ? (
                <p className="text-[11px] text-red-400" role="alert">
                  {fieldErrors.courtStatus}
                </p>
              ) : (
                <p className="text-[11px] text-cp-muted">
                  Controls Now / Next / Later buckets on the public Matches tab.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="scheduled-start" className="inline-flex items-center gap-1.5">
                <CalendarClock className="h-3.5 w-3.5 text-cp-primary" aria-hidden />
                Scheduled start
              </Label>
              <Input
                id="scheduled-start"
                type="datetime-local"
                value={scheduledDraft}
                aria-invalid={Boolean(fieldErrors.scheduledAt)}
                aria-describedby={
                  fieldErrors.scheduledAt ? "scheduled-start-error" : "scheduled-start-hint"
                }
                onChange={(e) => {
                  setScheduledDraft(e.target.value);
                  if (fieldErrors.scheduledAt) {
                    setFieldErrors((prev) => ({ ...prev, scheduledAt: undefined }));
                  }
                }}
                className={cn(
                  "border-cp-border bg-cp-elevated",
                  fieldErrors.scheduledAt && "border-red-500/60 focus-visible:ring-red-500/30",
                )}
              />
              {fieldErrors.scheduledAt ? (
                <p id="scheduled-start-error" className="text-[11px] text-red-400" role="alert">
                  {fieldErrors.scheduledAt}
                </p>
              ) : (
                <p id="scheduled-start-hint" className="text-[11px] text-cp-muted">
                  Optional local start time. Leave empty to show TBA publicly.
                </p>
              )}
            </div>

            {formError ? (
              <div
                className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300"
                role="alert"
              >
                {formError}
              </div>
            ) : null}
          </div>

          <DialogFooter className="gap-2 border-t border-cp-border bg-cp-elevated/30 px-5 py-3 sm:gap-2 sm:px-6">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={clearDrafts}
              disabled={saving}
              className="mr-auto"
            >
              Clear fields
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setEditing(null)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="button" size="sm" onClick={() => void save()} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Saving…
                </>
              ) : (
                "Save changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
