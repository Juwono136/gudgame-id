"use client";

import { useMemo, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  PLAYER_SPORT_INTEREST_OPTIONS,
  type PlayerSportInterestSlug,
} from "@/lib/constants/player-sport-interests";
import { cn } from "@/lib/utils";

type SportInterestsFieldProps = {
  value: string[];
  onChange: (slugs: string[]) => void;
  error?: string;
  className?: string;
};

export function SportInterestsField({
  value,
  onChange,
  error,
  className,
}: SportInterestsFieldProps) {
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return PLAYER_SPORT_INTEREST_OPTIONS;
    return PLAYER_SPORT_INTEREST_OPTIONS.filter(
      (s) => s.name.toLowerCase().includes(q) || s.slug.includes(q),
    );
  }, [query]);

  const visible = expanded || query ? filtered : filtered.slice(0, 12);
  const hiddenCount = filtered.length - visible.length;

  const toggle = (slug: PlayerSportInterestSlug) => {
    if (value.includes(slug)) {
      onChange(value.filter((s) => s !== slug));
    } else {
      onChange([...value, slug]);
    }
  };

  return (
    <div className={cn("space-y-3", className)}>
      <div>
        <Label>Sports you follow</Label>
        <p className="mt-1 text-xs text-cp-muted">
          Tap to select sports you play or follow. Published player profiles are created for each
          sport you follow once that discipline is enabled on TandingBase.
        </p>
      </div>

      {value.length > 0 ? (
        <div className="flex flex-wrap gap-1.5 rounded-xl border border-cp-primary/20 bg-cp-primary/5 p-2.5">
          {value.map((slug) => {
            const sport = PLAYER_SPORT_INTEREST_OPTIONS.find((o) => o.slug === slug);
            if (!sport) return null;
            return (
              <button
                key={slug}
                type="button"
                onClick={() => toggle(slug as PlayerSportInterestSlug)}
                className="rounded-full border border-cp-primary bg-cp-primary px-2.5 py-1 text-[11px] font-semibold text-white sm:text-xs"
              >
                {sport.name} ×
              </button>
            );
          })}
        </div>
      ) : null}

      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-cp-muted" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search sports…"
          className="h-9 border-cp-border bg-cp-elevated/50 pl-9 text-sm"
        />
      </div>

      <div className="grid grid-cols-2 gap-1.5 xs:gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {visible.map((sport) => {
          const checked = value.includes(sport.slug);
          return (
            <button
              key={sport.slug}
              type="button"
              onClick={() => toggle(sport.slug)}
              className={cn(
                "rounded-lg border px-2 py-2 text-left text-[11px] font-medium transition-colors sm:rounded-xl sm:px-2.5 sm:py-2 sm:text-xs",
                checked
                  ? "border-cp-primary bg-cp-primary/15 text-foreground"
                  : "border-cp-border bg-cp-elevated/30 text-cp-muted hover:border-cp-primary/30 hover:text-foreground",
              )}
            >
              {sport.name}
            </button>
          );
        })}
      </div>

      {hiddenCount > 0 && !query ? (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="inline-flex items-center gap-1 text-xs font-medium text-cp-primary hover:underline"
        >
          Show {hiddenCount} more
          <ChevronDown className="h-3.5 w-3.5" />
        </button>
      ) : null}

      {error ? (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
