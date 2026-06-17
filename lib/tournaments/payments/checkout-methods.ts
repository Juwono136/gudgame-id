export const CHECKOUT_PAYMENT_METHODS = [
  { id: "qris", label: "QRIS", description: "Scan with any e-wallet or banking app" },
  {
    id: "bank_transfer",
    label: "Bank transfer",
    description: "Virtual account — transfer from your bank",
  },
  { id: "ewallet", label: "E-Wallet", description: "OVO, DANA, ShopeePay, LinkAja" },
  { id: "card", label: "Credit / debit card", description: "Visa, Mastercard, JCB" },
] as const;

export type CheckoutPaymentMethod = (typeof CHECKOUT_PAYMENT_METHODS)[number]["id"];

export type PaymentInstructions = {
  method: CheckoutPaymentMethod;
  amountIdr: number;
  expiresAt: string | null;
  qris?: { qrString: string; qrId: string };
  bankTransfer?: { accountNumber: string; bankCode: string; accountName: string };
  ewalletRedirectUrl?: string;
};
