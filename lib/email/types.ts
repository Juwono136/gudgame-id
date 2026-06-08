export type EmailTemplateId =
  | "verify-email"
  | "reset-password"
  | "welcome"
  | "admin-user-invite";

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

export type EmailTemplateDataMap = {
  "verify-email": VerifyEmailTemplateData;
  "reset-password": ResetPasswordTemplateData;
  welcome: WelcomeEmailTemplateData;
  "admin-user-invite": AdminUserInviteTemplateData;
};

export type SendTemplatedEmailInput<T extends EmailTemplateId> = {
  to: string;
  template: T;
  data: EmailTemplateDataMap[T];
  subject?: string;
};
