"use client";

import Link from "next/link";
import { useRef } from "react";
import { ArrowLeft, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { InvoiceDownloadProgress } from "@/components/payments/invoice-download-progress";
import { PaymentInvoiceView } from "@/components/payments/payment-invoice-view";
import { dashboardRoutes } from "@/lib/constants/routes";
import { usePaymentInvoiceDownload } from "@/hooks/use-payment-invoice-download";
import type { PaymentInvoiceDocument } from "@/lib/tournaments/payments/payment-invoice";

type PaymentInvoicePageClientProps = {
  invoice: PaymentInvoiceDocument;
  backHref?: string;
  backLabel?: string;
};

export function PaymentInvoicePageClient({
  invoice,
  backHref = dashboardRoutes.payments,
  backLabel = "Back to payments",
}: PaymentInvoicePageClientProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const { download, isDownloading, progress, label } = usePaymentInvoiceDownload();

  const handleDownload = async () => {
    const node = printRef.current?.firstElementChild as HTMLElement | null;
    if (!node) return;

    try {
      await download(node, `Receipt ${invoice.invoiceNumber}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not open print dialog");
    }
  };

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Button asChild variant="ghost" size="sm" className="h-9 w-fit justify-start px-2">
            <Link href={backHref}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              {backLabel}
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
        {isDownloading ? (
          <InvoiceDownloadProgress progress={progress} label={label} />
        ) : null}
      </div>

      <div ref={printRef} className="flex justify-center">
        <PaymentInvoiceView invoice={invoice} className="shadow-lg ring-1 ring-slate-200" />
      </div>
    </div>
  );
}
