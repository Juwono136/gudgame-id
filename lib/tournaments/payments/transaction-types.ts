export type PaymentTransactionRow = {
  paymentId: string;
  /** Gud Game official registration — null for partner guest payments. */
  registrationId: string | null;
  /** Partner guest registration — null for Gud Game official payments. */
  partnerRegistrationId: string | null;
  tournamentId: string;
  tournamentName: string;
  sportSlug: string;
  sportName: string;
  tournamentSlug: string;
  tournamentType: string;
  /** Set when the event belongs to a white-label partner tenant. */
  partnerSlug: string | null;
  teamName: string | null;
  /** Null for partner guest payments (no Gud Game account). */
  payerUserId: string | null;
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
