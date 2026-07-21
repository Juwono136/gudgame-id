"use client";

/** Hide structural empty slots that will never be played. */
export function shouldRenderBracketMatch(m: {
  status: string;
  teamAId: string | null;
  teamBId: string | null;
}): boolean {
  if (m.status !== "pending") return true;
  return Boolean(m.teamAId || m.teamBId);
}

/** Snap to half-pixels for crisp SVG strokes on retina displays. */
function snap(v: number): number {
  return Math.round(v * 2) / 2;
}

/**
 * Tournament-style bracket elbows as separate non-overlapping paths:
 * feeder horizontals, vertical merge bar, output stem — each its own path.
 */
export function buildMeasuredBracketPaths(
  feeders: Array<{ x: number; y: number }>,
  target: { x: number; y: number },
): string[] {
  if (!feeders.length) return [];

  const sorted = [...feeders].sort((a, b) => a.y - b.y);
  const joinX = snap((sorted[0]!.x + target.x) / 2);
  const targetX = snap(target.x);
  const targetY = snap(target.y);

  if (sorted.length === 1) {
    const f = sorted[0]!;
    const fx = snap(f.x);
    const fy = snap(f.y);
    if (Math.abs(fy - targetY) < 1.5) {
      return [`M ${fx} ${fy} H ${targetX}`];
    }
    return [`M ${fx} ${fy} H ${joinX} V ${targetY} H ${targetX}`];
  }

  const top = sorted[0]!;
  const bottom = sorted[sorted.length - 1]!;
  const topX = snap(top.x);
  const topY = snap(top.y);
  const botX = snap(bottom.x);
  const botY = snap(bottom.y);
  const mergeTop = Math.min(topY, botY, targetY);
  const mergeBot = Math.max(topY, botY, targetY);

  const paths: string[] = [
    `M ${topX} ${topY} H ${joinX}`,
    `M ${botX} ${botY} H ${joinX}`,
    `M ${joinX} ${mergeTop} V ${mergeBot}`,
    // Stem at target match center — vertical bar already reaches targetY
    `M ${joinX} ${targetY} H ${targetX}`,
  ];

  return paths;
}

type BracketConnectorOverlayProps = {
  paths: string[];
  width: number;
  height: number;
};

export function BracketConnectorOverlay({ paths, width, height }: BracketConnectorOverlayProps) {
  if (!paths.length || width <= 0 || height <= 0) return null;

  return (
    <svg
      className="pointer-events-none absolute inset-0 z-0 overflow-visible text-cp-primary"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      fill="none"
      shapeRendering="geometricPrecision"
      aria-hidden
    >
      {paths.map((d, i) => (
        <path
          key={i}
          d={d}
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="opacity-55"
        />
      ))}
    </svg>
  );
}
