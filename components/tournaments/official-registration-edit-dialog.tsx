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
  registrationId: number;
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
      <DialogContent className="max-w-lg border-cp-border bg-cp-card">
        <LoadingOverlay show={loading || saving} label={saving ? "Saving…" : "Loading…"} />
        <DialogHeader>
          <DialogTitle>Edit team registration</DialogTitle>
          <DialogDescription>
            Update your team for {tournamentName}. You can edit until you confirm participation.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="edit-team-name">Team name</Label>
            <Input
              id="edit-team-name"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              className="border-cp-border bg-cp-elevated"
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label>Partners</Label>
            <p className="text-xs text-cp-muted">
              Up to {Math.max(0, playersPerTeam - 1)} partner
              {playersPerTeam - 1 === 1 ? "" : "s"} besides you.
            </p>
            <PlayerSearchPicker
              sportSlug={sportSlug}
              selected={partners}
              onChange={setPartners}
              maxSelections={Math.max(0, playersPerTeam - 1)}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" className="border-cp-border" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button className="bg-cp-primary" disabled={loading || saving} onClick={() => void handleSave()}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
