"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
import { PartnerPlayerSearchPicker } from "@/components/partners/registration/partner-player-search-picker";
import { PartnerLoadingOverlay } from "@/components/partners/partner-loading";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { usePartnerPlayerSession } from "@/hooks/use-partner-player-session";
import { partnerPublicRoutes } from "@/lib/constants/routes";
import { formatIdrDisplay } from "@/lib/format/currency";
import type { PartnerPlayerSearchResult } from "@/lib/partners/registration/search-players";
import { partnerGuestRegistrationSchema } from "@/lib/partners/registration/validation";
import { partnerPhoneForAutofill } from "@/lib/partners/registration/phone";
import { useConfirmDialog } from "@/providers/confirm-dialog-provider";
import { cn } from "@/lib/utils";

type TeammateMode = "search" | "invite" | "soft";

type TeammateSlot = {
  mode: TeammateMode;
  linked: PartnerPlayerSearchResult | null;
  fullName: string;
  email: string;
  phone: string;
};

type PartnerRegistrationFormProps = {
  partnerSlug: string;
  partnerDisplayName: string;
  tournamentSlug: string;
  tournamentName: string;
  playersPerTeam: number;
  feeIdr: number | null;
  isPaid: boolean;
  formatLabel?: string | null;
  spotsRemaining?: number | null;
  hubHref: string;
};

function firstFieldErrorMessage(issues: unknown): string | null {
  if (!issues || typeof issues !== "object") return null;
  const fieldErrors = (issues as { fieldErrors?: Record<string, string[] | undefined> })
    .fieldErrors;
  if (!fieldErrors) return null;
  for (const messages of Object.values(fieldErrors)) {
    if (Array.isArray(messages) && messages[0]) return messages[0];
  }
  return null;
}

function emptySlot(): TeammateSlot {
  return {
    mode: "invite",
    linked: null,
    fullName: "",
    email: "",
    phone: "",
  };
}

