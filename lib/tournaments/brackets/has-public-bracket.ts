/** True when a bracket tree exists and should render on public/manage pages. */
export function hasPublicBracketTree(
  bracket:
    | {
        generated?: boolean;
        matches?: unknown[];
      }
    | null
    | undefined,
): boolean {
  if (!bracket) return false;
  if (bracket.generated) return true;
  return (bracket.matches?.length ?? 0) > 0;
}
