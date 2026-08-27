"use client";

import { useState } from "react";
import { Check, Loader2, Search, UserPlus, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { usePartnerPlayerSearch } from "@/hooks/use-partner-player-search";
import type { PartnerPlayerSearchResult } from "@/lib/partners/registration/search-players";
import { cn } from "@/lib/utils";

type PartnerPlayerSearchPickerProps = {
  partnerSlug: string;
  selected: PartnerPlayerSearchResult | null;
  onChange: (player: PartnerPlayerSearchResult | null) => void;
  excludePlayerIds?: string[];
  className?: string;
};

export function PartnerPlayerSearchPicker({
  partnerSlug,
  selected,
  onChange,
  excludePlayerIds = [],
  className,
}: PartnerPlayerSearchPickerProps) {
  const [query, setQuery] = useState("");
  const { data: results = [], isSearching, isError, error, isFetched } = usePartnerPlayerSearch(
    partnerSlug,
    query,
    { excludePlayerIds },
  );

  const filtered = results.filter((r) => r.playerId !== selected?.playerId);

  const showDropdown = query.trim().length >= 2 && !isSearching && filtered.length > 0;
  const showEmpty =
    query.trim().length >= 2 && !isSearching && !isError && isFetched && filtered.length === 0;
  const showError = query.trim().length >= 2 && !isSearching && isError;

  return (
    <div className={cn("space-y-3", className)}>
      {selected ? (
        <motion.span
          layout
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="inline-flex max-w-full items-center gap-2 rounded-full border border-cp-primary/40 bg-cp-primary/10 px-3 py-1.5 text-sm"
        >
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cp-primary/20 text-xs font-bold text-cp-primary">
            {selected.fullName.charAt(0).toUpperCase()}
          </span>
          <span className="min-w-0 truncate font-medium text-foreground">{selected.fullName}</span>
          {selected.isMember ? (
            <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-emerald-400">
              Member
            </span>
          ) : null}
          <button
            type="button"
            onClick={() => onChange(null)}
            className="rounded-full p-0.5 text-cp-muted hover:bg-cp-elevated hover:text-foreground"
            aria-label={`Remove ${selected.fullName}`}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </motion.span>
      ) : (
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cp-muted" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, email, or phone…"
            className="border-cp-border bg-cp-bg-input pl-9"
            autoComplete="off"
            aria-busy={isSearching}
          />
          {isSearching ? (
            <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-cp-muted" />
          ) : null}

          <AnimatePresence>
            {showDropdown ? (
              <motion.ul
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-cp-border bg-cp-card py-1 shadow-lg"
                role="listbox"
              >
                {filtered.map((player) => (
                  <li key={player.playerId}>
                    <button
                      type="button"
                      onClick={() => {
                        onChange(player);
                        setQuery("");
                      }}
                      className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-cp-elevated"
                      role="option"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cp-primary/20 text-xs font-bold text-cp-primary">
                        {player.fullName.charAt(0).toUpperCase()}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-foreground">
                          {player.fullName}
                          {player.isMember ? (
                            <span className="ml-2 text-[10px] font-semibold uppercase tracking-wide text-emerald-400">
                              Member
                            </span>
                          ) : null}
                        </p>
                        <p className="truncate text-xs text-cp-muted">{player.email}</p>
                      </div>
                      <UserPlus className="h-4 w-4 shrink-0 text-cp-primary" />
                    </button>
                  </li>
                ))}
              </motion.ul>
            ) : null}
          </AnimatePresence>

          {showError ? (
            <p className="mt-2 text-xs text-destructive" role="alert">
              {error instanceof Error ? error.message : "Search failed. Try again."}
            </p>
          ) : null}

          {showEmpty ? (
            <p className="mt-2 text-xs text-cp-muted">
              No players found on this site. Try invite contact instead.
            </p>
          ) : null}
        </div>
      )}

      {selected ? (
        <p className="flex items-center gap-1.5 text-xs text-emerald-400">
          <Check className="h-3.5 w-3.5" />
          Teammate linked from this partner site
        </p>
      ) : null}
    </div>
  );
}
