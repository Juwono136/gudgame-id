"use client";

import { useCallback, useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { extractApiErrorMessage } from "@/lib/api/extract-api-error";
import { parseJsonResponse } from "@/lib/api/parse-json-response";
import {
  SCRAPE_PARSER_LABELS,
  SCRAPE_PARSER_PROFILES,
  type ScrapeParserProfile,
} from "@/lib/wiki/gear/constants";
import type { ScrapeHostView } from "@/lib/wiki/scrape-hosts/service";
import { cn } from "@/lib/utils";

type HostsResponse = {
  success: boolean;
  data: { hosts: ScrapeHostView[] };
  error?: unknown;
};

export function ScrapeHostsManager() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [hostname, setHostname] = useState("");
  const [label, setLabel] = useState("");
  const [parserProfile, setParserProfile] = useState<ScrapeParserProfile>("generic");

  const { data: hosts = [], isLoading } = useQuery({
    queryKey: ["admin", "wiki-scrape-hosts"],
    queryFn: async () => {
      const res = await fetch("/api/admin/wiki-scrape-hosts");
      const json = await parseJsonResponse<HostsResponse>(res);
      if (!res.ok) throw new Error(extractApiErrorMessage(json, "Failed to load hosts"));
      return json.data?.hosts ?? [];
    },
    staleTime: 30_000,
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["admin", "wiki-scrape-hosts"] });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/wiki-scrape-hosts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hostname, label, parserProfile, enabled: true }),
      });
      const json = await parseJsonResponse<HostsResponse>(res);
      if (!res.ok) throw new Error(extractApiErrorMessage(json, "Failed to add host"));
      return json.data;
    },
    onSuccess: () => {
      toast.success("Scrape host added");
      setDialogOpen(false);
      setHostname("");
      setLabel("");
      setParserProfile("generic");
      void invalidate();
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to add host"),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      const res = await fetch(`/api/admin/wiki-scrape-hosts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });
      const json = await parseJsonResponse<HostsResponse>(res);
      if (!res.ok) throw new Error(extractApiErrorMessage(json, "Update failed"));
    },
    onSuccess: () => void invalidate(),
    onError: (err) => toast.error(err instanceof Error ? err.message : "Update failed"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/wiki-scrape-hosts/${id}`, { method: "DELETE" });
      const json = await parseJsonResponse<{ success: boolean; error?: unknown }>(res);
      if (!res.ok) throw new Error(extractApiErrorMessage(json, "Delete failed"));
    },
    onSuccess: () => {
      toast.success("Host removed");
      void invalidate();
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Delete failed"),
  });

  const openAddDialog = useCallback(() => {
    setHostname("");
    setLabel("");
    setParserProfile("generic");
    setDialogOpen(true);
  }, []);

  return (
    <section className="rounded-xl border border-cp-border bg-cp-card p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Allowed scrape hosts</h3>
          <p className="mt-1 text-xs text-cp-muted">
            Only HTTPS URLs from these hostnames can be imported. Add retailers you trust.
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="shrink-0 border-cp-border"
          onClick={openAddDialog}
        >
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Add host
        </Button>
      </div>

      {isLoading ? (
        <div className="mt-4 flex items-center gap-2 text-sm text-cp-muted">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading hosts…
        </div>
      ) : hosts.length === 0 ? (
        <p className="mt-4 text-sm text-cp-muted">No scrape hosts configured yet.</p>
      ) : (
        <>
          <div className="mt-4 hidden overflow-x-auto rounded-lg border border-cp-border md:block">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead className="border-b border-cp-border bg-cp-elevated/50 text-xs uppercase tracking-wide text-cp-muted">
                <tr>
                  <th className="px-3 py-2 font-medium">Hostname</th>
                  <th className="px-3 py-2 font-medium">Label</th>
                  <th className="px-3 py-2 font-medium">Parser</th>
                  <th className="px-3 py-2 font-medium">Enabled</th>
                  <th className="px-3 py-2 font-medium" />
                </tr>
              </thead>
              <tbody className="divide-y divide-cp-border">
                {hosts.map((host) => (
                  <HostRow
                    key={host.id}
                    host={host}
                    onToggle={(enabled) => toggleMutation.mutate({ id: host.id, enabled })}
                    onDelete={() => deleteMutation.mutate(host.id)}
                    busy={toggleMutation.isPending || deleteMutation.isPending}
                  />
                ))}
              </tbody>
            </table>
          </div>

          <ul className="mt-4 space-y-2 md:hidden">
            {hosts.map((host) => (
              <li
                key={host.id}
                className="rounded-lg border border-cp-border bg-cp-elevated/30 p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-mono text-sm text-foreground">{host.hostname}</p>
                    <p className="text-xs text-cp-muted">{host.label}</p>
                    <p className="mt-1 text-xs text-cp-text-dim">
                      {SCRAPE_PARSER_LABELS[host.parserProfile as ScrapeParserProfile] ??
                        host.parserProfile}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <EnabledToggle
                      enabled={host.enabled}
                      onChange={(enabled) => toggleMutation.mutate({ id: host.id, enabled })}
                      disabled={toggleMutation.isPending}
                    />
                    <button
                      type="button"
                      className="text-cp-muted hover:text-destructive"
                      onClick={() => deleteMutation.mutate(host.id)}
                      aria-label={`Delete ${host.hostname}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="border-cp-border bg-cp-card sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add scrape host</DialogTitle>
            <DialogDescription className="text-sm text-cp-muted">
              Allow importing products from this hostname. Use the site domain only, without https://.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Hostname</Label>
              <Input
                value={hostname}
                onChange={(e) => setHostname(e.target.value)}
                placeholder="e.g. padeltop.id"
                className="mt-1.5 border-cp-border bg-cp-elevated font-mono text-sm"
              />
            </div>
            <div>
              <Label>Display label</Label>
              <Input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g. PadelTop"
                className="mt-1.5 border-cp-border bg-cp-elevated"
              />
            </div>
            <div>
              <Label>Parser profile</Label>
              <select
                value={parserProfile}
                onChange={(e) => setParserProfile(e.target.value as ScrapeParserProfile)}
                className="mt-1.5 h-10 w-full rounded-lg border border-cp-border bg-cp-elevated px-3 text-sm"
              >
                {SCRAPE_PARSER_PROFILES.map((p) => (
                  <option key={p} value={p}>
                    {SCRAPE_PARSER_LABELS[p]}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="border-cp-border"
              onClick={() => setDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={!hostname.trim() || !label.trim() || createMutation.isPending}
              onClick={() => createMutation.mutate()}
              className="bg-cp-primary hover:bg-cp-primary-light"
            >
              {createMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Add host
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

function EnabledToggle({
  enabled,
  onChange,
  disabled,
}: {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      disabled={disabled}
      onClick={() => onChange(!enabled)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 rounded-full border transition-colors",
        enabled ? "border-cp-primary bg-cp-primary/30" : "border-cp-border bg-cp-elevated",
        disabled && "opacity-50",
      )}
    >
      <span
        className={cn(
          "pointer-events-none inline-block h-5 w-5 translate-y-0.5 rounded-full bg-white shadow transition-transform",
          enabled ? "translate-x-5" : "translate-x-0.5",
        )}
      />
    </button>
  );
}

function HostRow({
  host,
  onToggle,
  onDelete,
  busy,
}: {
  host: ScrapeHostView;
  onToggle: (enabled: boolean) => void;
  onDelete: () => void;
  busy: boolean;
}) {
  return (
    <tr className={cn(!host.enabled && "opacity-60")}>
      <td className="px-3 py-2.5 font-mono text-xs">{host.hostname}</td>
      <td className="px-3 py-2.5">{host.label}</td>
      <td className="px-3 py-2.5 text-xs text-cp-muted">
        {SCRAPE_PARSER_LABELS[host.parserProfile as ScrapeParserProfile] ?? host.parserProfile}
      </td>
      <td className="px-3 py-2.5">
        <EnabledToggle enabled={host.enabled} disabled={busy} onChange={onToggle} />
      </td>
      <td className="px-3 py-2.5 text-right">
        <button
          type="button"
          className="text-cp-muted hover:text-destructive disabled:opacity-50"
          onClick={onDelete}
          disabled={busy}
          aria-label={`Delete ${host.hostname}`}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </td>
    </tr>
  );
}
