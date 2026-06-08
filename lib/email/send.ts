import "server-only";
import type { EmailTemplateId, SendTemplatedEmailInput } from "./types";
import { renderEmailTemplate } from "./templates";
import { sendRawEmail } from "./transport";

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
