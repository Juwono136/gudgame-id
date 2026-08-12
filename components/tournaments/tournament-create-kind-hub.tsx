"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Gamepad2, ShieldPlus, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { dashboardRoutes } from "@/lib/constants/routes";
import { cn } from "@/lib/utils";

export type TournamentCreateKind = "official" | "fun_match";

type TournamentCreateKindHubProps = {
  onSelect: (kind: TournamentCreateKind) => void;
  onBack?: () => void;
  backLabel?: string;
  /** Player workspace — official is locked until Host role is granted */
  variant?: "host" | "player";
};

const HOST_ROLES_HREF = `${dashboardRoutes.settings}#roles`;

const OPTIONS: {
  kind: TournamentCreateKind;
  label: string;
  description: string;
  icon: typeof Trophy;
  accent: string;
}[] = [
  {
    kind: "official",
    label: "Official tournament",
    description:
      "Ranked events with full statistics. Choose paid or free registration in the next step.",
    icon: Trophy,
    accent: "border-cp-primary/40 bg-cp-primary/10 hover:border-cp-primary/60",
  },
  {
    kind: "fun_match",
    label: "Fun Match",
    description: "Free community play — lobby, squads, and casual rounds. Lighter stats.",
    icon: Gamepad2,
    accent: "border-emerald-500/30 bg-emerald-500/10 hover:border-emerald-500/50",
  },
];

export function TournamentCreateKindHub({
  onSelect,
  onBack,
  backLabel = "Back to tournaments",
  variant = "host",
}: TournamentCreateKindHubProps) {
  const officialLocked = variant === "player";

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto max-w-2xl space-y-6"
    >
      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center text-sm text-cp-muted transition-colors hover:text-foreground"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          {backLabel}
        </button>
      ) : null}

      <div className="text-center sm:text-left">
        <h2 className="text-2xl font-bold text-foreground">Create tournament</h2>
        <p className="mt-2 text-sm text-cp-muted">
          Start with the event type. Official tournaments support paid or free entry; Fun Match
          sessions are always free.
        </p>
      </div>

      {officialLocked ? (
        <div
          role="note"
          className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 sm:p-5 dark:border-amber-400/25 dark:bg-amber-500/10"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-700 dark:text-amber-300">
                <ShieldPlus className="h-5 w-5" aria-hidden />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">
                  Host role required for Official tournaments
                </p>
                <p className="mt-1 text-sm leading-relaxed text-cp-muted">
                  Request Host access in Settings → Roles. Super admins review every request. Fun
                  Match stays available without a Host role.
                </p>
              </div>
            </div>
            <Button
              asChild
              className="w-full shrink-0 bg-cp-primary hover:bg-cp-primary-light sm:w-auto"
            >
              <Link href={HOST_ROLES_HREF}>
                Request Host role
                <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden />
              </Link>
            </Button>
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {OPTIONS.map(({ kind, label, description, icon: Icon, accent }) => {
          const locked = officialLocked && kind === "official";

          if (locked) {
            return (
              <div
                key={kind}
                className={cn(
                  "flex flex-col rounded-2xl border p-6 text-left",
                  "border-cp-border/80 bg-cp-elevated/40 dark:bg-cp-elevated/20",
                )}
              >
                <Icon className="mb-4 h-10 w-10 text-cp-muted" aria-hidden />
                <p className="text-lg font-semibold text-foreground">{label}</p>
                <p className="mt-2 text-sm leading-relaxed text-cp-muted">{description}</p>

                <div className="mt-4 space-y-3 rounded-xl border border-amber-500/25 bg-amber-500/10 p-3 dark:border-amber-400/20">
                  <p className="text-sm font-medium text-foreground">
                    Requires an approved Host role
                  </p>
                  <p className="text-xs leading-relaxed text-cp-muted">
                    Open Settings → Roles to submit a request. You will be notified when a super
                    admin responds.
                  </p>
                  <Button asChild size="sm" className="w-full bg-cp-primary hover:bg-cp-primary-light">
                    <Link href={HOST_ROLES_HREF}>
                      Go to Roles settings
                      <ArrowRight className="ml-1.5 h-3.5 w-3.5" aria-hidden />
                    </Link>
                  </Button>
                </div>
              </div>
            );
          }

          return (
            <motion.button
              key={kind}
              type="button"
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => onSelect(kind)}
              className={cn("rounded-2xl border p-6 text-left transition-colors", accent)}
            >
              <Icon className="mb-4 h-10 w-10 text-foreground" aria-hidden />
              <p className="text-lg font-semibold text-foreground">{label}</p>
              <p className="mt-2 text-sm leading-relaxed text-cp-muted">{description}</p>
            </motion.button>
          );
        })}
      </div>
    </motion.section>
  );
}
