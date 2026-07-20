"use client";

import { ArrowLeft, Radio } from "lucide-react";
import { DisplayVenueButton } from "@/components/tournaments/display/display-venue-button";
import { cn } from "@/lib/utils";

type DisplayIdleScoreboardProps = {
  tournamentName: string;
  message: string;
  onRefresh: () => void;
  onBack: () => void;
  refreshing?: boolean;
  className?: string;
};

/**
 * Full-viewport idle / empty scoreboard for venue displays.
 * Scales typography and spacing across phone → projector widths.
 */
export function DisplayIdleScoreboard({
  tournamentName,
  message,
  onRefresh,
  onBack,
  refreshing = false,
  className,
}: DisplayIdleScoreboardProps) {
  return (
    <div
      className={cn(
        "flex min-h-dvh w-full flex-col items-center justify-center",
        "px-4 py-10 sm:px-8 sm:py-12 md:px-12 lg:px-16 xl:px-24",
        className,
      )}
    >
      <div className="flex w-full max-w-[min(92vw,56rem)] flex-col items-center text-center">
        <div
          className={cn(
            "flex items-center justify-center rounded-full border border-white/15 bg-white/5",
            "h-16 w-16 sm:h-20 sm:w-20 md:h-24 md:w-24 lg:h-28 lg:w-28",
          )}
          aria-hidden
        >
          <Radio className="h-7 w-7 text-white/55 sm:h-9 sm:w-9 md:h-11 md:w-11 lg:h-12 lg:w-12" />
        </div>

        <p
          className={cn(
            "mt-5 font-semibold tracking-tight text-white sm:mt-6 md:mt-8",
            "text-xl sm:text-2xl md:text-4xl lg:text-5xl xl:text-6xl",
            "leading-tight text-balance",
          )}
        >
          {tournamentName}
        </p>

        <p
          className={cn(
            "mt-3 max-w-[40rem] text-pretty text-white/65 sm:mt-4 md:mt-5",
            "text-sm leading-relaxed sm:text-base md:text-lg lg:text-xl",
          )}
        >
          {message}
        </p>

        <div
          className={cn(
            "mt-8 flex w-full flex-col items-stretch justify-center gap-3 sm:mt-10",
            "sm:w-auto sm:flex-row sm:items-center sm:gap-4",
          )}
        >
          <DisplayVenueButton
            type="button"
            size="lg"
            className="h-12 min-w-[10rem] px-6 text-base sm:h-12 md:h-14 md:min-w-[12rem] md:text-lg"
            onClick={onRefresh}
          >
            {refreshing ? "Refreshing…" : "Refresh"}
          </DisplayVenueButton>
          <DisplayVenueButton
            type="button"
            size="lg"
            variant="outline"
            className="h-12 min-w-[10rem] px-6 text-base sm:h-12 md:h-14 md:min-w-[12rem] md:text-lg"
            onClick={onBack}
          >
            <ArrowLeft className="mr-2 h-4 w-4 md:h-5 md:w-5" />
            Back
          </DisplayVenueButton>
        </div>
      </div>
    </div>
  );
}
