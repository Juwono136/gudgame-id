"use client";

import { useEffect, useState } from "react";
import {
  computeReclubSessionPhase,
  type ReclubSessionPhase,
  type ReclubSessionSchedule,
} from "@/lib/tournaments/reclub/session-lifecycle";

const TICK_MS = 30_000;

/** Recompute reclub phase on an interval so UI reacts when start/end times pass. */
export function useReclubSessionPhase(
  session: ReclubSessionSchedule,
): ReclubSessionPhase {
  const [phase, setPhase] = useState(() => computeReclubSessionPhase(session));

  useEffect(() => {
    const tick = () => setPhase(computeReclubSessionPhase(session));
    tick();
    const id = window.setInterval(tick, TICK_MS);
    return () => window.clearInterval(id);
  }, [session.status, session.startsAt, session.endsAt]);

  return phase;
}
