"use client";

import { useRef } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Download, Loader2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { InvoiceDownloadProgress } from "@/components/payments/invoice-download-progress";
import { PaymentInvoiceView } from "@/components/payments/payment-invoice-view";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { extractApiErrorMessage } from "@/lib/api/extract-api-error";
import { parseJsonResponse } from "@/lib/api/parse-json-response";
import { usePaymentInvoiceDownload } from "@/hooks/use-payment-invoice-download";
import type { PaymentInvoiceDocument } from "@/lib/tournaments/payments/payment-invoice";

type PartnerRegistrationReceiptContentProps = {
  partnerSlug: string;
  tournamentSlug: string;
  tournamentUrl: string;
  token: string | null;
};

async function fetchGuestInvoice(
  partnerSlug: string,
  tournamentSlug: string,
  token: string,
): Promise<PaymentInvoiceDocument> {
  const res = await fetch(
    `/api/partner/public/${partnerSlug}/tournaments/${tournamentSlug}/register/${token}/receipt`,
  );
  const json = await parseJsonResponse<{
    success: boolean;
    data: PaymentInvoiceDocument;
    error?: unknown;
  }>(res);
  if (!res.ok) {
    throw new Error(extractApiErrorMessage(json, "Could not load receipt"));
  }
  return json.data;
}

export function PartnerRegistrationReceiptContent({
  partnerSlug,
  tournamentSlug,
  tournamentUrl,
  token,
}: PartnerRegistrationReceiptContentProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const { download, isDownloading, progress, label } = usePaymentInvoiceDownload();

  const { data, isLoading, error } = useQuery({
    queryKey: ["partner-guest-invoice", partnerSlug, tournamentSlug, token],
    queryFn: () => fetchGuestInvoice(partnerSlug, tournamentSlug, token!),
    enabled: Boolean(token),
    staleTime: 60_000,
  });

  const handleDownload = async () => {
    const node = printRef.current?.firstElementChild as HTMLElement | null;
    if (!node || !data) return;

    try {
      await download(node, `Receipt ${data.invoiceNumber}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not open print dialog");
    }
  };

  if (!token) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-destructive/40 bg-destructive/10 p-8 text-center">
        <XCircle className="h-10 w-10 text-destructive" />
        <p className="text-sm text-foreground">Missing registration token.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <LoadingSpinner label="Loading your receipt…" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-destructive/40 bg-destructive/10 p-8 text-center">
        <XCircle className="h-10 w-10 text-destructive" />
        <p className="text-sm text-foreground">
          {error instanceof Error ? error.message : "This receipt is not available."}
        </p>
        <Button asChild variant="outline" className="border-cp-border">
          <Link href={tournamentUrl}>Back to tournament</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Button asChild variant="ghost" size="sm" className="h-9 w-fit justify-start px-2">
            <Link href={tournamentUrl}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to tournament
            </Link>
          </Button>
          <Button
            type="button"
            className="h-10 w-full bg-cp-primary hover:bg-cp-primary-light sm:w-auto"
            disabled={isDownloading}
            onClick={() => void handleDownload()}
          >
            {isDownloading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            Download / Print PDF
          </Button>
        </div>
        {isDownloading ? <InvoiceDownloadProgress progress={progress} label={label} /> : null}
      </div>

      <div ref={printRef} className="flex justify-center">
        <PaymentInvoiceView invoice={data} className="shadow-lg ring-1 ring-slate-200" />
      </div>
    </div>
  );
}
