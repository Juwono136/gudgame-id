"use client";

import { useState } from "react";
import Image from "next/image";
import { Search, X, UserPlus } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";
import { useQuery } from "@tanstack/react-query";
import { parseJsonResponse } from "@/lib/api/parse-json-response";
import { extractApiErrorMessage } from "@/lib/api/extract-api-error";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { WikiEntityType } from "@/lib/domain/wiki";
import { cn } from "@/lib/utils";

export type RelationDraft = {
  toEntityId: string;
  relationType: string;
  displayName: string;
  entityType: WikiEntityType;
  primaryImageUrl: string | null;
  sortOrder: number;
};

type WikiRelationPickerProps = {
  label: string;
  hint: string;
  relationType: string;
  targetTypes: WikiEntityType[];
  relations: RelationDraft[];
  onChange: (relations: RelationDraft[]) => void;
  excludeEntityId?: string;
};

export function WikiRelationPicker({
  label,
  hint,
  relationType,
  targetTypes,
  relations,
  onChange,
  excludeEntityId,
}: WikiRelationPickerProps) {
  const [query, setQuery] = useState("");
  const debouncedQ = useDebounce(query, 300);

  const { data: results, isFetching } = useQuery({
    queryKey: ["wiki-entity-search", debouncedQ, targetTypes.join(",")],
    enabled: debouncedQ.length >= 2,
    queryFn: async () => {
      const params = new URLSearchParams({
        q: debouncedQ,
        types: targetTypes.join(","),
      });
      const res = await fetch(`/api/admin/wiki-entities/search?${params}`);
      const json = await parseJsonResponse<{
        success: boolean;
        data: {
          items: {
            id: string;
            entityType: WikiEntityType;
            displayName: string;
            primaryImageUrl: string | null;
          }[];
        };
        error?: string | { message?: string };
      }>(res);
      if (!res.ok) {
        throw new Error(extractApiErrorMessage(json, "Search failed"));
      }
      return json.data.items;
    },
  });

  const add = (item: {
    id: string;
    entityType: WikiEntityType;
    displayName: string;
    primaryImageUrl: string | null;
  }) => {
    if (excludeEntityId && item.id === excludeEntityId) return;
    if (relations.some((r) => r.toEntityId === item.id)) return;
    onChange([
      ...relations,
      {
        toEntityId: item.id,
        relationType,
        displayName: item.displayName,
        entityType: item.entityType,
        primaryImageUrl: item.primaryImageUrl,
        sortOrder: relations.length,
      },
    ]);
    setQuery("");
  };

  const remove = (id: string) => {
    onChange(
      relations
        .filter((r) => r.toEntityId !== id)
        .map((r, i) => ({ ...r, sortOrder: i })),
    );
  };

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-semibold text-foreground">{label}</p>
        <p className="mt-0.5 text-xs text-cp-muted">{hint}</p>
      </div>

      {relations.length > 0 ? (
        <ul className="space-y-2">
          {relations.map((r) => (
            <li
              key={r.toEntityId}
              className="flex items-center gap-3 rounded-lg border border-cp-border bg-cp-elevated px-3 py-2"
            >
              <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-cp-card">
                {r.primaryImageUrl ? (
                  <Image
                    src={r.primaryImageUrl}
                    alt=""
                    fill
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-[10px] text-cp-muted">
                    —
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{r.displayName}</p>
                <p className="text-xs capitalize text-cp-muted">{r.entityType}</p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="shrink-0 text-cp-muted hover:text-red-400"
                onClick={() => remove(r.toEntityId)}
              >
                <X className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-lg border border-dashed border-cp-border px-4 py-6 text-center text-sm text-cp-muted">
          No members linked yet. Search below to add players to this team.
        </p>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cp-muted" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search players by name…"
          className="border-cp-border bg-cp-elevated pl-9"
        />
      </div>

      {debouncedQ.length >= 2 ? (
        <div
          className={cn(
            "max-h-48 overflow-y-auto rounded-lg border border-cp-border bg-cp-card",
            isFetching && "opacity-70",
          )}
        >
          {(results ?? []).length === 0 && !isFetching ? (
            <p className="px-4 py-3 text-sm text-cp-muted">No matches. Try another name.</p>
          ) : null}
          {(results ?? []).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => add(item)}
              disabled={relations.some((r) => r.toEntityId === item.id)}
              className="flex w-full items-center gap-3 border-b border-cp-border/50 px-4 py-2.5 text-left last:border-0 hover:bg-cp-primary/10 disabled:opacity-40"
            >
              <UserPlus className="h-4 w-4 shrink-0 text-cp-logo-accent" />
              <span className="text-sm text-foreground">{item.displayName}</span>
              <span className="ml-auto text-xs capitalize text-cp-muted">{item.entityType}</span>
            </button>
          ))}
        </div>
      ) : (
        <p className="text-xs text-cp-muted">Type at least 2 characters to search published wiki entries.</p>
      )}
    </div>
  );
}
