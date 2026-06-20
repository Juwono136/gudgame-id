"use client";

import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ClipboardList, Receipt } from "lucide-react";
import { DashboardWorkspaceShell } from "@/components/dashboard/dashboard-workspace-shell";
import { PlayerRegistrationsPanel } from "@/components/dashboard/player/player-registrations-panel";
import { WorkspaceTabs } from "@/components/dashboard/workspace-tabs";
import { PaymentTransactionsLedger } from "@/components/payments/payment-transactions-ledger";
import { dashboardRoutes } from "@/lib/constants/routes";
import type { AppRole } from "@/lib/roles/constants";
import type { PaymentTransactionRow } from "@/lib/tournaments/payments/transaction-types";

const PLAYER_PAYMENTS_TABS = [
  {
    id: "ledger",
    label: "Payment ledger",
    description:
      "Search invoices and receipts for every official tournament registration you have paid or started.",
    icon: Receipt,
  },
  {
    id: "registrations",
    label: "My registrations",
    description:
      "Tournaments you have joined — official events and reclub sessions, with status and quick actions.",
    icon: ClipboardList,
  },
] as const;

type PlayerPaymentsTabId = (typeof PLAYER_PAYMENTS_TABS)[number]["id"];

const DEFAULT_TAB: PlayerPaymentsTabId = "ledger";

function isPlayerPaymentsTabId(value: string | null): value is PlayerPaymentsTabId {
  return PLAYER_PAYMENTS_TABS.some((tab) => tab.id === value);
}

type PlayerPaymentsPageProps = {
  roles: AppRole[];
};

export function PlayerPaymentsPage({ roles }: PlayerPaymentsPageProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const rawTab = searchParams.get("tab");
  const activeTab = isPlayerPaymentsTabId(rawTab) ? rawTab : DEFAULT_TAB;

  const setActiveTab = useCallback(
    (tabId: PlayerPaymentsTabId) => {
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
    router.push(
      `/sports/${row.sportSlug}/tournaments/${row.tournamentSlug}/register/checkout?registrationId=${row.registrationId}`,
    );
  };

  return (
    <DashboardWorkspaceShell
      roles={roles}
      variant="player"
      title="Payments"
      description="Official tournament invoices, receipts, and your registration history."
      breadcrumbs={[
        { label: "Overview", href: dashboardRoutes.home },
        { label: "Payments" },
      ]}
    >
      <WorkspaceTabs
        tabs={[...PLAYER_PAYMENTS_TABS]}
        activeId={activeTab}
        onChange={(id) => {
          if (isPlayerPaymentsTabId(id)) setActiveTab(id);
        }}
      >
        {activeTab === "ledger" ? (
          <PaymentTransactionsLedger
            apiPath="/api/account/player/payments"
            scope="player"
            embedded
            onPayPending={handlePay}
          />
        ) : null}
        {activeTab === "registrations" ? <PlayerRegistrationsPanel /> : null}
      </WorkspaceTabs>
    </DashboardWorkspaceShell>
  );
}
