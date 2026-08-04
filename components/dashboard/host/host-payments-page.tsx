"use client";

import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowDownToLine, Banknote, Receipt } from "lucide-react";
import { DashboardWorkspaceShell } from "@/components/dashboard/dashboard-workspace-shell";
import { HostPayoutBankCard } from "@/components/dashboard/host/host-payout-bank-card";
import { HostPayoutDisbursementsCard } from "@/components/dashboard/host/host-payout-disbursements-card";
import { WorkspaceTabs } from "@/components/dashboard/workspace-tabs";
import { PaymentTransactionsLedger } from "@/components/payments/payment-transactions-ledger";
import { dashboardRoutes } from "@/lib/constants/routes";
import type { AppRole } from "@/lib/roles/constants";
import type { PaymentTransactionRow } from "@/lib/tournaments/payments/transaction-types";
import { registrationCheckoutUrl } from "@/lib/tournaments/registration/urls";

const HOST_PAYMENTS_TABS = [
  {
    id: "accounts",
    label: "Payout accounts",
    description:
      "Manage bank accounts and payout schedule. Tournament earnings are transferred to your primary account.",
    icon: Banknote,
  },
  {
    id: "payouts",
    label: "Bank payouts",
    description:
      "Track pending balance, scheduled transfers, and history of disbursements to your bank.",
    icon: ArrowDownToLine,
  },
  {
    id: "ledger",
    label: "Payment ledger",
    description:
      "Search and review every registration payment across your official tournaments.",
    icon: Receipt,
  },
] as const;

type HostPaymentsTabId = (typeof HOST_PAYMENTS_TABS)[number]["id"];

const DEFAULT_TAB: HostPaymentsTabId = "accounts";

function isHostPaymentsTabId(value: string | null): value is HostPaymentsTabId {
  return HOST_PAYMENTS_TABS.some((tab) => tab.id === value);
}

type HostPaymentsPageProps = {
  roles: AppRole[];
};

export function HostPaymentsPage({ roles }: HostPaymentsPageProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const rawTab = searchParams.get("tab");
  const activeTab = isHostPaymentsTabId(rawTab) ? rawTab : DEFAULT_TAB;

  const setActiveTab = useCallback(
    (tabId: HostPaymentsTabId) => {
      const params = new URLSearchParams(searchParams.toString());
      if (tabId === DEFAULT_TAB) {
        params.delete("tab");
      } else {
        params.set("tab", tabId);
      }
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const handlePay = (row: PaymentTransactionRow) => {
    if (!row.registrationId) return;
    router.push(
      registrationCheckoutUrl(
        row.sportSlug,
        row.tournamentSlug,
        row.registrationId,
        row.partnerSlug,
      ),
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
      <WorkspaceTabs
        tabs={[...HOST_PAYMENTS_TABS]}
        activeId={activeTab}
        onChange={(id) => {
          if (isHostPaymentsTabId(id)) setActiveTab(id);
        }}
      >
        {activeTab === "accounts" ? <HostPayoutBankCard embedded /> : null}
        {activeTab === "payouts" ? <HostPayoutDisbursementsCard embedded /> : null}
        {activeTab === "ledger" ? (
          <PaymentTransactionsLedger
            apiPath="/api/host/payments"
            scope="host"
            embedded
            onPayPending={handlePay}
          />
        ) : null}
      </WorkspaceTabs>
    </DashboardWorkspaceShell>
  );
}
