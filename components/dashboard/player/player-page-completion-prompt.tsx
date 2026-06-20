import Link from "next/link";
import { AlertCircle, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { dashboardRoutes } from "@/lib/constants/routes";
import {
  getPlayerPageMissingFieldLabels,
  type PlayerPageCompletionStatus,
} from "@/lib/account/player-dashboard/player-page-completion";
import { cn } from "@/lib/utils";

type PlayerPageCompletionPromptProps = {
  completion: PlayerPageCompletionStatus;
  className?: string;
};

export function PlayerPageCompletionPrompt({
  completion,
  className,
}: PlayerPageCompletionPromptProps) {
  if (completion.isComplete) return null;

  const labels = getPlayerPageMissingFieldLabels(completion.missingFields);
  const needsCreate = completion.missingFields.includes("playerProfile");

  return (
    <div
      className={cn(
        "rounded-2xl border p-4 sm:p-5",
        needsCreate
          ? "border-amber-500/30 bg-amber-500/10"
          : "border-cp-primary/25 bg-cp-primary/8",
        className,
      )}
      role="status"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex gap-3">
          <div
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
              needsCreate ? "bg-amber-500/15 text-amber-400" : "bg-cp-primary/15 text-cp-primary",
            )}
          >
            {needsCreate ? <Sparkles className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">
              {needsCreate
                ? "Set up your public player page"
                : `Complete your player profile (${completion.completionPercent}%)`}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-cp-muted sm:text-sm">
              {needsCreate
                ? "Create your player page so you appear in the public directory. Add your bio, gear, and gallery in My Settings."
                : "A few details are still missing on your public player page. Update them in My Settings to look your best to scouts and opponents."}
            </p>
            {labels.length > 0 ? (
              <ul className="mt-3 grid gap-1 sm:grid-cols-1">
                {labels.map((label) => (
                  <li
                    key={label}
                    className="flex items-center gap-2 text-xs text-cp-muted"
                  >
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-cp-primary" />
                    {label}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>

        <div className="flex shrink-0 flex-col gap-2 sm:flex-row lg:flex-col">
          <Button
            asChild
            size="sm"
            className="rounded-lg bg-cp-primary font-semibold hover:bg-cp-primary-light"
          >
            <Link href={`${dashboardRoutes.settings}#player-profile`}>
              {needsCreate ? "Create player page" : "Update in My Settings"}
              <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Link>
          </Button>
          {!needsCreate ? (
            <Button asChild size="sm" variant="outline" className="border-cp-border">
              <Link href={`${dashboardRoutes.settings}#profile`}>Account profile</Link>
            </Button>
          ) : null}
        </div>
      </div>

      {!needsCreate && completion.completionPercent < 100 ? (
        <div className="mt-4">
          <div className="mb-1 flex justify-between text-[10px] font-medium uppercase tracking-wide text-cp-muted">
            <span>Player page progress</span>
            <span>{completion.completionPercent}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-cp-elevated">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cp-primary to-cp-logo-accent transition-all duration-500"
              style={{ width: `${completion.completionPercent}%` }}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
