export type PaymentTransactionRow = {
  paymentId: string;
  registrationId: string;
  tournamentId: string;
  tournamentName: string;
  sportSlug: string;
  sportName: string;
  tournamentSlug: string;
  tournamentType: string;
  teamName: string | null;
  payerUserId: string;
  payerName: string | null;
  hostUserId: string | null;
  hostName: string | null;
  amountIdr: number;
  platformFeeIdr: number;
  hostPayoutIdr: number;
  processingFeeIdr: number;
  status: string;
  hostPayoutStatus: string | null;
  paymentMethod: string | null;
  xenditExternalId: string | null;
  paidAt: string | null;
  createdAt: string;
};

export type TransactionQueryResult = {
  items: PaymentTransactionRow[];
  total: number;
  summary: {
    totalCollectedIdr: number;
    totalPlatformFeesIdr: number;
    totalHostPayoutIdr: number;
    paidCount: number;
    pendingCount: number;
    expiredCount: number;
    failedCount: number;
  };
};
