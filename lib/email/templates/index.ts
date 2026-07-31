import type {
  EmailTemplateDataMap,
  EmailTemplateId,
  SendTemplatedEmailInput,
} from "@/lib/email/types";
import { renderAdminUserInviteTemplate } from "./admin-user-invite";
import { renderRegistrationConfirmedTemplate } from "./registration-confirmed";
import { renderRegistrationConfirmParticipationTemplate } from "./registration-confirm-participation";
import { renderRegistrationPaymentReminderTemplate } from "./registration-payment-reminder";
import { renderRegistrationTeamInviteTemplate } from "./registration-team-invite";
import { renderRegistrationCancelledTemplate } from "./registration-cancelled";
import { renderHostPaymentReceivedTemplate } from "./host-payment-received";
import { renderHostPayoutDisbursedTemplate } from "./host-payout-disbursed";
import { renderHostPayoutFailedTemplate } from "./host-payout-failed";
import { renderPartnerRegistrationPaymentTemplate } from "./partner-registration-payment";
import { renderPartnerRegistrationConfirmedTemplate } from "./partner-registration-confirmed";
import { renderPartnerRoleAssignedTemplate } from "./partner-role-assigned";
import { renderVerifyEmailTemplate } from "./verify-email";
import { renderResetPasswordTemplate } from "./reset-password";
import { renderPasswordChangedTemplate } from "./password-changed";

export function renderEmailTemplate<T extends EmailTemplateId>(
  input: SendTemplatedEmailInput<T>,
): { subject: string; html: string; text: string } {
  switch (input.template) {
    case "verify-email":
      return renderVerifyEmailTemplate(
        input.data as EmailTemplateDataMap["verify-email"],
      );
    case "reset-password":
      return renderResetPasswordTemplate(
        input.data as EmailTemplateDataMap["reset-password"],
      );
    case "password-changed":
      return renderPasswordChangedTemplate(
        input.data as EmailTemplateDataMap["password-changed"],
      );
    case "admin-user-invite":
      return renderAdminUserInviteTemplate(
        input.data as EmailTemplateDataMap["admin-user-invite"],
      );
    case "registration-confirmed":
      return renderRegistrationConfirmedTemplate(
        input.data as EmailTemplateDataMap["registration-confirmed"],
      );
    case "registration-confirm-participation":
      return renderRegistrationConfirmParticipationTemplate(
        input.data as EmailTemplateDataMap["registration-confirm-participation"],
      );
    case "registration-payment-reminder":
      return renderRegistrationPaymentReminderTemplate(
        input.data as EmailTemplateDataMap["registration-payment-reminder"],
      );
    case "registration-team-invite":
      return renderRegistrationTeamInviteTemplate(
        input.data as EmailTemplateDataMap["registration-team-invite"],
      );
    case "registration-cancelled":
      return renderRegistrationCancelledTemplate(
        input.data as EmailTemplateDataMap["registration-cancelled"],
      );
    case "host-payment-received":
      return renderHostPaymentReceivedTemplate(
        input.data as EmailTemplateDataMap["host-payment-received"],
      );
    case "host-payout-disbursed":
      return renderHostPayoutDisbursedTemplate(
        input.data as EmailTemplateDataMap["host-payout-disbursed"],
      );
    case "host-payout-failed":
      return renderHostPayoutFailedTemplate(
        input.data as EmailTemplateDataMap["host-payout-failed"],
      );
    case "partner-registration-payment":
      return renderPartnerRegistrationPaymentTemplate(
        input.data as EmailTemplateDataMap["partner-registration-payment"],
      );
    case "partner-registration-confirmed":
      return renderPartnerRegistrationConfirmedTemplate(
        input.data as EmailTemplateDataMap["partner-registration-confirmed"],
      );
    case "partner-role-assigned":
      return renderPartnerRoleAssignedTemplate(
        input.data as EmailTemplateDataMap["partner-role-assigned"],
      );
    case "welcome":
      throw new Error("Welcome email template is not implemented yet");
    default: {
      const _exhaustive: never = input.template;
      throw new Error(`Unknown email template: ${_exhaustive}`);
    }
  }
}
