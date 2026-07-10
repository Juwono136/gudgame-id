import { notFound } from "next/navigation";
import { PageShell } from "@/components/layout/page-shell";
import { PaymentInvoicePageClient } from "@/components/payments/payment-invoice-page-client";
import { dashboardRoutes } from "@/lib/constants/routes";
import { parseEntityIdParam } from "@/lib/domain/uuid";
import { requireRoleGuardContext } from "@/lib/auth/role-guard";
import { AppError } from "@/lib/errors";
import { getPaymentInvoiceDocument } from "@/lib/tournaments/payments/payment-invoice";

export const metadata = {
  title: "Payment receipt",
  description: "Official tournament payment receipt on Gud Game.",
};

type PageProps = {
  params: Promise<{ paymentId: string }>;
};

export default async function PaymentReceiptPage({ params }: PageProps) {
  const { userId, roles } = await requireRoleGuardContext();
  const { paymentId: raw } = await params;
  const paymentId = parseEntityIdParam(raw, "payment id");

  let invoice;
  try {
    invoice = await getPaymentInvoiceDocument(paymentId, userId, roles);
  } catch (error) {
    if (error instanceof AppError && (error.statusCode === 404 || error.statusCode === 403)) {
      notFound();
    }
    throw error;
  }

  const backHref =
    invoice.viewerRole === "host"
      ? dashboardRoutes.hostPayments
      : dashboardRoutes.payments;

  const backLabel =
    invoice.viewerRole === "host" ? "Back to payments & payout" : "Back to payments";

  return (
    <PageShell showGridBackground={false}>
      <PaymentInvoicePageClient
        invoice={invoice}
        backHref={backHref}
        backLabel={backLabel}
      />
    </PageShell>
  );
}
