/**
 * Ops-alerts (grocery-sync fejl + dagligvarer morning report).
 * Sender via Loops — se send-transactional-email.ts.
 */

import { sendTransactionalEmail } from '@/lib/send-transactional-email'

const DEFAULT_TO = 'nicolai@functionalfoods.dk'

export function opsAlertEmail(): string {
  return process.env.FEEDBACK_TO_EMAIL?.trim() || DEFAULT_TO
}

export async function sendDagligvarerOpsEmail(input: {
  subject: string
  text: string
}): Promise<{ ok: true; id?: string } | { ok: false; error: string }> {
  return sendTransactionalEmail({
    to: opsAlertEmail(),
    subject: input.subject,
    text: input.text,
  })
}