export function PartnerRegistrationForm({
  partnerSlug,
  partnerDisplayName,
  tournamentSlug,
  tournamentName,
  playersPerTeam,
  feeIdr,
  isPaid,
  formatLabel = null,
  spotsRemaining = null,
  hubHref,
}: PartnerRegistrationFormProps) {
  const router = useRouter();
  const { confirm } = useConfirmDialog();
  const [submitting, setSubmitting] = useState(false);
  const { session, isAuthenticated, hydrated } = usePartnerPlayerSession(partnerSlug);
  const captainAutofilledRef = useRef(false);

  const partnerCount = Math.max(0, playersPerTeam - 1);
  const isSingles = partnerCount === 0;
  const signedInMember =
    hydrated && isAuthenticated && Boolean(session?.playerId && session.email);
  const schema = useMemo(
    () => partnerGuestRegistrationSchema(playersPerTeam, { memberCaptain: signedInMember }),
    [playersPerTeam, signedInMember],
  );

  const [captain, setCaptain] = useState({ fullName: "", email: "", phone: "" });
  const [teamName, setTeamName] = useState("");
  const [notes, setNotes] = useState("");
  const [slots, setSlots] = useState<TeammateSlot[]>(() =>
    Array.from({ length: partnerCount }, () => emptySlot()),
  );

  useEffect(() => {
    if (!hydrated || !isAuthenticated || !session || captainAutofilledRef.current) {
      return;
    }
    captainAutofilledRef.current = true;
    setCaptain({
      fullName: session.displayName || "",
      email: session.email || "",
      phone: partnerPhoneForAutofill(session.phone) ?? "",
    });
  }, [hydrated, isAuthenticated, session]);

  const filledTeammates = useMemo(
    () =>
      slots.filter((s) => {
        if (s.mode === "search") return Boolean(s.linked);
        if (s.mode === "soft") return s.fullName.trim().length >= 2;
        return s.fullName.trim().length >= 2 && (s.email.trim() || s.phone.trim());
      }),
    [slots],
  );

  const excludePlayerIds = useMemo(() => {
    const ids: string[] = [];
    if (session?.playerId) ids.push(session.playerId);
    for (const slot of slots) {
      if (slot.linked?.playerId) ids.push(slot.linked.playerId);
    }
    return ids;
  }, [slots, session?.playerId]);

  const updateSlot = (index: number, patch: Partial<TeammateSlot>) => {
    setSlots((prev) => prev.map((slot, i) => (i === index ? { ...slot, ...patch } : slot)));
  };

  const setSlotMode = (index: number, mode: TeammateMode) => {
    if (mode === "search") {
      updateSlot(index, {
        mode,
        linked: slots[index]?.linked ?? null,
        fullName: "",
        email: "",
        phone: "",
      });
      return;
    }
    updateSlot(index, {
      mode,
      linked: null,
      fullName: slots[index]?.fullName ?? "",
      email: mode === "invite" ? slots[index]?.email ?? "" : "",
      phone: mode === "invite" ? slots[index]?.phone ?? "" : "",
    });
  };

  const buildPayload = () => {
    const members = slots.map((slot) => {
      if (slot.mode === "search" && slot.linked) {
        return {
          fullName: slot.linked.fullName,
          email: slot.linked.email,
          phone: slot.linked.phone,
          partnerPlayerId: slot.linked.playerId,
          softProfile: false,
        };
      }
      if (slot.mode === "soft") {
        return {
          fullName: slot.fullName.trim(),
          email: "",
          phone: "",
          softProfile: true,
        };
      }
      return {
        fullName: slot.fullName.trim(),
        email: slot.email.trim(),
        phone: slot.phone.trim(),
        softProfile: false,
      };
    });

    const captainFromSession =
      signedInMember && session
        ? {
            fullName: session.displayName.trim(),
            email: session.email.trim(),
            phone: partnerPhoneForAutofill(session.phone) ?? captain.phone.trim(),
          }
        : {
            fullName: captain.fullName.trim(),
            email: captain.email.trim(),
            phone: captain.phone.trim(),
          };

    return {
      captain: captainFromSession,
      teamName: teamName.trim(),
      members,
      notes: notes.trim(),
    };
  };

  const handleSubmit = async () => {
    const payload = buildPayload();
    const parsed = schema.safeParse(payload);
    if (!parsed.success) {
      const first = parsed.error.issues[0]?.message ?? "Please check the form and try again.";
      toast.error(first);
      return;
    }

    const resolvedTeamName =
      parsed.data.teamName ||
      (isSingles ? parsed.data.captain.fullName : `${parsed.data.captain.fullName}'s Team`);

    const ok = await confirm({
      title: isPaid ? "Continue to payment?" : "Confirm registration?",
      description: isPaid
        ? `Reserve "${resolvedTeamName}" for ${tournamentName}. You will complete payment next.`
        : `Register "${resolvedTeamName}" for ${tournamentName}. The organizer will confirm your spot.`,
      confirmLabel: isPaid ? "Continue to payment" : "Confirm registration",
      cancelLabel: "Cancel",
    });
    if (!ok) return;

    setSubmitting(true);
    try {
      const wire = {
        captain: {
          fullName: parsed.data.captain.fullName,
          email: parsed.data.captain.email,
          phone: parsed.data.captain.phone ?? "",
        },
        teamName: parsed.data.teamName ?? "",
        members: Array.from({ length: partnerCount }, (_, index) => {
          const m = parsed.data.members[index];
          return {
            fullName: m?.fullName ?? "",
            email: m?.email ?? "",
            phone: m?.phone ?? "",
            partnerPlayerId: m?.partnerPlayerId,
            softProfile: m?.softProfile === true,
          };
        }),
        notes: parsed.data.notes ?? "",
      };

      const res = await fetch(
        `/api/partner/public/${encodeURIComponent(partnerSlug)}/tournaments/${encodeURIComponent(tournamentSlug)}/register`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(wire),
        },
      );
      const json = (await res.json().catch(() => null)) as {
        success?: boolean;
        data?: { status: string; payUrl?: string; successUrl: string };
        error?: { message?: string; context?: { issues?: unknown } };
      } | null;

      if (!res.ok || !json?.data) {
        const fromFields = firstFieldErrorMessage(json?.error?.context?.issues);
        throw new Error(
          fromFields ?? json?.error?.message ?? "Registration failed. Please check your details.",
        );
      }

      const data = json.data;
      toast.success(
        data.status === "registered"
          ? "Registration submitted — awaiting organizer confirmation"
          : "Team reserved — complete payment",
      );
      router.push(data.status === "registered" ? data.successUrl : data.payUrl ?? data.successUrl);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Registration failed");
    } finally {
      setSubmitting(false);
    }
  };

  const memberLoginHref = `${partnerPublicRoutes.login(partnerSlug)}?callbackUrl=${encodeURIComponent(
    partnerPublicRoutes.tournamentRegister(partnerSlug, tournamentSlug),
  )}`;

  return (
    <div className="mx-auto w-full max-w-5xl">
      <PartnerLoadingOverlay
        show={submitting}
        label="Submitting registration…"
        variant="fullscreen"
      />

      <div className="mb-6 flex items-center justify-between gap-3">
        <Link
          href={hubHref}
          className="inline-flex items-center gap-1.5 text-sm text-cp-muted transition hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Cancel
        </Link>
        <p className="text-xs font-medium uppercase tracking-wide text-cp-muted">Register team</p>
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
        <p className="mt-2 max-w-2xl text-sm text-cp-muted sm:text-base">{tournamentName}</p>
        {spotsRemaining != null ? (
          <p className="mt-2 text-sm text-cp-muted">
            {spotsRemaining === 1
              ? "1 team spot remaining."
              : `${spotsRemaining} team spots remaining.`}
          </p>
        ) : null}
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-5">
          <section className="rounded-2xl border border-cp-border/60 bg-cp-card/40 p-5 sm:p-6">
            <div className="mb-4 flex items-center gap-2">
              <Users className="size-4 text-cp-primary" />
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
                  className="border-cp-border bg-cp-bg-input"
                />
              </div>
            ) : (
              <p className="text-sm text-cp-muted">
                Singles event — you register as yourself. No teammates needed.
              </p>
            )}

            <div className="mt-4 rounded-xl border border-cp-border/50 bg-cp-elevated/30 px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-wide text-cp-muted">Captain</p>
              {signedInMember && session ? (
                <>
                  <p className="mt-1 text-sm font-medium text-foreground">{session.displayName}</p>
                  <p className="text-xs text-cp-muted">
                    Signed-in {partnerDisplayName} member — details from your account (like Gud Game)
                  </p>
                  {!session.phone?.trim() ? (
                    <p className="mt-2 text-[11px] leading-relaxed text-amber-800 dark:text-amber-200">
                      Add a phone number on your{" "}
                      <Link
                        href={partnerPublicRoutes.account(partnerSlug)}
                        className="font-medium underline underline-offset-2"
                      >
                        player profile
                      </Link>{" "}
                      so organizers can reach you. Registration still works with your saved account.
                    </p>
                  ) : null}
                </>
              ) : (
                <p className="mt-1 text-xs text-cp-muted">
                  Guest captain details below.{" "}
                  <Link href={memberLoginHref} className="text-cp-primary hover:underline">
                    Sign in as a member
                  </Link>{" "}
                  to sync stats automatically.
                </p>
              )}
            </div>

            {!signedInMember ? (
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="captain-name">Full name *</Label>
                  <Input
                    id="captain-name"
                    value={captain.fullName}
                    onChange={(e) => setCaptain((c) => ({ ...c, fullName: e.target.value }))}
                    placeholder="Jane Doe"
                    autoComplete="name"
                    className="border-cp-border bg-cp-bg-input"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="captain-email">Email *</Label>
                  <Input
                    id="captain-email"
                    type="email"
                    value={captain.email}
                    onChange={(e) => setCaptain((c) => ({ ...c, email: e.target.value }))}
                    placeholder="jane@example.com"
                    autoComplete="email"
                    className="border-cp-border bg-cp-bg-input"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="captain-phone">Phone *</Label>
                  <Input
                    id="captain-phone"
                    type="tel"
                    value={captain.phone}
                    onChange={(e) => setCaptain((c) => ({ ...c, phone: e.target.value }))}
                    placeholder="0812xxxxxxx"
                    autoComplete="tel"
                    className="border-cp-border bg-cp-bg-input"
                  />
                  <p className="text-[11px] text-cp-muted">Indonesian mobile, e.g. 0812… or +62…</p>
                </div>
              </div>
            ) : null}
          </section>

          {partnerCount > 0 ? (
            <section className="rounded-2xl border border-cp-border/60 bg-cp-card/40 p-5 sm:p-6">
              <div className="mb-2 flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-foreground">Teammates</h2>
                  <p className="mt-1 text-sm text-cp-muted">
                    Add {partnerCount} teammate{partnerCount === 1 ? "" : "s"}. Prefer email or phone
                    so they can claim their {partnerDisplayName} player profile later.
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-cp-elevated px-2.5 py-1 text-xs text-cp-muted">
                  {filledTeammates.length}/{partnerCount}
                </span>
              </div>

              <div className="mt-5 space-y-4">
                {slots.map((slot, index) => (
                  <TeammateSlotCard
                    key={index}
                    index={index}
                    slot={slot}
                    partnerSlug={partnerSlug}
                    excludePlayerIds={excludePlayerIds.filter(
                      (id) => id !== slot.linked?.playerId,
                    )}
                    onModeChange={(mode) => setSlotMode(index, mode)}
                    onLinkedChange={(linked) =>
                      updateSlot(index, {
                        mode: linked ? "search" : "search",
                        linked,
                        fullName: linked?.fullName ?? "",
                        email: linked?.email ?? "",
                        phone: linked?.phone ?? "",
                      })
                    }
                    onFieldChange={(patch) => updateSlot(index, patch)}
                  />
                ))}
              </div>
            </section>
          ) : null}

          <section className="rounded-2xl border border-cp-border/60 bg-cp-card/40 p-5 sm:p-6">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              className="mt-2 border-cp-border bg-cp-bg-input"
              maxLength={500}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Anything the organizer should know"
            />
          </section>
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl border border-cp-border/60 bg-cp-card/50 p-5 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-cp-muted">Entry</p>
            <p className="mt-2 font-heading text-3xl font-semibold text-cp-primary">
              {isPaid ? formatIdrDisplay(feeIdr ?? 0) : "Free"}
            </p>
            <p className="mt-1 text-xs text-cp-muted">
              {isPaid
                ? "Complete payment to reserve your spot. Organizer confirms after payment."
                : "No payment required — organizer will confirm your registration."}
            </p>

            <ul className="mt-4 space-y-2 border-t border-cp-border/50 pt-4 text-sm text-cp-muted">
              {formatLabel ? (
                <li className="flex justify-between gap-3">
                  <span>Format</span>
                  <span className="text-right text-foreground">{formatLabel}</span>
                </li>
              ) : null}
              <li className="flex justify-between gap-3">
                <span>Players / team</span>
                <span className="text-foreground">{playersPerTeam}</span>
              </li>
              <li className="flex justify-between gap-3">
                <span>Teammates filled</span>
                <span className="text-foreground">
                  {filledTeammates.length}
                  {isSingles ? " (singles)" : ""}
                </span>
              </li>
            </ul>

            <Button
              type="button"
              className="mt-5 w-full bg-cp-primary text-white hover:bg-cp-primary-light"
              size="lg"
              disabled={submitting}
              onClick={() => void handleSubmit()}
            >
              {submitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Submitting…
                </>
              ) : isPaid ? (
                "Continue to payment"
              ) : (
                "Confirm registration"
              )}
            </Button>
            <p className="mt-3 text-center text-xs text-cp-muted">
              Teammates with email or phone can claim their {partnerDisplayName} player profile
              later. Data stays on this partner site — never mixed with Gud Game.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

