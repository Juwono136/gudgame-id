"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  PartnerLeagueDetailsForm,
  type PartnerLeagueDetailsFormValues,
} from "@/components/partners/partner-league-details-form";
import { PartnerPageHeader } from "@/components/partners/partner-page-header";
import { Button } from "@/components/ui/button";
import { LoadingOverlay } from "@/components/ui/loading-overlay";
import { parseJsonResponse } from "@/lib/api/parse-json-response";
import { dashboardRoutes } from "@/lib/constants/routes";
import { PARTNER_LEAGUE_FIELD_LIMITS } from "@/lib/partners/league-field-limits";
import { partnerPageClass } from "@/lib/partners/layout";
import { validatePartnerLogoFile } from "@/lib/partners/logo-validation";
import { htmlCharCount } from "@/lib/tournaments/form/field-limits";
import { useConfirmDialog } from "@/providers/confirm-dialog-provider";

export default function PartnerNewLeaguePage() {
  const router = useRouter();
  const { confirm } = useConfirmDialog();
  const [pending, setPending] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [descriptionError, setDescriptionError] = useState<string | null>(null);
  const [pendingLogo, setPendingLogo] = useState<File | null>(null);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [values, setValues] = useState<PartnerLeagueDetailsFormValues>({
    name: "",
    summary: "",
    description: "",
    status: "active",
    brandPreviewUrl: null,
  });

  const patch = (next: Partial<PartnerLeagueDetailsFormValues>) => {
    setValues((prev) => ({ ...prev, ...next }));
  };

  const onBrandFile = (file: File) => {
    const validation = validatePartnerLogoFile(file);
    if (!validation.ok) {
      toast.error(validation.message);
      return;
    }
    if (localPreview) URL.revokeObjectURL(localPreview);
    const url = URL.createObjectURL(validation.file);
    setPendingLogo(validation.file);
    setLocalPreview(url);
    patch({ brandPreviewUrl: url });
  };

  const onBrandRemove = () => {
    if (localPreview) URL.revokeObjectURL(localPreview);
    setPendingLogo(null);
    setLocalPreview(null);
    patch({ brandPreviewUrl: null });
  };

  const validate = () => {
    let ok = true;
    if (values.name.trim().length < 2) {
      setNameError("Enter a league name (at least 2 characters)");
      ok = false;
    } else {
      setNameError(null);
    }
    if (htmlCharCount(values.summary) > PARTNER_LEAGUE_FIELD_LIMITS.summary) {
      setSummaryError(`Summary must be at most ${PARTNER_LEAGUE_FIELD_LIMITS.summary} characters`);
      ok = false;
    } else {
      setSummaryError(null);
    }
    if (htmlCharCount(values.description) > PARTNER_LEAGUE_FIELD_LIMITS.description) {
      setDescriptionError(
        `Description must be at most ${PARTNER_LEAGUE_FIELD_LIMITS.description.toLocaleString()} characters`,
      );
      ok = false;
    } else {
      setDescriptionError(null);
    }
    return ok;
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const ok = await confirm({
      title: "Create this league?",
      description: (
        <>
          Create{" "}
          <span className="font-medium text-foreground">&ldquo;{values.name.trim()}&rdquo;</span>{" "}
          as a brand to group tournaments on your partner site.
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
        body: JSON.stringify({
          name: values.name.trim(),
          summary: values.summary.trim() || null,
          description: values.description.trim() || null,
        }),
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

      const leagueId = json.data.id;
      if (pendingLogo) {
        const form = new FormData();
        form.append("file", pendingLogo);
        const uploadRes = await fetch(`/api/partner/leagues/${leagueId}/brand`, {
          method: "POST",
          body: form,
        });
        if (!uploadRes.ok) {
          toast.error("League created, but logo upload failed. You can retry from Edit league.");
          router.push(dashboardRoutes.partnerLeagueEdit(leagueId));
          router.refresh();
          return;
        }
      }

      toast.success("League created");
      router.push(dashboardRoutes.partnerLeague(leagueId));
      router.refresh();
    } catch {
      toast.error("Could not create league");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className={partnerPageClass("relative space-y-6 py-8 sm:space-y-8")}>
      {pending ? <LoadingOverlay show label="Creating league…" /> : null}

      <PartnerPageHeader
        backHref={dashboardRoutes.partnerLeagues}
        backLabel="Leagues"
        title="New league"
        description="Set the league brand, logo, and story. Then attach tournaments to this league when you create or edit them."
      />

      <form
        onSubmit={(e) => void onSubmit(e)}
        className="rounded-2xl border border-cp-border bg-cp-card p-5 shadow-sm sm:p-8"
      >
        <div className="mx-auto w-full max-w-3xl space-y-8">
          <PartnerLeagueDetailsForm
            values={values}
            onChange={patch}
            onBrandFile={onBrandFile}
            onBrandRemove={onBrandRemove}
            nameError={nameError}
            summaryError={summaryError}
            descriptionError={descriptionError}
            disabled={pending}
            autoFocusName
          />

          <div className="flex flex-wrap gap-3 border-t border-cp-border pt-6">
            <Button
              type="submit"
              disabled={pending}
              className="bg-cp-primary hover:bg-cp-primary-light"
            >
              {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Create league
            </Button>
            <Button
              type="button"
              variant="outline"
              className="border-cp-border"
              disabled={pending}
              onClick={() => router.push(dashboardRoutes.partnerLeagues)}
            >
              Cancel
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
