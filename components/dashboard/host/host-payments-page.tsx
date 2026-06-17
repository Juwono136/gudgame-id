"use client";

import { useRouter } from "next/navigation";
import { Banknote } from "lucide-react";
import { DashboardWorkspaceShell } from "@/components/dashboard/dashboard-workspace-shell";
import { HostPayoutBankCard } from "@/components/dashboard/host/host-payout-bank-card";
import { PaymentTransactionsLedger } from "@/components/payments/payment-transactions-ledger";
import { dashboardRoutes } from "@/lib/constants/routes";
import type { AppRole } from "@/lib/roles/constants";
import type { PaymentTransactionRow } from "@/lib/tournaments/payments/transaction-types";

type HostPaymentsPageProps = {
  roles: AppRole[];
};

export function HostPaymentsPage({ roles }: HostPaymentsPageProps) {
  const router = useRouter();

  const handlePay = (row: PaymentTransactionRow) => {
    router.push(
      `/sports/${row.sportSlug}/tournaments/${row.tournamentSlug}/register/checkout?registrationId=${row.registrationId}`,
    );
  };

  return (
    <DashboardWorkspaceShell
      roles={roles}
      variant="host"
      title="Tournament payments"
      description="Track registration revenue, platform fees, and payout status for your official events."
      breadcrumbs={[
        { label: "Host", href: dashboardRoutes.host },
        { label: "Payments" },
      ]}
    >
      <HostPayoutBankCard />

      <section>
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-foreground">
          <Banknote className="h-5 w-5 text-cp-primary" />
          Payment ledger
        </h2>
        <PaymentTransactionsLedger
          apiPath="/api/host/payments"
          scope="host"
          onPayPending={handlePay}
        />
      </section>
    </DashboardWorkspaceShell>
  );
}
