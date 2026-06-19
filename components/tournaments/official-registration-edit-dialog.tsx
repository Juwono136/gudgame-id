"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { PlayerSearchPicker } from "@/components/tournaments/player-search-picker";
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
import { LoadingOverlay } from "@/components/ui/loading-overlay";
import type { TournamentPlayerSearchResult } from "@/lib/tournaments/players/search";

type OfficialRegistrationEditDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  registrationId: string;
  sportSlug: string;
  tournamentSlug: string;
  tournamentName: string;
  playersPerTeam?: number;
  onSaved?: () => void;
};

export function OfficialRegistrationEditDialog({
  open,
  onOpenChange,
  registrationId,
  sportSlug,
  tournamentSlug,
  tournamentName,
  playersPerTeam: propPlayersPerTeam = 2,
  onSaved,
}: OfficialRegistrationEditDialogProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [teamName, setTeamName] = useState("");
  const [partners, setPartners] = useState<TournamentPlayerSearchResult[]>([]);
  const [playersPerTeam, setPlayersPerTeam] = useState(propPlayersPerTeam);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        const res = await fetch(`/api/tournaments/registrations/${registrationId}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error?.message ?? "Could not load registration");

        const reg = json.data?.registration;
        if (cancelled) return;

        setTeamName(reg?.teamName ?? "");
        if (reg?.playersPerTeam) setPlayersPerTeam(reg.playersPerTeam);
        const members = (reg?.members ?? []) as { userId: string; displayName: string }[];
        setPartners(
          members.slice(1).map((m) => ({
            userId: m.userId,
            displayName: m.displayName,
            nickname: null,
            email: "",
            wikiSlug: null,
            image: null,
          })),
        );
      } catch (e) {
        if (!cancelled) {
          toast.error(e instanceof Error ? e.message : "Could not load team");
          onOpenChange(false);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, registrationId, onOpenChange]);

  const handleSave = async () => {
    if (!teamName.trim()) {
      toast.error("Team name is required");
      return;
    }

    const maxPartners = Math.max(0, playersPerTeam - 1);
    if (partners.length > maxPartners) {
      toast.error(`Teams can have at most ${playersPerTeam} players`);
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/tournaments/registrations/${registrationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sportSlug,
          slug: tournamentSlug,
          teamName: teamName.trim(),
          memberUserIds: partners.map((p) => p.userId),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? "Could not save changes");

      toast.success("Team updated", {
        description: "Confirm your participation when you are ready to proceed.",
      });
      onOpenChange(false);
      onSaved?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save changes");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(90dvh,40rem)] w-[calc(100%-1.5rem)] max-w-lg flex-col gap-0 border-cp-border bg-cp-card p-0 sm:w-full">
        <LoadingOverlay show={loading || saving} label={saving ? "Saving…" : "Loading…"} />

        <div className="border-b border-cp-border px-4 py-4 sm:px-6">
          <DialogHeader className="space-y-1.5 text-left">
            <DialogTitle>Edit team registration</DialogTitle>
            <DialogDescription>
              Update your team for{" "}
              <span className="font-medium text-foreground">{tournamentName}</span>. You can edit
              until you confirm participation.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-6">
          <div className="space-y-2 rounded-xl border border-cp-border bg-cp-elevated/30 p-4">
            <Label htmlFor="edit-team-name">Team name</Label>
            <Input
              id="edit-team-name"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              className="border-cp-border bg-cp-elevated"
              disabled={loading}
              placeholder="Your team name"
            />
          </div>

          <div className="space-y-3 rounded-xl border border-cp-border bg-cp-elevated/30 p-4">
            <div>
              <Label>Partners</Label>
              <p className="mt-1 text-xs text-cp-muted">
                Up to {Math.max(0, playersPerTeam - 1)} partner
                {playersPerTeam - 1 === 1 ? "" : "s"} besides you.
              </p>
            </div>
            <PlayerSearchPicker
              sportSlug={sportSlug}
              selected={partners}
              onChange={setPartners}
              maxSelections={Math.max(0, playersPerTeam - 1)}
            />
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 border-t border-cp-border px-4 py-4 sm:flex-row sm:justify-end sm:px-6">
          <Button
            variant="outline"
            className="h-10 w-full border-cp-border sm:w-auto"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            className="h-10 w-full bg-cp-primary sm:w-auto"
            disabled={loading || saving}
            onClick={() => void handleSave()}
          >
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
