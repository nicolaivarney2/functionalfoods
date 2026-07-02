/**
 * Server-side transactional email via Resend.
 * @see https://resend.com/docs/api-reference/emails/send-email
 */

const RESEND_BASE = 'https://api.resend.com/emails'

export type SendEmailResult = { ok: true; id?: string } | { ok: false; error: string }

export async function sendTransactionalEmail(input: {
  to: string | string[]
  subject: string
  text: string
  replyTo?: string
}): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim()
  if (!apiKey) {
    return { ok: false, error: 'RESEND_API_KEY er ikke sat' }
  }

  const from =
    process.env.RESEND_FROM_EMAIL?.trim() ||
    'Functional Foods <feedback@functionalfoods.dk>'

  const res = await fetch(RESEND_BASE, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: input.to,
      subject: input.subject,
      text: input.text,
      ...(input.replyTo ? { reply_to: input.replyTo } : {}),
    }),
  })

  const data = (await res.json().catch(() => ({}))) as { id?: string; message?: string }

  if (!res.ok) {
    return { ok: false, error: data.message || res.statusText || 'Kunne ikke sende e-mail' }
  }

  return { ok: true, id: data.id }
}