function TeammateSlotCard({
  index,
  slot,
  partnerSlug,
  excludePlayerIds,
  onModeChange,
  onLinkedChange,
  onFieldChange,
}: {
  index: number;
  slot: TeammateSlot;
  partnerSlug: string;
  excludePlayerIds: string[];
  onModeChange: (mode: TeammateMode) => void;
  onLinkedChange: (linked: PartnerPlayerSearchResult | null) => void;
  onFieldChange: (patch: Partial<TeammateSlot>) => void;
}) {
  return (
    <div className="rounded-xl border border-cp-border/50 bg-background/40 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-foreground">Teammate {index + 1}</p>
        <div className="flex flex-wrap gap-1.5">
          {(
            [
              { mode: "search" as const, label: "Search", icon: Search },
              { mode: "invite" as const, label: "Invite contact", icon: Mail },
              { mode: "soft" as const, label: "Name only", icon: UserPlus },
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
                    ? "bg-cp-primary text-white"
                    : "bg-cp-elevated text-cp-muted hover:text-foreground",
                )}
              >
                <Icon className="size-3" />
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {slot.mode === "search" ? (
        <PartnerPlayerSearchPicker
          partnerSlug={partnerSlug}
          selected={slot.linked}
          excludePlayerIds={excludePlayerIds}
          onChange={onLinkedChange}
        />
      ) : null}

      {slot.mode === "invite" ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Full name *</Label>
            <Input
              value={slot.fullName}
              onChange={(e) => onFieldChange({ fullName: e.target.value })}
              placeholder="Teammate full name"
              maxLength={120}
              className="border-cp-border bg-cp-bg-input"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input
              type="email"
              value={slot.email}
              onChange={(e) => onFieldChange({ email: e.target.value })}
              placeholder="partner@email.com"
              maxLength={255}
              className="border-cp-border bg-cp-bg-input"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Phone</Label>
            <Input
              value={slot.phone}
              onChange={(e) => onFieldChange({ phone: e.target.value })}
              placeholder="08…"
              maxLength={32}
              className="border-cp-border bg-cp-bg-input"
            />
          </div>
          <p className="text-xs text-cp-muted sm:col-span-2">
            Provide email or phone (or both) so they can claim their player profile on this site.
          </p>
        </div>
      ) : null}

      {slot.mode === "soft" ? (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Full name *</Label>
            <Input
              value={slot.fullName}
              onChange={(e) => onFieldChange({ fullName: e.target.value })}
              placeholder="Walk-up player name"
              maxLength={120}
              className="border-cp-border bg-cp-bg-input"
            />
          </div>
          <p className="text-xs text-amber-600/90 dark:text-amber-400/90">
            Name-only players get a placeholder profile and cannot be claimed by email or phone
            until contact details are added later.
          </p>
        </div>
      ) : null}
    </div>
  );
}
