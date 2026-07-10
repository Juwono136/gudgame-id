"use client";

import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowDownToLine, Banknote, Receipt, Settings2 } from "lucide-react";
import { AdminShell } from "@/components/admin/layout/admin-shell";
import { AdminPaymentFeeSettingsCard } from "@/components/admin/settings/admin-payment-fee-settings-card";
import { HostPayoutBankCard } from "@/components/dashboard/host/host-payout-bank-card";
import { HostPayoutDisbursementsCard } from "@/components/dashboard/host/host-payout-disbursements-card";
import { WorkspaceTabs } from "@/components/dashboard/workspace-tabs";
import { PaymentTransactionsLedger } from "@/components/payments/payment-transactions-ledger";
import { adminRoutes } from "@/lib/constants/routes";
import type { AdminSessionContext } from "@/lib/admin/types";

const ADMIN_PAYMENTS_TABS = [
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
      "Search and review every registration payment across all official tournaments on Gud Game.",
    icon: Receipt,
  },
  {
    id: "fees",
    label: "Fee configuration",
    description:
      "Set platform commission and processing fees applied to every official tournament registration.",
    icon: Settings2,
  },
] as const;

type AdminPaymentsTabId = (typeof ADMIN_PAYMENTS_TABS)[number]["id"];

const DEFAULT_TAB: AdminPaymentsTabId = "accounts";

function isAdminPaymentsTabId(value: string | null): value is AdminPaymentsTabId {
  return ADMIN_PAYMENTS_TABS.some((tab) => tab.id === value);
}

type AdminPaymentSettingsPageProps = {
  context: AdminSessionContext;
};

export function AdminPaymentSettingsPage({ context }: AdminPaymentSettingsPageProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const rawTab = searchParams.get("tab");
  const activeTab = isAdminPaymentsTabId(rawTab) ? rawTab : DEFAULT_TAB;

  const setActiveTab = useCallback(
    (tabId: AdminPaymentsTabId) => {
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

  return (
    <AdminShell
      context={context}
      title="Payment settings"
      breadcrumbs={[
        { label: "Dashboard", href: adminRoutes.home },
        { label: "Payment settings" },
      ]}
    >
      <div className="mx-auto max-w-7xl space-y-5 sm:space-y-6">
        <p className="max-w-3xl text-sm text-cp-muted">
          Track registration revenue, platform fees, and payout status — the same payment tools hosts
          use when running official tournaments, plus platform-wide fee configuration.
        </p>

        <WorkspaceTabs
          tabs={[...ADMIN_PAYMENTS_TABS]}
          activeId={activeTab}
          onChange={(id) => {
            if (isAdminPaymentsTabId(id)) setActiveTab(id);
          }}
        >
          {activeTab === "accounts" ? <HostPayoutBankCard embedded /> : null}
          {activeTab === "payouts" ? <HostPayoutDisbursementsCard embedded /> : null}
          {activeTab === "ledger" ? (
            <PaymentTransactionsLedger
              apiPath="/api/admin/payments/transactions"
              scope="admin"
              showHostColumn
              showPlatformFees
              embedded
            />
          ) : null}
          {activeTab === "fees" ? <AdminPaymentFeeSettingsCard /> : null}
        </WorkspaceTabs>
      </div>
    </AdminShell>
  );
}
