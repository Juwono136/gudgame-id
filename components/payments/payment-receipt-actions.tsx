"use client";

import { useState } from "react";
import Link from "next/link";
import { Download, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PaymentInvoiceDialog } from "@/components/payments/payment-invoice-dialog";
import { dashboardRoutes } from "@/lib/constants/routes";
import { cn } from "@/lib/utils";

type PaymentReceiptActionsProps = {
  paymentId: string | null | undefined;
  className?: string;
  layout?: "row" | "stack";
};

export function PaymentReceiptActions({
  paymentId,
  className,
  layout = "row",
}: PaymentReceiptActionsProps) {
  const [invoiceOpen, setInvoiceOpen] = useState(false);

  if (!paymentId) return null;

  return (
    <>
      <PaymentInvoiceDialog
        paymentId={paymentId}
        open={invoiceOpen}
        onOpenChange={setInvoiceOpen}
      />
      <div
        className={cn(
          "flex w-full gap-2",
          layout === "stack" ? "flex-col" : "flex-col sm:flex-row sm:justify-center",
          className,
        )}
      >
        <Button
          type="button"
          className="h-10 w-full bg-cp-primary hover:bg-cp-primary-light sm:w-auto"
          onClick={() => setInvoiceOpen(true)}
        >
          <FileText className="mr-2 h-4 w-4" />
          View receipt
        </Button>
        <Button
          asChild
          variant="outline"
          className="h-10 w-full border-cp-border sm:w-auto"
        >
          <Link href={dashboardRoutes.paymentReceipt(paymentId)}>
            <Download className="mr-2 h-4 w-4" />
            Open receipt page
          </Link>
        </Button>
      </div>
    </>
  );
}
