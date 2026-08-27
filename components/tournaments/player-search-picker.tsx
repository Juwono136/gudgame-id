"use client";

import { useState } from "react";
import Image from "next/image";
import { Check, Loader2, Search, UserPlus, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { usePlayerSearch } from "@/hooks/use-player-search";
import { resolveUserImageUrl } from "@/lib/media/client";
import type { TournamentPlayerSearchResult } from "@/lib/tournaments/players/search";
import { cn } from "@/lib/utils";

type PlayerSearchPickerProps = {
  sportSlug: string;
  selected: TournamentPlayerSearchResult[];
  onChange: (players: TournamentPlayerSearchResult[]) => void;
  maxSelections?: number;
  /** Single id to exclude (legacy). Prefer `excludeUserIds`. */
  excludeUserId?: string;
  excludeUserIds?: string[];
  className?: string;
};

export function PlayerSearchPicker({
  sportSlug,
  selected,
  onChange,
  maxSelections = 1,
  excludeUserId,
  excludeUserIds,
  className,
}: PlayerSearchPickerProps) {
  const [query, setQuery] = useState("");
  const { data: results = [], isSearching, isError, error, isFetched } = usePlayerSearch(
    sportSlug,
    query,
  );

  const excluded = new Set<string>([
    ...(excludeUserIds ?? []),
    ...(excludeUserId ? [excludeUserId] : []),
  ]);

  const filtered = results.filter(
    (r) => !selected.some((s) => s.userId === r.userId) && !excluded.has(r.userId),
  );

  const showDropdown = query.trim().length >= 2 && !isSearching && filtered.length > 0;
  const showEmpty =
    query.trim().length >= 2 && !isSearching && !isError && isFetched && filtered.length === 0;
  const showError = query.trim().length >= 2 && !isSearching && isError;

  const addPlayer = (player: TournamentPlayerSearchResult) => {
    if (selected.length >= maxSelections) return;
    onChange([...selected, player]);
    setQuery("");
  };

  const removePlayer = (userId: string) => {
    onChange(selected.filter((p) => p.userId !== userId));
  };

  return (
    <div className={cn("space-y-3", className)}>
      {selected.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {selected.map((player) => (
            <motion.span
              key={player.userId}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="inline-flex items-center gap-2 rounded-full border border-cp-primary/40 bg-cp-primary/10 px-3 py-1.5 text-sm"
            >
              <PlayerChipAvatar player={player} />
              <span className="font-medium text-foreground">{player.displayName}</span>
              <button
                type="button"
                onClick={() => removePlayer(player.userId)}
                className="rounded-full p-0.5 text-cp-muted hover:bg-cp-elevated hover:text-foreground"
                aria-label={`Remove ${player.displayName}`}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </motion.span>
          ))}
        </div>
      ) : null}

      {selected.length < maxSelections ? (
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cp-muted" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, nickname, or email…"
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
                  <li key={player.userId}>
                    <button
                      type="button"
                      onClick={() => addPlayer(player)}
                      className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-cp-elevated"
                      role="option"
                    >
                      <PlayerChipAvatar player={player} size="md" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-foreground">{player.displayName}</p>
                        <p className="truncate text-xs text-cp-muted">
                          {player.nickname ? `@${player.nickname} · ` : ""}
                          {player.email}
                        </p>
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
            <p className="mt-2 text-xs text-cp-muted">No players found. Try another search.</p>
          ) : null}
        </div>
      ) : (
        <p className="flex items-center gap-1.5 text-xs text-emerald-400">
          <Check className="h-3.5 w-3.5" />
          Partner slot filled
        </p>
      )}
    </div>
  );
}

function PlayerChipAvatar({
  player,
  size = "sm",
}: {
  player: TournamentPlayerSearchResult;
  size?: "sm" | "md";
}) {
  const src = resolveUserImageUrl(player.image);
  const dim = size === "md" ? "h-8 w-8" : "h-6 w-6";
  if (src) {
    return (
      <div className={cn("relative shrink-0 overflow-hidden rounded-full", dim)}>
        <Image src={src} alt="" fill className="object-cover" unoptimized />
      </div>
    );
  }
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-cp-primary/20 text-xs font-bold text-cp-primary",
        dim,
      )}
    >
      {player.displayName.charAt(0).toUpperCase()}
    </div>
  );
}
