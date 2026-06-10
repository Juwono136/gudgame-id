"use client";

import { BracketTreeView } from "@/components/tournaments/bracket-tree-view";
import type { BracketMatchView } from "@/lib/tournaments/brackets/service";

type OfficialBracketViewProps = {
  matches: BracketMatchView[];
};

export function OfficialBracketView({ matches }: OfficialBracketViewProps) {
  return (
    <BracketTreeView
      matches={matches}
      emptyMessage="Bracket not generated yet. The host will publish it after registration closes."
    />
  );
}
