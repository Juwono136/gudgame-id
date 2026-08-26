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
import { PartnerLoadingOverlay } from "@/components/partners/partner-loading";
import { parseJsonResponse } from "@/lib/api/parse-json-response";
import { dashboardRoutes } from "@/lib/constants/routes";
import { partnerBrandCssVars } from "@/lib/partners/brand-style";
import { PARTNER_LEAGUE_FIELD_LIMITS } from "@/lib/partners/league-field-limits";
import type { PartnerLeagueDetail } from "@/lib/partners/league-types";
import { partnerPageClass } from "@/lib/partners/layout";
import { validatePartnerLogoFile } from "@/lib/partners/logo-validation";
import { htmlCharCount } from "@/lib/tournaments/form/field-limits";
import { useConfirmDialog } from "@/providers/confirm-dialog-provider";

type PartnerLeagueEditClientProps = {
  league: PartnerLeagueDetail;
  primaryColor: string;
  accentColor: string;
};

export function PartnerLeagueEditClient({
  league,
  primaryColor,
  accentColor,
}: PartnerLeagueEditClientProps) {
  const router = useRouter();
  const { confirm } = useConfirmDialog();
  const [pending, setPending] = useState(false);
  const [uploadingBrand, setUploadingBrand] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [descriptionError, setDescriptionError] = useState<string | null>(null);
  const [values, setValues] = useState<PartnerLeagueDetailsFormValues>({
    name: league.name,
    summary: league.summary ?? "",
    description: league.description ?? "",
    status: league.status,
    brandPreviewUrl: league.brandImageUrl,
  });

  const patch = (next: Partial<PartnerLeagueDetailsFormValues>) => {
    setValues((prev) => ({ ...prev, ...next }));
  };

  const onBrandFile = async (file: File) => {
    const validation = validatePartnerLogoFile(file);
    if (!validation.ok) {
      toast.error(validation.message);
      return;
    }
    setUploadingBrand(true);
    try {
      const form = new FormData();
      form.append("file", validation.file);
      const res = await fetch(`/api/partner/leagues/${league.id}/brand`, {
        method: "POST",
        body: form,
      });
      const json = await parseJsonResponse<{
        success: true;
        data: { league: PartnerLeagueDetail; url: string };
      }>(res);
      if (!res.ok || !("data" in json)) {
        toast.error(
          (json as { error?: { message?: string } }).error?.message ?? "Upload failed",
        );
        return;
      }
      patch({ brandPreviewUrl: json.data.url });
      toast.success("Logo updated");
    } catch {
      toast.error("Upload failed");
    } finally {
      setUploadingBrand(false);
    }
  };

  const onBrandRemove = async () => {
    const ok = await confirm({
      title: "Remove league logo?",
      description: "Tournament cards will keep the league name badge without a logo.",
      confirmLabel: "Remove logo",
      variant: "destructive",
    });
    if (!ok) return;

    setUploadingBrand(true);
    try {
      const res = await fetch(`/api/partner/leagues/${league.id}/brand`, { method: "DELETE" });
      const json = await parseJsonResponse<{
        success: true;
        data: { league: PartnerLeagueDetail };
      }>(res);
      if (!res.ok || !("data" in json)) {
        toast.error(
          (json as { error?: { message?: string } }).error?.message ?? "Could not remove logo",
        );
        return;
      }
      patch({ brandPreviewUrl: null });
      toast.success("Logo removed");
    } finally {
      setUploadingBrand(false);
    }
  };

  const validate = () => {
    let ok = true;
    if (values.name.trim().length < 2) {
      setNameError("Enter a league name (at least 2 characters)");
      ok = false;
    } else setNameError(null);
    if (htmlCharCount(values.summary) > PARTNER_LEAGUE_FIELD_LIMITS.summary) {
      setSummaryError(`Summary must be at most ${PARTNER_LEAGUE_FIELD_LIMITS.summary} characters`);
      ok = false;
    } else setSummaryError(null);
    if (htmlCharCount(values.description) > PARTNER_LEAGUE_FIELD_LIMITS.description) {
      setDescriptionError(
        `Description must be at most ${PARTNER_LEAGUE_FIELD_LIMITS.description.toLocaleString()} characters`,
      );
      ok = false;
    } else setDescriptionError(null);
    return ok;
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setPending(true);
    try {
      const res = await fetch(`/api/partner/leagues/${league.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: values.name.trim(),
          status: values.status,
          summary: values.summary.trim() || null,
          description: values.description.trim() || null,
        }),
      });
      const json = await parseJsonResponse<{ success: true; data: PartnerLeagueDetail }>(res);
      if (!res.ok || !("data" in json)) {
        toast.error(
          (json as { error?: { message?: string } }).error?.message ?? "Could not save league",
        );
        return;
      }
      toast.success("League saved");
      router.push(dashboardRoutes.partnerLeague(league.id));
      router.refresh();
    } catch {
      toast.error("Could not save league");
    } finally {
      setPending(false);
    }
  };

  const busy = pending || uploadingBrand;

  return (
    <div
      className={partnerPageClass("relative space-y-6 py-8 sm:space-y-8")}
      style={partnerBrandCssVars(primaryColor, accentColor)}
    >
      {busy ? (
        <PartnerLoadingOverlay
          show
          label={uploadingBrand ? "Uploading logo…" : "Saving league…"}
          variant="fullscreen"
        />
      ) : null}

      <PartnerPageHeader
        backHref={dashboardRoutes.partnerLeague(league.id)}
        backLabel="Back to league"
        title="Edit league"
        description="Update the league brand, logo, and public details. Tournament links stay intact."
      />

      <form
        onSubmit={(e) => void onSubmit(e)}
        className="rounded-2xl border border-cp-border bg-cp-card p-5 shadow-sm sm:p-8"
      >
        <div className="mx-auto w-full max-w-3xl space-y-8">
          <PartnerLeagueDetailsForm
            values={values}
            onChange={patch}
            onBrandFile={(file) => void onBrandFile(file)}
            onBrandRemove={() => void onBrandRemove()}
            nameError={nameError}
            summaryError={summaryError}
            descriptionError={descriptionError}
            disabled={busy}
            uploadingBrand={uploadingBrand}
            showStatus
          />

          <div className="flex flex-wrap gap-3 border-t border-cp-border pt-6">
            <Button
              type="submit"
              disabled={busy}
              className="bg-cp-primary hover:bg-cp-primary-light"
            >
              {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save changes
            </Button>
            <Button
              type="button"
              variant="outline"
              className="border-cp-border"
              disabled={busy}
              onClick={() => router.push(dashboardRoutes.partnerLeague(league.id))}
            >
              Cancel
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
