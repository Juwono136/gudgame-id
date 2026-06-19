"use client";

import Image from "next/image";
import { brandAssets, siteConfig } from "@/lib/config";
import { formatIdrDisplay } from "@/lib/format/currency";
import type { PaymentInvoiceDocument } from "@/lib/tournaments/payments/payment-invoice";
import { cn } from "@/lib/utils";

function formatInvoiceDate(iso: string): string {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(new Date(iso));
}

function formatEventDates(startsAt: string | null, endsAt: string | null): string | null {
  if (!startsAt) return null;
  const start = new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(startsAt));
  if (!endsAt) return start;
  const end = new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(endsAt));
  return `${start} – ${end}`;
}

type PaymentInvoiceViewProps = {
  invoice: PaymentInvoiceDocument;
  className?: string;
  id?: string;
};

export function PaymentInvoiceView({ invoice, className, id }: PaymentInvoiceViewProps) {
  const eventDates = formatEventDates(invoice.tournament.startsAt, invoice.tournament.endsAt);
  const showHostBreakdown =
    invoice.viewerRole === "host" || invoice.viewerRole === "admin";

  return (
    <article
      id={id}
      className={cn(
        "mx-auto w-full max-w-[48rem] bg-white text-slate-900 shadow-sm",
        "rounded-none sm:rounded-lg",
        className,
      )}
    >
      <div className="border-b border-slate-200 bg-slate-50 px-6 py-5 sm:px-8 sm:py-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-3">
            <Image
              src={brandAssets.logo}
              alt={siteConfig.name}
              width={40}
              height={40}
              className="h-10 w-10 rounded-lg"
            />
            <div>
              <p className="text-lg font-bold tracking-tight text-slate-900">{invoice.issuer.name}</p>
              <p className="text-xs text-slate-500">Official payment receipt</p>
            </div>
          </div>
          <div className="text-left sm:text-right">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
              Receipt / Invoice
            </p>
            <p className="mt-1 font-mono text-sm font-semibold text-slate-900">{invoice.invoiceNumber}</p>
            <span className="mt-2 inline-flex rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-800">
              Paid
            </span>
          </div>
        </div>
      </div>

      <div className="grid gap-6 px-6 py-6 sm:grid-cols-2 sm:px-8 sm:py-7">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Paid by</p>
          <p className="mt-1.5 text-sm font-semibold text-slate-900">{invoice.payer.name}</p>
          <p className="text-sm text-slate-600">{invoice.payer.email}</p>
          {invoice.teamName ? (
            <p className="mt-2 text-sm text-slate-600">
              Team: <span className="font-medium text-slate-900">{invoice.teamName}</span>
            </p>
          ) : null}
        </div>
        <div className="sm:text-right">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
            Payment details
          </p>
          <p className="mt-1.5 text-sm text-slate-600">
            Paid on{" "}
            <span className="font-medium text-slate-900">{formatInvoiceDate(invoice.paidAt)}</span>
          </p>
          {invoice.paymentMethod ? (
            <p className="mt-1 text-sm text-slate-600">
              Method: <span className="font-medium text-slate-900">{invoice.paymentMethod}</span>
            </p>
          ) : null}
          <p className="mt-1 font-mono text-xs text-slate-500">Payment ID #{invoice.paymentId}</p>
        </div>
      </div>

      <div className="border-y border-slate-200 bg-slate-50/80 px-6 py-5 sm:px-8">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Event</p>
        <p className="mt-1.5 text-base font-semibold text-slate-900">{invoice.tournament.name}</p>
        <p className="mt-1 text-sm capitalize text-slate-600">
          {invoice.tournament.type} tournament · {invoice.tournament.sportSlug}
        </p>
        {eventDates ? <p className="mt-1 text-sm text-slate-600">{eventDates}</p> : null}
        <p className="mt-2 text-sm text-slate-600">
          Organized by{" "}
          <span className="font-medium text-slate-900">{invoice.host.name}</span>
        </p>
      </div>

      <div className="px-6 py-6 sm:px-8">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
              <th className="pb-3 pr-4 font-semibold">Description</th>
              <th className="pb-3 text-right font-semibold">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {invoice.lineItems.map((item) => (
              <tr key={item.label}>
                <td className="py-3 pr-4 text-slate-700">{item.label}</td>
                <td className="py-3 text-right font-medium tabular-nums text-slate-900">
                  {formatIdrDisplay(item.amountIdr)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-slate-900">
              <td className="pt-4 text-base font-bold text-slate-900">Total paid</td>
              <td className="pt-4 text-right text-lg font-bold tabular-nums text-slate-900">
                {formatIdrDisplay(invoice.totalIdr)}
              </td>
            </tr>
          </tfoot>
        </table>

        {showHostBreakdown ? (
          <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
              Settlement breakdown
            </p>
            <dl className="mt-3 space-y-2">
              <div className="flex justify-between gap-4">
                <dt className="text-slate-600">Platform fee</dt>
                <dd className="font-medium tabular-nums text-slate-900">
                  {formatIdrDisplay(invoice.platformFeeIdr)}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-600">Host payout</dt>
                <dd className="font-semibold tabular-nums text-emerald-700">
                  {formatIdrDisplay(invoice.hostPayoutIdr)}
                </dd>
              </div>
            </dl>
          </div>
        ) : null}
      </div>

      <footer className="border-t border-slate-200 px-6 py-5 text-center text-[11px] leading-relaxed text-slate-500 sm:px-8">
        <p>
          This document is issued by {invoice.issuer.name} as proof of payment for tournament
          registration. Keep this receipt for your records.
        </p>
        <p className="mt-2 font-mono text-[10px] text-slate-400">
          Ref: {invoice.invoiceNumber} · Reg #{invoice.registrationId}
        </p>
      </footer>
    </article>
  );
}

/** Minimal print styles injected when saving as PDF via the browser. */
export const PAYMENT_INVOICE_PRINT_STYLES = `
  * { box-sizing: border-box; }
  body { margin: 0; padding: 24px; font-family: system-ui, sans-serif; background: #fff; }
  @media print {
    body { padding: 0; }
  }
`;

export function openPaymentInvoicePrintWindow(
  container: HTMLElement,
  title: string,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const printWindow = window.open("", "_blank", "noopener,noreferrer");
    if (!printWindow) {
      reject(new Error("Pop-up blocked. Allow pop-ups to download the receipt."));
      return;
    }

    const safeTitle = title.replace(/[<>&"]/g, "");

    printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${safeTitle}</title>
        <style>${PAYMENT_INVOICE_PRINT_STYLES}</style>
      </head>
      <body>${container.outerHTML}</body>
    </html>
  `);
    printWindow.document.close();
    printWindow.focus();

    const triggerPrint = () => {
      try {
        printWindow.print();
        resolve();
      } catch (error) {
        reject(error instanceof Error ? error : new Error("Could not open print dialog"));
      }
    };

    if (printWindow.document.readyState === "complete") {
      triggerPrint();
    } else {
      printWindow.onload = triggerPrint;
    }
  });
}
