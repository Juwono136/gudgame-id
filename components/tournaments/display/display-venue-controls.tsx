"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Maximize2 } from "lucide-react";
import { DisplayVenueButton } from "@/components/tournaments/display/display-venue-button";
import { cn } from "@/lib/utils";

const IDLE_MS = 2_800;

type DisplayVenueControlsProps = {
  onRefresh: () => void;
  onFullscreen: () => void;
  onExit: () => void;
  refreshing?: boolean;
  className?: string;
};

/**
 * Venue TV chrome — fades out when idle so scoreboards stay readable;
 * reappears on pointer activity, keyboard, or hover near the corner.
 */
export function DisplayVenueControls({
  onRefresh,
  onFullscreen,
  onExit,
  refreshing,
  className,
}: DisplayVenueControlsProps) {
  const [visible, setVisible] = useState(true);
  const pinnedRef = useRef(false);
  const timerRef = useRef<number | null>(null);

  const scheduleHide = useCallback(() => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      if (!pinnedRef.current) setVisible(false);
    }, IDLE_MS);
  }, []);

  const bump = useCallback(() => {
    setVisible(true);
    scheduleHide();
  }, [scheduleHide]);

  useEffect(() => {
    bump();
    const onActivity = () => bump();
    window.addEventListener("mousemove", onActivity, { passive: true });
    window.addEventListener("mousedown", onActivity);
    window.addEventListener("touchstart", onActivity, { passive: true });
    window.addEventListener("keydown", onActivity);
    return () => {
      window.removeEventListener("mousemove", onActivity);
      window.removeEventListener("mousedown", onActivity);
      window.removeEventListener("touchstart", onActivity);
      window.removeEventListener("keydown", onActivity);
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [bump]);

  const pin = () => {
    pinnedRef.current = true;
    setVisible(true);
    if (timerRef.current) window.clearTimeout(timerRef.current);
  };

  const unpin = () => {
    pinnedRef.current = false;
    scheduleHide();
  };

  return (
    <div className={cn("absolute bottom-0 right-0 z-30", className)}>
      {/* Corner hot-zone: reveals controls without covering card text when idle */}
      <div
        className="pointer-events-auto absolute bottom-0 right-0 h-14 w-40"
        aria-hidden
        onMouseEnter={pin}
        onMouseLeave={unpin}
      />

      <div
        className={cn(
          "absolute bottom-3 right-3 flex gap-2 transition-all duration-300 ease-out sm:bottom-4 sm:right-4",
          visible
            ? "pointer-events-auto translate-y-0 opacity-100"
            : "pointer-events-none translate-y-1 opacity-0",
        )}
        onMouseEnter={pin}
        onMouseLeave={unpin}
        onFocusCapture={pin}
        onBlurCapture={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
            unpin();
          }
        }}
      >
        <DisplayVenueButton type="button" size="sm" onClick={onRefresh}>
          {refreshing ? "…" : "Refresh"}
        </DisplayVenueButton>
        <DisplayVenueButton type="button" size="sm" onClick={onFullscreen}>
          <Maximize2 className="mr-1.5 h-4 w-4" />
          Fullscreen
        </DisplayVenueButton>
        <DisplayVenueButton type="button" size="sm" onClick={onExit}>
          Exit
        </DisplayVenueButton>
      </div>
    </div>
  );
}
