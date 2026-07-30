import { redirect } from "next/navigation";
import { PartnerPageHeader } from "@/components/partners/partner-page-header";
import { PaymentTransactionsLedger } from "@/components/payments/payment-transactions-ledger";
import { dashboardRoutes } from "@/lib/constants/routes";
import { partnerPageClass } from "@/lib/partners/layout";
import { requirePartnerWorkspace } from "@/lib/partners/session";

export const metadata = {
  title: "Partner payments",
};

export default async function PartnerPaymentsPage() {
  try {
    await requirePartnerWorkspace();
  } catch {
    redirect(dashboardRoutes.partner);
  }

  return (
    <div className={partnerPageClass("space-y-5 py-8")}>
      <PartnerPageHeader
        backHref={dashboardRoutes.partner}
        backLabel="Partner dashboard"
        title="Payments"
        description="Registration payments collected across your tournaments, with receipts you can print or save as PDF."
      />

      <PaymentTransactionsLedger apiPath="/api/partner/payments" scope="partner" embedded />
    </div>
  );
}
