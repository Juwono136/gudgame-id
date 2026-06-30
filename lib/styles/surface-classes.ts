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

/** Responsive multi-court manage grid — 2×2 on laptop, up to 4 cols on very wide screens. */
export const manageCourtGridClassName =
  "grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 2xl:grid-cols-3 min-[1700px]:grid-cols-4 [&>*]:h-full";
