import { cn } from "@/lib/utils";

/** Themed text input / select trigger */
export const cpControlClass = cn(
  "h-11 w-full rounded-lg border border-cp-border bg-cp-bg-input px-3 text-sm text-foreground shadow-none",
  "placeholder:text-cp-muted",
  "focus-visible:border-cp-primary focus-visible:ring-2 focus-visible:ring-cp-primary/35 focus-visible:ring-offset-0",
  "disabled:cursor-not-allowed disabled:opacity-50",
  "aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/30",
);

export const cpSelectTriggerClass = cn(
  cpControlClass,
  "flex items-center justify-between gap-2 text-left font-normal",
  "data-placeholder:text-cp-muted",
);

export const cpSelectContentClass = cn(
  "z-[300] max-h-[min(280px,50vh)] overflow-y-auto rounded-xl border border-cp-border bg-cp-card p-1 text-foreground shadow-lg",
);

export const cpSelectItemClass = cn(
  "cursor-pointer rounded-lg py-2.5 pr-8 pl-3 text-sm text-foreground",
  "focus:bg-cp-primary/15 focus:text-foreground",
  "data-highlighted:bg-cp-primary/15 data-highlighted:text-foreground",
);

export const cpPopoverSurfaceClass = "border-cp-border bg-cp-card text-foreground shadow-lg";

export const cpCardSurfaceClass = "rounded-2xl border border-cp-border bg-cp-card text-foreground";

/** Semantic callouts — light & dark readable */
export const cpAlertWarningSurfaceClass = cn(
  "rounded-xl border border-amber-200/90 bg-amber-50/95 text-amber-950",
  "dark:border-amber-500/30 dark:bg-amber-950/20 dark:text-amber-50",
);

export const cpAlertWarningPanelClass = cn(
  "rounded-2xl border border-amber-200/90 bg-gradient-to-br from-amber-50/95 to-cp-card p-5 sm:p-6",
  "dark:border-amber-500/25 dark:from-amber-950/20 dark:to-cp-card",
);

export const cpAlertWarningIconBoxClass = cn(
  "rounded-xl border border-amber-200/90 bg-amber-100/80",
  "dark:border-amber-500/30 dark:bg-amber-950/40",
);

export const cpAlertWarningIconClass = cn(
  "text-amber-600 dark:text-amber-300",
);

export const cpAlertWarningBodyTextClass = cn(
  "text-amber-900 dark:text-amber-100",
);

export const cpAlertWarningSubtextClass = cn(
  "text-amber-800/90 dark:text-amber-100/80",
);

export const cpAlertWarningMutedTextClass = cn(
  "text-amber-800/85 dark:text-amber-200/80",
);

export const cpAlertWarningStrongTextClass = cn(
  "font-semibold text-amber-950 dark:text-amber-50",
);

export const cpAlertWarningStepBadgeClass = cn(
  "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold",
  "border-amber-400/70 text-amber-800",
  "dark:border-amber-400/50 dark:text-amber-200",
);

export const cpAlertWarningOutlineButtonClass = cn(
  "border-amber-300/80 text-amber-950 hover:bg-amber-100/90",
  "dark:border-amber-500/30 dark:text-foreground dark:hover:bg-amber-950/40",
);

export const cpAlertInfoSurfaceClass = cn(
  "rounded-lg border border-sky-200/90 bg-sky-50/95 text-sky-950",
  "dark:border-sky-500/25 dark:bg-sky-950/20 dark:text-sky-100",
);

export const cpAlertSuccessSurfaceClass = cn(
  "rounded-xl border border-emerald-200/90 bg-emerald-50/85",
  "dark:border-emerald-500/25 dark:bg-emerald-950/20",
);

export const cpAlertSuccessStepClass = cn(
  "border-emerald-200/90 bg-emerald-50/90 text-emerald-900",
  "dark:border-emerald-500/30 dark:bg-emerald-950/20 dark:text-emerald-100",
);

export const cpAlertSuccessTextClass = cn(
  "text-emerald-800 dark:text-emerald-100",
);

export const cpAlertDangerSurfaceClass = cn(
  "rounded-2xl border border-red-200/90 bg-red-50/85 text-foreground",
  "dark:border-red-500/30 dark:bg-red-950/20",
);

export const cpAlertDangerTextClass = cn(
  "text-red-800 dark:text-red-200",
);

export const cpAlertDangerSubtextClass = cn(
  "text-red-700/90 dark:text-red-200/70",
);

export const cpAlertWarningInlineTextClass = cn(
  "text-amber-800 dark:text-amber-300/90",
);

export const cpAlertWarningCompactSurfaceClass = cn(
  "rounded-lg border border-amber-200/90 bg-amber-50/90 text-center text-xs text-amber-900",
  "dark:border-amber-500/30 dark:bg-amber-950/20 dark:text-amber-200",
);

export const cpBadgeWarningClass = cn(
  "border-amber-300/80 bg-amber-100/90 text-amber-900",
  "dark:border-amber-500/30 dark:bg-amber-950/30 dark:text-amber-200",
);

export const cpBadgeSuccessClass = cn(
  "border-emerald-300/80 bg-emerald-100/90 text-emerald-900",
  "dark:border-emerald-500/30 dark:bg-emerald-950/30 dark:text-emerald-200",
);

export const cpBadgeDangerClass = cn(
  "border-red-300/80 bg-red-100/90 text-red-800",
  "dark:border-red-500/30 dark:bg-red-950/30 dark:text-red-200",
);

export const cpBadgeLiveClass = cpBadgeDangerClass;

export const cpLossTextClass = cn(
  "text-red-600 dark:text-red-300/90",
);

export const cpFunAccentTextClass = cn(
  "text-emerald-700 dark:text-emerald-400",
);

export const cpFunHostPanelClass = cn(
  "rounded-2xl border border-emerald-200/80 bg-emerald-50/70 p-4 sm:p-5",
  "dark:border-emerald-500/20 dark:bg-emerald-950/10",
);

export const cpFunAccentSurfaceClass = cpAlertSuccessSurfaceClass;

export const cpEmeraldOutlineButtonClass = cn(
  "border-emerald-300/80 text-emerald-900 hover:bg-emerald-50",
  "dark:border-emerald-500/40 dark:text-emerald-200 dark:hover:bg-emerald-950/40",
);

export const cpEmeraldGhostButtonClass = cn(
  "border-emerald-300/80 bg-emerald-50/80 text-emerald-900 hover:bg-emerald-100",
  "dark:border-emerald-500/40 dark:bg-emerald-950/20 dark:text-emerald-200 dark:hover:bg-emerald-950/40",
);

export const cpStatusAmberClass = cn(
  "bg-amber-100 text-amber-800",
  "dark:bg-amber-500/15 dark:text-amber-400",
);

export const cpStatusEmeraldClass = cn(
  "bg-emerald-100 text-emerald-800",
  "dark:bg-emerald-500/15 dark:text-emerald-400",
);

export const cpOfficialAccentSurfaceClass = cn(
  "border-cp-primary/20 bg-cp-primary/5",
  "dark:border-cp-primary/25 dark:bg-cp-primary/5",
);

/** Responsive multi-court manage grid — 2×2 on laptop, up to 4 cols on very wide screens. */
export const manageCourtGridClassName =
  "grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 2xl:grid-cols-3 min-[1700px]:grid-cols-4 [&>*]:h-full";
