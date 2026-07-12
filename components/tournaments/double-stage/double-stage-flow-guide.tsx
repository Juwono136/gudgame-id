"use client";

import { CheckCircle2, Circle, LayoutGrid, Radio, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

type DoubleStageFlowGuideProps = {
  phase: "group" | "knockout";
  variant?: "manage" | "public";
  className?: string;
};

const STEPS = [
  {
    id: "groups",
    icon: LayoutGrid,
    manageTitle: "Groups — standings & fixtures",
    manageDetail:
      "See group tables, match schedule, and who qualifies. No scoring here — use Live scoring.",
    publicTitle: "Groups — standings",
    publicDetail: "Live group tables and results. Updates automatically as matches are scored.",
  },
  {
    id: "scoring",
    icon: Radio,
    manageTitle: "Live scoring — run group matches",
    manageDetail:
      "Start each group match and enter final scores. Standings update instantly on the Groups tab.",
    publicTitle: "Live score — active matches",
    publicDetail: "Follow in-progress group and knockout matches in real time.",
  },
  {
    id: "knockout",
    icon: Trophy,
    manageTitle: "Knockout — bracket & elimination",
    manageDetail:
      "When all group matches finish, generate the bracket. Score elimination rounds in Live scoring.",
    publicTitle: "Bracket — knockout stage",
    publicDetail: "Single elimination from qualified teams after the group stage.",
  },
] as const;

export function DoubleStageFlowGuide({
  phase,
  variant = "manage",
  className,
}: DoubleStageFlowGuideProps) {
  const activeIndex = phase === "knockout" ? 2 : 1;

  return (
    <div
      className={cn(
        "rounded-xl border border-cp-border bg-cp-card/60 p-4 sm:p-5",
        className,
      )}
    >
      <p className="text-sm font-semibold text-foreground">
        {variant === "manage" ? "How double stage works" : "Tournament format"}
      </p>
      <p className="mt-1 text-xs leading-relaxed text-cp-muted sm:text-sm">
        {variant === "manage"
          ? "Group round-robin first, then single elimination for qualifiers."
          : "Teams play round-robin in groups, then top teams advance to knockout."}
      </p>
      <ol className="mt-4 space-y-3">
        {STEPS.map((step, index) => {
          const Icon = step.icon;
          const done = index < activeIndex;
          const current = index === activeIndex;
          const title = variant === "manage" ? step.manageTitle : step.publicTitle;
          const detail = variant === "manage" ? step.manageDetail : step.publicDetail;

          return (
            <li
              key={step.id}
              className={cn(
                "flex gap-3 rounded-lg border px-3 py-2.5 sm:px-4",
                current
                  ? "border-cp-primary/40 bg-cp-primary/5"
                  : done
                    ? "border-emerald-600/20 bg-emerald-500/5"
                    : "border-cp-border/80 bg-cp-elevated/20",
              )}
            >
              <div className="mt-0.5 shrink-0">
                {done ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <Circle
                    className={cn(
                      "h-5 w-5",
                      current ? "text-cp-primary" : "text-cp-muted",
                    )}
                  />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <Icon className="h-4 w-4 shrink-0 text-cp-primary" />
                  {title}
                </p>
                <p className="mt-0.5 text-xs leading-relaxed text-cp-muted sm:text-sm">
                  {detail}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
