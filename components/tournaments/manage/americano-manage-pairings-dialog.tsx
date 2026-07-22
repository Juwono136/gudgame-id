"use client";

import { useEffect, useMemo, useState } from "react";
import { Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  encodeAmericanoPair,
  type AmericanoPlayerRef,
} from "@/lib/tournaments/americano/court-assignments";
import {
  cpSelectContentClass,
  cpSelectItemClass,
  cpSelectTriggerClass,
} from "@/lib/styles/surface-classes";
import { cn } from "@/lib/utils";

type AmericanoManagePairingsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courtName: string;
  players: AmericanoPlayerRef[];
  busyPlayerIds: Set<string>;
  /** Current pair keys (americano-pair:…) if any. */
  sideAKey?: string;
  sideBKey?: string;
  onSave: (sideAKey: string, sideBKey: string) => void;
};

const NONE = "__none__";

function PlayerSelect({
  label,
  value,
  onChange,
  options,
  disabledIds,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: AmericanoPlayerRef[];
  disabledIds: Set<string>;
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-cp-muted">{label}</p>
      <Select value={value || NONE} onValueChange={(v) => onChange(v === NONE ? "" : v)}>
        <SelectTrigger className={cn(cpSelectTriggerClass, "h-9")}>
          <SelectValue placeholder="Select player" />
        </SelectTrigger>
        <SelectContent className={cpSelectContentClass}>
          <SelectItem value={NONE} className={cpSelectItemClass}>
            Select player…
          </SelectItem>
          {options.map((p) => {
            const taken = disabledIds.has(p.id) && p.id !== value;
            return (
              <SelectItem
                key={p.id}
                value={p.id}
                disabled={taken}
                className={cpSelectItemClass}
              >
                {p.name}
                {taken ? " (selected)" : ""}
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    </div>
  );
}

export function AmericanoManagePairingsDialog({
  open,
  onOpenChange,
  courtName,
  players,
  busyPlayerIds,
  sideAKey,
  sideBKey,
  onSave,
}: AmericanoManagePairingsDialogProps) {
  const initial = useMemo(() => {
    const decode = (key?: string): [string, string] => {
      if (!key?.startsWith("americano-pair:")) return ["", ""];
      const parts = key.slice("americano-pair:".length).split(":");
      return [parts[0] ?? "", parts[1] ?? ""];
    };
    const a = decode(sideAKey);
    const b = decode(sideBKey);
    return { a1: a[0], a2: a[1], b1: b[0], b2: b[1] };
  }, [sideAKey, sideBKey]);

  const [a1, setA1] = useState(initial.a1);
  const [a2, setA2] = useState(initial.a2);
  const [b1, setB1] = useState(initial.b1);
  const [b2, setB2] = useState(initial.b2);

  useEffect(() => {
    if (!open) return;
    setA1(initial.a1);
    setA2(initial.a2);
    setB1(initial.b1);
    setB2(initial.b2);
  }, [open, initial.a1, initial.a2, initial.b1, initial.b2]);

  const available = useMemo(
    () => players.filter((p) => !busyPlayerIds.has(p.id) || [a1, a2, b1, b2].includes(p.id)),
    [a1, a2, b1, b2, busyPlayerIds, players],
  );

  const selected = [a1, a2, b1, b2].filter(Boolean);
  const uniqueOk = new Set(selected).size === selected.length;
  const canSave = Boolean(a1 && a2 && b1 && b2 && uniqueOk && a1 !== a2 && b1 !== b2);

  const usedElsewhere = (except: string) => {
    const ids = new Set([a1, a2, b1, b2].filter((id) => id && id !== except));
    return ids;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg border-cp-border bg-cp-card sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-4 w-4 text-cp-primary" />
            Manage pairings · {courtName}
          </DialogTitle>
          <DialogDescription>
            Pick two players per side for this court. Registered squad mates stay together by
            default — use this when the auto plan looks wrong before you start.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-3 rounded-xl border border-cp-border/80 bg-cp-elevated/20 p-3">
            <p className="text-xs font-semibold text-foreground">Side A</p>
            <PlayerSelect
              label="Player 1"
              value={a1}
              onChange={setA1}
              options={available}
              disabledIds={usedElsewhere(a1)}
            />
            <PlayerSelect
              label="Player 2"
              value={a2}
              onChange={setA2}
              options={available}
              disabledIds={usedElsewhere(a2)}
            />
          </div>
          <div className="space-y-3 rounded-xl border border-cp-border/80 bg-cp-elevated/20 p-3">
            <p className="text-xs font-semibold text-foreground">Side B</p>
            <PlayerSelect
              label="Player 1"
              value={b1}
              onChange={setB1}
              options={available}
              disabledIds={usedElsewhere(b1)}
            />
            <PlayerSelect
              label="Player 2"
              value={b2}
              onChange={setB2}
              options={available}
              disabledIds={usedElsewhere(b2)}
            />
          </div>
        </div>

        {!uniqueOk && selected.length > 0 ? (
          <p className="text-xs text-amber-700 dark:text-amber-300">
            Each player can only appear once on this court.
          </p>
        ) : null}

        <DialogFooter className="gap-2 sm:gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            className="bg-cp-primary hover:bg-cp-primary-light"
            disabled={!canSave}
            onClick={() => {
              onSave(encodeAmericanoPair([a1, a2]), encodeAmericanoPair([b1, b2]));
              onOpenChange(false);
            }}
          >
            Save pairings
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
