"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Loader2,
  Mail,
  Search,
  UserPlus,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { PlayerSearchPicker } from "@/components/tournaments/player-search-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingOverlay } from "@/components/ui/loading-overlay";
import { useConfirmDialog } from "@/providers/confirm-dialog-provider";
import { publicSportRoutes } from "@/lib/constants/routes";
import { formatIdrDisplay, formatRegistrationFeeIdr } from "@/lib/format/currency";
import type { TournamentDetail } from "@/lib/tournaments/service";
import type { TournamentPlayerSearchResult } from "@/lib/tournaments/players/search";
import { cn } from "@/lib/utils";

type PartnerSlotMode = "empty" | "linked" | "pending";

type PartnerSlot = {
  mode: PartnerSlotMode;
  linked: TournamentPlayerSearchResult | null;
  displayName: string;
  email: string;
  phone: string;
};

type OfficialRegistrationWizardProps = {
  tournament: TournamentDetail;
  hubHref?: string;
  captainDisplayName?: string;
};

function emptySlot(): PartnerSlot {
  return {
    mode: "empty",
    linked: null,
    displayName: "",
    email: "",
    phone: "",
  };
}

export function OfficialRegistrationWizard({
  tournament,
  hubHref: hubHrefProp,
  captainDisplayName = "You",
}: OfficialRegistrationWizardProps) {
  const router = useRouter();
  const { confirm } = useConfirmDialog();
  const playersPerTeam = tournament.playersPerTeam ?? 2;
  const partnerCount = Math.max(0, playersPerTeam - 1);
  const isSingles = partnerCount === 0;
  const isFreeOfficial = tournament.officialBilling === "free";
  const fee = tournament.registrationFeeIdr ?? 0;

  const [teamName, setTeamName] = useState("");
  const [slots, setSlots] = useState<PartnerSlot[]>(() =>
    Array.from({ length: partnerCount }, () => emptySlot()),
  );
  const [submitting, setSubmitting] = useState(false);

  const hubHref =
    hubHrefProp ?? publicSportRoutes.tournament(tournament.sportSlug, tournament.slug);

  const filledPartners = useMemo(
    () => slots.filter((s) => s.mode === "linked" || s.mode === "pending"),
    [slots],
  );

  const updateSlot = (index: number, patch: Partial<PartnerSlot>) => {
    setSlots((prev) =>
      prev.map((slot, i) => (i === index ? { ...slot, ...patch } : slot)),
    );
  };

  const setSlotMode = (index: number, mode: PartnerSlotMode) => {
    if (mode === "empty") {
      updateSlot(index, emptySlot());
      return;
    }
    updateSlot(index, {
      mode,
      linked: mode === "linked" ? slots[index]?.linked ?? null : null,
      displayName: mode === "pending" ? slots[index]?.displayName ?? "" : "",
      email: mode === "pending" ? slots[index]?.email ?? "" : "",
      phone: mode === "pending" ? slots[index]?.phone ?? "" : "",
    });
  };

  const excludeUserIds = useMemo(() => {
    const ids = new Set<string>();
    for (const slot of slots) {
      if (slot.linked?.userId) ids.add(slot.linked.userId);
    }
    return ids;
  }, [slots]);

  const validate = (): string | null => {
    if (!isSingles && teamName.trim().length < 2) {
      return "Team name is required (at least 2 characters).";
    }
    for (let i = 0; i < slots.length; i += 1) {
      const slot = slots[i]!;
      if (slot.mode === "empty") continue;
      if (slot.mode === "linked" && !slot.linked) {
        return `Partner ${i + 1}: choose a Gud Game player or switch to invite.`;
      }
      if (slot.mode === "pending") {
        if (slot.displayName.trim().length < 2) {
          return `Partner ${i + 1}: name is required.`;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(slot.email.trim())) {
          return `Partner ${i + 1}: enter a valid email.`;
        }
      }
    }
    return null;
  };

  const buildMembersPayload = () => {
    const members: Array<
      | { kind: "linked"; userId: string }
      | { kind: "pending"; displayName: string; email: string; phone: string | null }
    > = [];
    for (const slot of slots) {
      if (slot.mode === "linked" && slot.linked) {
        members.push({ kind: "linked", userId: slot.linked.userId });
      } else if (slot.mode === "pending") {
        members.push({
          kind: "pending",
          displayName: slot.displayName.trim(),
          email: slot.email.trim(),
          phone: slot.phone.trim() || null,
        });
      }
    }
    return members;
  };

  const handleSubmit = async () => {
    const error = validate();
    if (error) {
      toast.error(error);
      return;
    }

    const resolvedTeamName =
      teamName.trim() ||
      (isSingles ? captainDisplayName : "");

    const ok = await confirm({
      title: isFreeOfficial ? "Confirm registration?" : "Continue to payment?",
      description: isFreeOfficial
        ? `Register "${resolvedTeamName}" for ${tournament.name}. Pending partners will get an email to claim their spot.`
        : `Reserve "${resolvedTeamName}" for ${tournament.name}. You will complete payment next. Partner invites are sent after payment.`,
      confirmLabel: isFreeOfficial ? "Confirm registration" : "Continue to payment",
      cancelLabel: "Cancel",
    });
    if (!ok) return;

    setSubmitting(true);
    try {
      const res = await fetch(
        `/api/tournaments/${tournament.sportSlug}/${tournament.slug}/register`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            teamName: resolvedTeamName,
            members: buildMembersPayload(),
          }),
        },
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? "Registration failed");

      const data = json.data as {
        status?: string;
        confirmUrl?: string;
        checkoutUrl?: string;
        successUrl?: string;
      };

      if (data.checkoutUrl) {
        toast.success("Team reserved — complete payment to finish.");
        router.push(data.checkoutUrl);
        return;
      }
      if (data.confirmUrl) {
        toast.success("Registration submitted");
        router.push(data.confirmUrl);
        return;
      }
      toast.success("You're registered!");
      router.push(data.successUrl || hubHref);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Registration failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:py-10">
      <LoadingOverlay show={submitting} label="Submitting registration…" />

      <div className="mb-6 flex items-center justify-between gap-3">
        <Link
          href={hubHref}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Cancel
        </Link>
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Register team
        </p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="mb-8"
      >
        <h1 className="font-heading text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Register your team
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">
          {tournament.name}
        </p>
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-5">
          <section className="rounded-2xl border border-border/60 bg-card/40 p-5 sm:p-6">
            <div className="mb-4 flex items-center gap-2">
              <Users className="size-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">Team</h2>
            </div>

            {!isSingles ? (
              <div className="space-y-2">
                <Label htmlFor="team-name">Team name *</Label>
                <Input
                  id="team-name"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="Enter your team name"
                  maxLength={120}
                  autoComplete="off"
                />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Singles event — you register as yourself. No partners needed.
              </p>
            )}

            <div className="mt-4 rounded-xl border border-border/50 bg-muted/20 px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Captain
              </p>
              <p className="mt-1 text-sm font-medium text-foreground">{captainDisplayName}</p>
              <p className="text-xs text-muted-foreground">Signed-in account (you)</p>
            </div>
          </section>

          {partnerCount > 0 ? (
            <section className="rounded-2xl border border-border/60 bg-card/40 p-5 sm:p-6">
              <div className="mb-2 flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-foreground">Partners</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Add up to {partnerCount} partner{partnerCount === 1 ? "" : "s"}, or leave empty
                    to register solo.
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
                  {filledPartners.length}/{partnerCount}
                </span>
              </div>

              <div className="mt-5 space-y-4">
                {slots.map((slot, index) => (
                  <PartnerSlotCard
                    key={index}
                    index={index}
                    slot={slot}
                    sportSlug={tournament.sportSlug}
                    excludeUserIds={excludeUserIds}
                    onModeChange={(mode) => setSlotMode(index, mode)}
                    onLinkedChange={(linked) =>
                      updateSlot(index, {
                        mode: linked ? "linked" : "empty",
                        linked,
                      })
                    }
                    onPendingChange={(patch) => updateSlot(index, patch)}
                  />
                ))}
              </div>
            </section>
          ) : null}
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl border border-border/60 bg-card/50 p-5 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Entry
            </p>
            <p className="mt-2 font-heading text-3xl font-semibold text-primary">
              {isFreeOfficial ? "Free" : formatRegistrationFeeIdr(fee)}
            </p>
            {!isFreeOfficial && fee > 0 ? (
              <p className="mt-1 text-xs text-muted-foreground">
                Gateway fees may apply at checkout (~
                {formatIdrDisplay(Math.round(fee * 0.0125))})
              </p>
            ) : (
              <p className="mt-1 text-xs text-muted-foreground">
                No payment required for this Official free event.
              </p>
            )}

            <ul className="mt-4 space-y-2 border-t border-border/50 pt-4 text-sm text-muted-foreground">
              <li className="flex justify-between gap-3">
                <span>Format</span>
                <span className="text-right text-foreground">{tournament.format.replaceAll("_", " ")}</span>
              </li>
              <li className="flex justify-between gap-3">
                <span>Players / team</span>
                <span className="text-foreground">{playersPerTeam}</span>
              </li>
              <li className="flex justify-between gap-3">
                <span>Partners filled</span>
                <span className="text-foreground">
                  {filledPartners.length}
                  {filledPartners.length === 0 ? " (solo)" : ""}
                </span>
              </li>
            </ul>

            <Button
              type="button"
              className="mt-5 w-full bg-primary text-primary-foreground hover:bg-primary/90"
              size="lg"
              disabled={submitting}
              onClick={() => void handleSubmit()}
            >
              {submitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Submitting…
                </>
              ) : isFreeOfficial ? (
                "Confirm registration"
              ) : (
                "Continue to payment"
              )}
            </Button>
            <p className="mt-3 text-center text-xs text-muted-foreground">
              Partners without an account get an email to claim their spot. Career stats apply after
              claim.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

