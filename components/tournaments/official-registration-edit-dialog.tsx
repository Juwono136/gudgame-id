"use client";

import { useEffect, useState } from "react";
import { Loader2, Mail, Search, UserPlus } from "lucide-react";
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
import { cn } from "@/lib/utils";

type EditSlot = {
  mode: "empty" | "linked" | "pending";
  linked: TournamentPlayerSearchResult | null;
  displayName: string;
  email: string;
  phone: string;
};

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

function emptySlot(): EditSlot {
  return { mode: "empty", linked: null, displayName: "", email: "", phone: "" };
}

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
  const [playersPerTeam, setPlayersPerTeam] = useState(propPlayersPerTeam);
  const [slots, setSlots] = useState<EditSlot[]>([]);

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

        const ppt = reg?.playersPerTeam ?? propPlayersPerTeam;
        setTeamName(reg?.teamName ?? "");
        setPlayersPerTeam(ppt);

        const partnerSlots = Math.max(0, ppt - 1);
        const members = (reg?.members ?? []) as Array<{
          userId: string | null;
          displayName: string;
          kind?: string;
          pendingEmail?: string | null;
        }>;
        const partners = members.slice(1);
        const nextSlots: EditSlot[] = Array.from({ length: partnerSlots }, (_, i) => {
          const m = partners[i];
          if (!m) return emptySlot();
          if (m.userId) {
            return {
              mode: "linked",
              linked: {
                userId: m.userId,
                displayName: m.displayName,
                nickname: null,
                email: "",
                wikiSlug: null,
                image: null,
              },
              displayName: "",
              email: "",
              phone: "",
            };
          }
          if (m.pendingEmail || m.kind === "pending") {
            return {
              mode: "pending",
              linked: null,
              displayName: m.displayName,
              email: m.pendingEmail ?? "",
              phone: "",
            };
          }
          return emptySlot();
        });
        setSlots(nextSlots);
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
  }, [open, registrationId, onOpenChange, propPlayersPerTeam]);

  const handleSave = async () => {
    if (!teamName.trim()) {
      toast.error("Team name is required");
      return;
    }

    const members: Array<
      | { kind: "linked"; userId: string }
      | { kind: "pending"; displayName: string; email: string; phone: string | null }
    > = [];

    for (const slot of slots) {
      if (slot.mode === "linked" && slot.linked) {
        members.push({ kind: "linked", userId: slot.linked.userId });
      } else if (slot.mode === "pending") {
        if (slot.displayName.trim().length < 2 || !slot.email.trim()) {
          toast.error("Pending partners need a name and email");
          return;
        }
        members.push({
          kind: "pending",
          displayName: slot.displayName.trim(),
          email: slot.email.trim(),
          phone: slot.phone.trim() || null,
        });
      }
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
          members,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? "Could not save changes");

      toast.success("Team updated");
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
      <DialogContent className="flex max-h-[min(90dvh,42rem)] w-[calc(100%-1.5rem)] max-w-lg flex-col gap-0 border-cp-border bg-cp-card p-0 sm:w-full">
        <LoadingOverlay show={loading || saving} label={saving ? "Saving…" : "Loading…"} />

        <div className="border-b border-cp-border px-4 py-4 sm:px-6">
          <DialogHeader className="space-y-1.5 text-left">
            <DialogTitle>Edit team registration</DialogTitle>
            <DialogDescription>
              Update your team for{" "}
              <span className="font-medium text-foreground">{tournamentName}</span>. While the
              tournament is still upcoming you can add, remove, or replace partners (max roster
              size). Each player can only be on one team.
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

          {slots.map((slot, index) => (
            <div
              key={index}
              className="space-y-3 rounded-xl border border-cp-border bg-cp-elevated/30 p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Label>Partner {index + 1}</Label>
                <div className="flex flex-wrap gap-1">
                  {(
                    [
                      { mode: "empty" as const, label: "Skip", Icon: UserPlus },
                      { mode: "linked" as const, label: "Search", Icon: Search },
                      { mode: "pending" as const, label: "Invite", Icon: Mail },
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.mode}
                      type="button"
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
                        slot.mode === opt.mode
                          ? "bg-cp-primary text-white"
                          : "bg-cp-muted/20 text-cp-muted",
                      )}
                      onClick={() =>
                        setSlots((prev) =>
                          prev.map((s, i) =>
                            i === index
                              ? opt.mode === "empty"
                                ? emptySlot()
                                : { ...s, mode: opt.mode }
                              : s,
                          ),
                        )
                      }
                    >
                      <opt.Icon className="size-3" />
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {slot.mode === "linked" ? (
                <PlayerSearchPicker
                  sportSlug={sportSlug}
                  selected={slot.linked ? [slot.linked] : []}
                  maxSelections={1}
                  onChange={(next) =>
                    setSlots((prev) =>
                      prev.map((s, i) =>
                        i === index
                          ? {
                              ...s,
                              mode: next[0] ? "linked" : "empty",
                              linked: next[0] ?? null,
                            }
                          : s,
                      ),
                    )
                  }
                />
              ) : null}

              {slot.mode === "pending" ? (
                <div className="grid gap-2">
                  <Input
                    value={slot.displayName}
                    onChange={(e) =>
                      setSlots((prev) =>
                        prev.map((s, i) =>
                          i === index ? { ...s, displayName: e.target.value } : s,
                        ),
                      )
                    }
                    placeholder="Full name"
                  />
                  <Input
                    type="email"
                    value={slot.email}
                    onChange={(e) =>
                      setSlots((prev) =>
                        prev.map((s, i) =>
                          i === index ? { ...s, email: e.target.value } : s,
                        ),
                      )
                    }
                    placeholder="Email"
                  />
                </div>
              ) : null}

              {slot.mode === "empty" ? (
                <p className="text-xs text-cp-muted">Left empty — solo slot.</p>
              ) : null}
            </div>
          ))}
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
