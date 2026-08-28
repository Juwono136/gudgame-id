"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { parseJsonResponse } from "@/lib/api/parse-json-response";
import { dashboardRoutes } from "@/lib/constants/routes";
import type {
  PartnerLeagueListItem,
  PartnerLeagueOption,
} from "@/lib/partners/league-types";
import {
  cpSelectContentClass,
  cpSelectItemClass,
  cpSelectTriggerClass,
} from "@/lib/styles/surface-classes";

const NONE_VALUE = "__none__";
const CREATE_VALUE = "__create__";

type PartnerTournamentLeagueFieldProps = {
  value: string | null;
  onChange: (leagueId: string | null, leagueName?: string | null) => void;
  disabled?: boolean;
};

export function PartnerTournamentLeagueField({
  value,
  onChange,
  disabled = false,
}: PartnerTournamentLeagueFieldProps) {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<"pick" | "create">("pick");
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);

  const { data: leagues = [], isLoading } = useQuery({
    queryKey: ["partner-leagues", "options"],
    queryFn: async (): Promise<PartnerLeagueOption[]> => {
      const res = await fetch("/api/partner/leagues/options");
      const json = await parseJsonResponse<{
        success: true;
        data: { items: PartnerLeagueOption[] };
      }>(res);
      if (!res.ok || !("data" in json)) {
        throw new Error(
          (json as { error?: { message?: string } }).error?.message ??
            "Could not load leagues",
        );
      }
      return json.data.items;
    },
  });

  const options =
    value && !leagues.some((l) => l.id === value)
      ? [
          ...leagues,
          {
            id: value,
            name: "(Current league — not linkable; pick another or clear)",
            slug: "",
            status: "archived" as const,
          },
        ]
      : leagues;

  const selectValue = mode === "create" ? CREATE_VALUE : value ?? NONE_VALUE;

  const createLeague = async () => {
    const name = newName.trim();
    if (name.length < 2) {
      toast.error("Enter a league name (at least 2 characters)");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/partner/leagues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const json = await parseJsonResponse<{
        success: true;
        data: PartnerLeagueListItem;
      }>(res);
      if (!res.ok || !("data" in json)) {
        toast.error(
          (json as { error?: { message?: string } }).error?.message ??
            "Could not create league",
        );
        return;
      }
      await queryClient.invalidateQueries({ queryKey: ["partner-leagues"] });
      onChange(json.data.id, json.data.name);
      setMode("pick");
      setNewName("");
      toast.success(`League “${json.data.name}” created`, {
        description: "Add brand photo and details from the Leagues menu.",
      });
    } catch {
      toast.error("Could not create league");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-3 rounded-xl border border-cp-border bg-cp-elevated/30 p-4">
      <div className="space-y-1.5">
        <Label>Series (optional)</Label>
        <p className="text-xs leading-relaxed text-cp-muted">
          Attach this event to an active or completed series season so it appears on the series
          page and in public filters. Leave empty if this tournament stands alone. Branding lives
          under{" "}
          <Link
            href={dashboardRoutes.partnerLeagues}
            className="font-medium text-cp-primary underline-offset-2 hover:underline"
          >
            Series
          </Link>
          .
        </p>
      </div>

      <Select
        value={selectValue}
        disabled={disabled || isLoading || creating}
        onValueChange={(next) => {
          if (next === CREATE_VALUE) {
            setMode("create");
            return;
          }
          setMode("pick");
          if (next === NONE_VALUE) {
            onChange(null, null);
            return;
          }
          const selected = options.find((l) => l.id === next);
          onChange(next, selected?.name ?? null);
        }}
      >
        <SelectTrigger className={cpSelectTriggerClass}>
          <SelectValue placeholder={isLoading ? "Loading series…" : "No series"} />
        </SelectTrigger>
        <SelectContent className={cpSelectContentClass}>
          <SelectItem value={NONE_VALUE} className={cpSelectItemClass}>
            No series
          </SelectItem>
          {options.map((league) => (
            <SelectItem key={league.id} value={league.id} className={cpSelectItemClass}>
              {league.name}
              {league.status === "completed" ? " (completed)" : ""}
            </SelectItem>
          ))}
          <SelectItem value={CREATE_VALUE} className={cpSelectItemClass}>
            <span className="inline-flex items-center gap-1.5">
              <Plus className="h-3.5 w-3.5" aria-hidden />
              Create new series…
            </span>
          </SelectItem>
        </SelectContent>
      </Select>

      {mode === "create" ? (
        <div className="space-y-3 rounded-lg border border-dashed border-cp-border bg-cp-card/60 p-3">
          <div className="space-y-2">
            <Label htmlFor="inline-league-name">New series name</Label>
            <Input
              id="inline-league-name"
              value={newName}
              onChange={(e) => setNewName(e.target.value.slice(0, 160))}
              placeholder="e.g. Tolak Angin Cup"
              className="border-cp-border bg-cp-bg-input"
              disabled={creating}
              autoFocus
            />
            <p className="text-[11px] text-cp-muted">
              Brand photo and full details can only be edited in the Leagues menu after creation.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              className="bg-cp-primary hover:bg-cp-primary-light"
              disabled={creating}
              onClick={() => void createLeague()}
            >
              {creating ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : null}
              Create & select
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="border-cp-border"
              disabled={creating}
              onClick={() => {
                setMode("pick");
                setNewName("");
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