function PartnerSlotCard({
  index,
  slot,
  sportSlug,
  excludeUserIds,
  onModeChange,
  onLinkedChange,
  onPendingChange,
}: {
  index: number;
  slot: PartnerSlot;
  sportSlug: string;
  excludeUserIds: Set<string>;
  onModeChange: (mode: PartnerSlotMode) => void;
  onLinkedChange: (linked: TournamentPlayerSearchResult | null) => void;
  onPendingChange: (patch: Partial<PartnerSlot>) => void;
}) {
  return (
    <div className="rounded-xl border border-border/50 bg-background/40 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-foreground">Partner {index + 1}</p>
        <div className="flex flex-wrap gap-1.5">
          {(
            [
              { mode: "empty" as const, label: "Solo / skip", icon: null },
              { mode: "linked" as const, label: "Search", icon: Search },
              { mode: "pending" as const, label: "Invite email", icon: Mail },
            ] as const
          ).map((opt) => {
            const active = slot.mode === opt.mode;
            const Icon = opt.icon;
            return (
              <button
                key={opt.mode}
                type="button"
                onClick={() => onModeChange(opt.mode)}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:text-foreground",
                )}
              >
                {Icon ? <Icon className="size-3" /> : <UserPlus className="size-3" />}
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {slot.mode === "empty" ? (
        <p className="text-sm text-muted-foreground">
          Leave empty to keep this slot open (solo captain is allowed).
        </p>
      ) : null}

      {slot.mode === "linked" ? (
        <PlayerSearchPicker
          sportSlug={sportSlug}
          selected={slot.linked ? [slot.linked] : []}
          maxSelections={1}
          excludeUserIds={[...excludeUserIds].filter((id) => id !== slot.linked?.userId)}
          onChange={(next) => onLinkedChange(next[0] ?? null)}
        />
      ) : null}

      {slot.mode === "pending" ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Full name *</Label>
            <Input
              value={slot.displayName}
              onChange={(e) => onPendingChange({ displayName: e.target.value })}
              placeholder="Partner full name"
              maxLength={120}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Email *</Label>
            <Input
              type="email"
              value={slot.email}
              onChange={(e) => onPendingChange({ email: e.target.value })}
              placeholder="partner@email.com"
              maxLength={255}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Phone (optional)</Label>
            <Input
              value={slot.phone}
              onChange={(e) => onPendingChange({ phone: e.target.value })}
              placeholder="08…"
              maxLength={32}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
