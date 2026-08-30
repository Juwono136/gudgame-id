"use client";

import { useEffect, useState, type RefObject } from "react";

export type DisplayFitSize = { width: number; height: number };

/**
 * Measure a venue-TV container and derive how many carousel items fit.
 * Recomputes on ResizeObserver (different court monitors / window sizes).
 */
export function useDisplayFitCapacity(
  containerRef: RefObject<HTMLElement | null>,
  compute: (size: DisplayFitSize) => number,
  fallback: number,
): number {
  const [capacity, setCapacity] = useState(fallback);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;

    const measure = () => {
      const width = el.clientWidth;
      const height = el.clientHeight;
      if (width <= 0 && height <= 0) return;
      const next = compute({ width, height });
      setCapacity((prev) => (prev === next ? prev : next));
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [containerRef, compute, fallback]);

  return capacity;
}

/**
 * Viewport-level fit when the slide shell itself is the measuring root
 * (e.g. multi-court pagination in the display client).
 */
export function useViewportFitCapacity(
  compute: (size: DisplayFitSize) => number,
  fallback: number,
): number {
  const [capacity, setCapacity] = useState(fallback);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const measure = () => {
      const next = compute({
        width: window.innerWidth,
        height: window.innerHeight,
      });
      setCapacity((prev) => (prev === next ? prev : next));
    };

    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [compute, fallback]);

  return capacity;
}
