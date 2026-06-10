import "server-only";
import type { EmailTemplateId, SendTemplatedEmailInput } from "./types";
import { renderEmailTemplate } from "./templates";
import { sendRawEmail } from "./transport";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "email" });

export async function sendTemplatedEmail<T extends EmailTemplateId>(
  input: SendTemplatedEmailInput<T>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const rendered = renderEmailTemplate(input);
  return sendRawEmail({
    to: input.to,
    subject: input.subject ?? rendered.subject,
    html: rendered.html,
    text: rendered.text,
  });
}

/** Fire-and-forget — use when the user-facing action must not wait on SMTP. */
export function sendTemplatedEmailInBackground<T extends EmailTemplateId>(
  input: SendTemplatedEmailInput<T>,
  context?: { module: string },
): void {
  void sendTemplatedEmail(input).then((result) => {
    if (!result.ok) {
      log.warn("Background email failed", {
        module: context?.module ?? "email",
        to: input.to,
        template: input.template,
        error: result.error,
      });
    }
  });
}
