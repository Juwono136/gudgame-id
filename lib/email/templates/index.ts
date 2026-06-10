import type {
  EmailTemplateDataMap,
  EmailTemplateId,
  SendTemplatedEmailInput,
} from "@/lib/email/types";
import { renderAdminUserInviteTemplate } from "./admin-user-invite";
import { renderRegistrationConfirmedTemplate } from "./registration-confirmed";
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
    case "welcome":
      throw new Error("Welcome email template is not implemented yet");
    default: {
      const _exhaustive: never = input.template;
      throw new Error(`Unknown email template: ${_exhaustive}`);
    }
  }
}
