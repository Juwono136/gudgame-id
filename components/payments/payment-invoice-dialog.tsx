"use client";

import { useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, ExternalLink, FileText, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { InvoiceDownloadProgress } from "@/components/payments/invoice-download-progress";
import { PaymentInvoiceView } from "@/components/payments/payment-invoice-view";
import { parseJsonResponse } from "@/lib/api/parse-json-response";
import { extractApiErrorMessage } from "@/lib/api/extract-api-error";
import { dashboardRoutes } from "@/lib/constants/routes";
import { usePaymentInvoiceDownload } from "@/hooks/use-payment-invoice-download";
import type { PaymentInvoiceDocument } from "@/lib/tournaments/payments/payment-invoice";

type PaymentInvoiceDialogProps = {
  paymentId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

async function fetchPaymentInvoice(paymentId: string): Promise<PaymentInvoiceDocument> {
  const res = await fetch(`/api/payments/transactions/${paymentId}/invoice`);
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

export function PaymentInvoiceDialog({
  paymentId,
  open,
  onOpenChange,
}: PaymentInvoiceDialogProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const { download, isDownloading, progress, label } = usePaymentInvoiceDownload();

  const { data, isLoading, error, isFetching } = useQuery({
    queryKey: ["payment-invoice", paymentId],
    queryFn: () => fetchPaymentInvoice(paymentId!),
    enabled: open && paymentId != null,
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(92dvh,56rem)] w-[calc(100%-1rem)] max-w-3xl flex-col gap-0 overflow-hidden border-cp-border bg-cp-card p-0 sm:w-full">
        <DialogHeader className="shrink-0 space-y-1.5 border-b border-cp-border px-4 py-4 text-left sm:px-6">
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 shrink-0 text-cp-primary" />
            Payment receipt
          </DialogTitle>
          <DialogDescription>
            Official proof of payment for your tournament registration.
          </DialogDescription>
          {data ? (
            <div className="space-y-3 pt-2">
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                <Button
                  type="button"
                  className="h-10 flex-1 bg-cp-primary hover:bg-cp-primary-light sm:min-w-[10rem]"
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
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 border-cp-border sm:w-auto"
                  asChild
                >
                  <a
                    href={dashboardRoutes.paymentReceipt(data.paymentId)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Open full page
                  </a>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 border-cp-border sm:w-auto"
                  onClick={() => onOpenChange(false)}
                >
                  <X className="mr-2 h-4 w-4" />
                  Close
                </Button>
              </div>
              {isDownloading ? (
                <InvoiceDownloadProgress progress={progress} label={label} />
              ) : null}
            </div>
          ) : null}
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto bg-cp-elevated/40 p-4 sm:p-6">
          {isLoading || isFetching ? (
            <div className="flex min-h-[16rem] items-center justify-center">
              <LoadingSpinner label="Loading receipt…" />
            </div>
          ) : error ? (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-8 text-center text-sm text-red-600 dark:text-red-300">
              {error instanceof Error ? error.message : "Could not load receipt"}
            </div>
          ) : data ? (
            <div ref={printRef} className="flex justify-center">
              <PaymentInvoiceView invoice={data} className="shadow-lg ring-1 ring-slate-200" />
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
