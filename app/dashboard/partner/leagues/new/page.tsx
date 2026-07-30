"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { PartnerPageHeader } from "@/components/partners/partner-page-header";
import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingOverlay } from "@/components/ui/loading-overlay";
import { parseJsonResponse } from "@/lib/api/parse-json-response";
import { dashboardRoutes } from "@/lib/constants/routes";
import { useConfirmDialog } from "@/providers/confirm-dialog-provider";

export default function PartnerNewLeaguePage() {
  const router = useRouter();
  const { confirm } = useConfirmDialog();
  const [pending, setPending] = useState(false);
  const [name, setName] = useState("");

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 2) {
      toast.error("Enter a league name");
      return;
    }

    const ok = await confirm({
      title: "Create this league?",
      description: (
        <>
          Start{" "}
          <span className="font-medium text-foreground">&ldquo;{name.trim()}&rdquo;</span> for
          manual scores and standings. Results do not sync to Gud Game careers.
        </>
      ),
      confirmLabel: "Create league",
    });
    if (!ok) return;

    setPending(true);
    try {
      const res = await fetch("/api/partner/leagues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      const json = await parseJsonResponse<{
        success: true;
        data: { id: string };
      }>(res);
      if (!res.ok || !("data" in json)) {
        toast.error(
          (json as { error?: { message?: string } }).error?.message ?? "Could not create league",
        );
        return;
      }
      toast.success("League created");
      router.push(dashboardRoutes.partnerLeague(json.data.id));
      router.refresh();
    } catch {
      toast.error("Could not create league");
    } finally {
      setPending(false);
    }
  };

  return (
    <PageShell showGridBackground={false}>
      <div className="relative mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="relative mx-auto max-w-lg space-y-6">
        {pending ? <LoadingOverlay show label="Creating league…" /> : null}
        <PartnerPageHeader
          backHref={dashboardRoutes.partnerLeagues}
          backLabel="Leagues"
          title="New league"
          description="Season mode with manual scores and rolling standings — partner-only, no Gud Game career sync."
        />

        <form
          onSubmit={(e) => void onSubmit(e)}
          className="space-y-5 rounded-2xl border border-cp-border bg-cp-card p-5 shadow-sm sm:p-6"
        >
          <div className="space-y-2">
            <Label htmlFor="league-name">League name</Label>
            <Input
              id="league-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Thursday Club League"
              className="border-cp-border bg-cp-elevated/40"
              autoFocus
            />
          </div>
          <Button
            type="submit"
            disabled={pending}
            className="w-full bg-cp-primary hover:bg-cp-primary-light sm:w-auto"
          >
            {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Create league
          </Button>
        </form>
        </div>
      </div>
    </PageShell>
  );
}
