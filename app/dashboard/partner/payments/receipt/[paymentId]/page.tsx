import { notFound, redirect } from "next/navigation";
import { PaymentInvoicePageClient } from "@/components/payments/payment-invoice-page-client";
import { dashboardRoutes } from "@/lib/constants/routes";
import { parseEntityIdParam } from "@/lib/domain/uuid";
import { AppError } from "@/lib/errors";
import { requirePartnerWorkspace } from "@/lib/partners/session";
import { getPartnerPaymentInvoiceDocument } from "@/lib/tournaments/payments/payment-invoice";

export const metadata = {
  title: "Payment receipt",
  description: "Official tournament payment receipt.",
};

type PageProps = {
  params: Promise<{ paymentId: string }>;
};

export default async function PartnerPaymentReceiptPage({ params }: PageProps) {
  let workspace;
  try {
    workspace = await requirePartnerWorkspace();
  } catch {
    redirect(dashboardRoutes.partner);
  }

  const { paymentId: raw } = await params;
  const paymentId = parseEntityIdParam(raw, "payment id");

  let invoice;
  try {
    invoice = await getPartnerPaymentInvoiceDocument(paymentId, workspace.partner.id);
  } catch (error) {
    if (error instanceof AppError && (error.statusCode === 404 || error.statusCode === 403)) {
      notFound();
    }
    throw error;
  }

  return (
    <PaymentInvoicePageClient
      invoice={invoice}
      backHref={dashboardRoutes.partnerPayments}
      backLabel="Back to payments"
    />
  );
}
