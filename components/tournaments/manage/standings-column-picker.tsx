"use client";

import { useCallback, useEffect, useState } from "react";
import { MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type OfficialStandingsColumnId =
  | "team"
  | "wlt"
  | "wr"
  | "diff"
  | "p"
  | "ptsPlus"
  | "log"
  | "g";

export type FunStandingsColumnId = "squad" | "wlt" | "wr" | "diff" | "plusM" | "p" | "g";

const OFFICIAL_COLUMN_OPTIONS: { id: OfficialStandingsColumnId; label: string; locked?: boolean }[] =
  [
    { id: "team", label: "Team" },
    { id: "wlt", label: "W-L-T", locked: true },
    { id: "wr", label: "WR" },
    { id: "diff", label: "Diff" },
    { id: "p", label: "P", locked: true },
    { id: "ptsPlus", label: "Pts+" },
    { id: "log", label: "Log" },
    { id: "g", label: "G" },
  ];

const FUN_COLUMN_OPTIONS: { id: FunStandingsColumnId; label: string; locked?: boolean }[] = [
  { id: "squad", label: "Squad" },
  { id: "wlt", label: "W-L-T", locked: true },
  { id: "wr", label: "WR" },
  { id: "diff", label: "Diff" },
  { id: "plusM", label: "+M" },
  { id: "p", label: "P", locked: true },
  { id: "g", label: "G" },
];

export const DEFAULT_OFFICIAL_STANDINGS_COLUMNS: OfficialStandingsColumnId[] = [
  "team",
  "wlt",
  "wr",
  "diff",
  "p",
  "ptsPlus",
  "log",
  "g",
];

export const DEFAULT_FUN_STANDINGS_COLUMNS: FunStandingsColumnId[] = [
  "squad",
  "wlt",
  "wr",
  "diff",
  "plusM",
  "p",
  "g",
];

function loadColumns<T extends string>(key: string, fallback: T[]): T[] {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return fallback;
    const next = parsed.filter((x): x is T => typeof x === "string");
    return next.length ? next : fallback;
  } catch {
    return fallback;
  }
}

function saveColumns(key: string, cols: string[]) {
  try {
    window.localStorage.setItem(key, JSON.stringify(cols));
  } catch {
    /* ignore */
  }
}

export function useOfficialStandingsColumns(storageKey: string) {
  const [columns, setColumns] = useState<OfficialStandingsColumnId[]>(
    DEFAULT_OFFICIAL_STANDINGS_COLUMNS,
  );

  useEffect(() => {
    setColumns(loadColumns(storageKey, DEFAULT_OFFICIAL_STANDINGS_COLUMNS));
  }, [storageKey]);

  const toggle = useCallback(
    (id: OfficialStandingsColumnId) => {
      const meta = OFFICIAL_COLUMN_OPTIONS.find((c) => c.id === id);
      if (meta?.locked) return;
      setColumns((prev) => {
        const next = prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id];
        // Keep locked columns
        for (const opt of OFFICIAL_COLUMN_OPTIONS) {
          if (opt.locked && !next.includes(opt.id)) next.push(opt.id);
        }
        saveColumns(storageKey, next);
        return next;
      });
    },
    [storageKey],
  );

  const reset = useCallback(() => {
    setColumns(DEFAULT_OFFICIAL_STANDINGS_COLUMNS);
    saveColumns(storageKey, DEFAULT_OFFICIAL_STANDINGS_COLUMNS);
  }, [storageKey]);

  return { columns, toggle, reset, options: OFFICIAL_COLUMN_OPTIONS };
}

export function useFunStandingsColumns(storageKey: string) {
  const [columns, setColumns] = useState<FunStandingsColumnId[]>(DEFAULT_FUN_STANDINGS_COLUMNS);

  useEffect(() => {
    setColumns(loadColumns(storageKey, DEFAULT_FUN_STANDINGS_COLUMNS));
  }, [storageKey]);

  const toggle = useCallback(
    (id: FunStandingsColumnId) => {
      const meta = FUN_COLUMN_OPTIONS.find((c) => c.id === id);
      if (meta?.locked) return;
      setColumns((prev) => {
        const next = prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id];
        for (const opt of FUN_COLUMN_OPTIONS) {
          if (opt.locked && !next.includes(opt.id)) next.push(opt.id);
        }
        saveColumns(storageKey, next);
        return next;
      });
    },
    [storageKey],
  );

  const reset = useCallback(() => {
    setColumns(DEFAULT_FUN_STANDINGS_COLUMNS);
    saveColumns(storageKey, DEFAULT_FUN_STANDINGS_COLUMNS);
  }, [storageKey]);

  return { columns, toggle, reset, options: FUN_COLUMN_OPTIONS };
}

export function StandingsColumnPickerMenu({
  options,
  columns,
  onToggle,
  onReset,
}: {
  options: { id: string; label: string; locked?: boolean }[];
  columns: string[];
  onToggle: (id: string) => void;
  onReset: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          aria-label="Choose leaderboard columns"
          title="Choose columns"
        >
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[12rem]">
        <DropdownMenuLabel className="text-xs">Visible columns</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {options.map((opt) => (
          <DropdownMenuCheckboxItem
            key={opt.id}
            checked={columns.includes(opt.id)}
            disabled={opt.locked}
            onCheckedChange={() => onToggle(opt.id)}
            onSelect={(e) => e.preventDefault()}
          >
            {opt.label}
            {opt.locked ? (
              <span className="ml-auto text-[10px] text-cp-muted">required</span>
            ) : null}
          </DropdownMenuCheckboxItem>
        ))}
        <DropdownMenuSeparator />
        <button
          type="button"
          className="w-full rounded-2xl px-3 py-2 text-left text-xs font-medium text-cp-primary hover:bg-accent"
          onClick={onReset}
        >
          Reset to default
        </button>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
