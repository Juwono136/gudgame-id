"use client";

import { GitBranch } from "lucide-react";
import { BracketTreeView } from "@/components/tournaments/bracket-tree-view";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { BracketMatchView } from "@/lib/tournaments/brackets/service";

type BracketSnapshotDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  matches: BracketMatchView[];
  highlightTeamIds?: string[];
  title?: string;
  description?: string;
};

export function BracketSnapshotDialog({
  open,
  onOpenChange,
  matches,
  highlightTeamIds = [],
  title = "Bracket snapshot",
  description = "Drag horizontally to explore the full elimination tree.",
}: BracketSnapshotDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-hidden border-cp-border bg-cp-card p-0 sm:max-w-5xl">
        <DialogHeader className="space-y-1 border-b border-cp-border px-5 py-4 sm:px-6">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <GitBranch className="h-5 w-5 text-emerald-400" />
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="max-h-[calc(90vh-5.5rem)] overflow-y-auto px-4 py-4 sm:px-6">
          {matches.length > 0 ? (
            <BracketTreeView
              matches={matches}
              showEmptySlots
              highlightTeamIds={highlightTeamIds}
              emptyMessage="Bracket data is not available for this snapshot."
            />
          ) : (
            <p className="py-12 text-center text-sm text-cp-muted">No bracket matches to display.</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
