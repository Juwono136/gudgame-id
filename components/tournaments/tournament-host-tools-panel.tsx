"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ChevronDown,
  ChevronUp,
  KeyRound,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { publicSportRoutes } from "@/lib/constants/routes";
import { TournamentAccessInvitesPanel } from "@/components/tournaments/tournament-access-invites-panel";
import { TournamentPlayerInvitesPanel } from "@/components/tournaments/tournament-player-invites-panel";

type TournamentHostToolsPanelProps = {
  sportSlug: string;
  slug: string;
  variant: "official" | "fun_match";
  /** When true, panel starts expanded. Defaults to false so lobby stays visible. */
  defaultOpen?: boolean;
  className?: string;
};

export function TournamentHostToolsPanel({
  sportSlug,
  slug,
  variant,
  defaultOpen = false,
  className,
}: TournamentHostToolsPanelProps) {
  const [open, setOpen] = useState(defaultOpen);
  const invitePageUrl = publicSportRoutes.tournamentInvite(sportSlug, slug);
  const showPlayerInvites = variant === "fun_match";
  const subtitle =
    variant === "official"
      ? "Invite scorekeepers or bracket managers. Tap to show or hide."
      : "Invite scoring staff or share player links. Tap to show or hide.";

  return (
    <section
      className={cn(
        "overflow-hidden rounded-2xl border border-cp-border bg-cp-card/80",
        className,
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-start gap-3 p-4 text-left transition-colors hover:bg-cp-elevated/30 sm:p-5"
        aria-expanded={open}
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cp-primary/12 text-cp-primary">
          <Shield className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground sm:text-base">Host tools</span>
            <span className="rounded-full bg-cp-elevated px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-cp-muted">
              Invites
            </span>
          </span>
          <span className="mt-1 block text-xs leading-relaxed text-cp-muted sm:text-sm">
            {subtitle}
          </span>
        </span>
        <span className="mt-1 shrink-0 text-cp-muted">
          {open ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
        </span>
      </button>

      {open ? (
        <div className="space-y-4 border-t border-cp-border px-4 pb-4 pt-3 sm:px-5 sm:pb-5">
          <div className="rounded-xl border border-cp-border/70 bg-cp-elevated/20 px-3 py-3 sm:px-4">
            <p className="flex items-start gap-2 text-xs leading-relaxed text-cp-muted sm:text-sm">
              <KeyRound className="mt-0.5 h-4 w-4 shrink-0 text-cp-primary" />
              <span>
                Recipients open the invite link or enter the code on the{" "}
                <Link href={invitePageUrl} className="font-medium text-cp-primary hover:underline">
                  invite page
                </Link>{" "}
                while signed in.
              </span>
            </p>
          </div>

          <TournamentAccessInvitesPanel sportSlug={sportSlug} slug={slug} embedded />

          {showPlayerInvites ? (
            <TournamentPlayerInvitesPanel sportSlug={sportSlug} slug={slug} embedded />
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
