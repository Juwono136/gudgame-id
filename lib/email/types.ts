export type EmailTemplateId =
  | "verify-email"
  | "reset-password"
  | "password-changed"
  | "welcome"
  | "admin-user-invite"
  | "registration-confirmed"
  | "registration-confirm-participation"
  | "registration-payment-reminder"
  | "registration-team-invite"
  | "registration-cancelled"
  | "host-payment-received"
  | "host-payout-disbursed"
  | "host-payout-failed";

export type VerifyEmailTemplateData = {
  userName: string;
  verifyUrl: string;
  appName: string;
};

export type ResetPasswordTemplateData = {
  userName: string;
  resetUrl: string;
  appName: string;
};

export type WelcomeEmailTemplateData = {
  userName: string;
  dashboardUrl: string;
  appName: string;
};

export type AdminUserInviteTemplateData = {
  userName: string;
  verifyUrl: string;
  temporaryPassword: string;
  loginUrl: string;
  appName: string;
};

export type PasswordChangedTemplateData = {
  userName: string;
  appName: string;
  loginUrl: string;
  changedAt: string;
};

export type RegistrationConfirmedTemplateData = {
  appName: string;
  userName: string;
  tournamentName: string;
  teamName: string;
  sportName: string;
  venue: string | null;
  dateRange: string;
  feePaid: string | null;
  teamMembers: string[];
  tournamentUrl: string;
  receiptUrl: string;
  paymentsUrl: string;
  invoiceNumber: string | null;
  amountPaidFormatted: string | null;
  paidAtFormatted: string | null;
};

export type RegistrationConfirmParticipationTemplateData = {
  appName: string;
  userName: string;
  tournamentName: string;
  teamName: string;
  sportName: string;
  confirmUrl: string;
  tournamentUrl: string;
  deadlineHours: number;
};

export type RegistrationPaymentReminderTemplateData = {
  appName: string;
  userName: string;
  tournamentName: string;
  teamName: string;
  sportName: string;
  amountFormatted: string;
  checkoutUrl: string;
  tournamentUrl: string;
  paymentDeadlineHours: number;
};

export type RegistrationTeamInviteTemplateData = {
  appName: string;
  userName: string;
  captainName: string;
  tournamentName: string;
  teamName: string;
  sportName: string;
  tournamentUrl: string;
};

export type RegistrationCancelledTemplateData = {
  appName: string;
  userName: string;
  tournamentName: string;
  teamName: string;
  sportName: string;
  tournamentUrl: string;
  reason: string;
  canReRegister: boolean;
};

export type HostPaymentReceivedTemplateData = {
  appName: string;
  hostName: string;
  playerName: string;
  playerEmail: string | null;
  tournamentName: string;
  teamName: string;
  sportName: string;
  amountCollectedFormatted: string;
  platformFeeFormatted: string;
  hostPayoutFormatted: string;
  invoiceNumber: string | null;
  paidAtFormatted: string | null;
  receiptUrl: string;
  ledgerUrl: string;
  tournamentWorkspaceUrl: string;
};

export type HostPayoutDisbursedTemplateData = {
  appName: string;
  hostName: string;
  amountFormatted: string;
  paymentCount: number;
  scheduleLabel: string;
  maskedAccount: string;
  bankAccountHolder: string;
  completedAtFormatted: string | null;
  paymentsUrl: string;
};

export type HostPayoutFailedTemplateData = {
  appName: string;
  hostName: string;
  amountFormatted: string;
  maskedAccount: string;
  failureReason: string;
  paymentsUrl: string;
};

export type EmailTemplateDataMap = {
  "verify-email": VerifyEmailTemplateData;
  "reset-password": ResetPasswordTemplateData;
  "password-changed": PasswordChangedTemplateData;
  welcome: WelcomeEmailTemplateData;
  "admin-user-invite": AdminUserInviteTemplateData;
  "registration-confirmed": RegistrationConfirmedTemplateData;
  "registration-confirm-participation": RegistrationConfirmParticipationTemplateData;
  "registration-payment-reminder": RegistrationPaymentReminderTemplateData;
  "registration-team-invite": RegistrationTeamInviteTemplateData;
  "registration-cancelled": RegistrationCancelledTemplateData;
  "host-payment-received": HostPaymentReceivedTemplateData;
  "host-payout-disbursed": HostPayoutDisbursedTemplateData;
  "host-payout-failed": HostPayoutFailedTemplateData;
};

export type SendTemplatedEmailInput<T extends EmailTemplateId> = {
  to: string;
  template: T;
  data: EmailTemplateDataMap[T];
  subject?: string;
};
