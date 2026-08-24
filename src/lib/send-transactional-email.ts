/**
 * Server-side transactional email via Loops (loops.so).
 *
 * Kræver en publiceret transactional i Loops med data variables:
 *   alertSubject  — emnelinje (sæt også {alertSubject} som Subject i editoren)
 *   alertBody     — brødtekst (plain text)
 *
 * Env: LOOPS_API_KEY (findes allerede) + LOOPS_TRANSACTIONAL_ID (template-id).
 *
 * @see https://loops.so/docs/api-reference/send-transactional-email
 */

const LOOPS_TRANSACTIONAL_URL = 'https://app.loops.so/api/v1/transactional'

export type SendEmailResult = { ok: true; id?: string } | { ok: false; error: string }

export async function sendTransactionalEmail(input: {
  to: string | string[]
  subject: string
  text: string
  replyTo?: string
}): Promise<SendEmailResult> {
  const apiKey = process.env.LOOPS_API_KEY?.trim()
  if (!apiKey) {
    return { ok: false, error: 'LOOPS_API_KEY er ikke sat' }
  }

  const transactionalId = process.env.LOOPS_TRANSACTIONAL_ID?.trim()
  if (!transactionalId) {
    return {
      ok: false,
      error:
        'LOOPS_TRANSACTIONAL_ID er ikke sat — opret en transactional i Loops (alertSubject + alertBody) og sæt ID i Vercel',
    }
  }

  const recipients = (Array.isArray(input.to) ? input.to : [input.to])
    .map((e) => e.trim())
    .filter(Boolean)
  if (recipients.length === 0) {
    return { ok: false, error: 'Ingen modtager' }
  }

  let lastId: string | undefined
  for (const email of recipients) {
    const res = await fetch(LOOPS_TRANSACTIONAL_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        email,
        transactionalId,
        addToAudience: false,
        dataVariables: {
          alertSubject: input.subject,
          alertBody: input.text,
          ...(input.replyTo ? { replyTo: input.replyTo } : {}),
        },
      }),
    })

    const data = (await res.json().catch(() => ({}))) as {
      success?: boolean
      message?: string
      id?: string
    }

    if (res.status === 429) {
      return { ok: false, error: 'Loops rate limit — prøv igen om lidt' }
    }
    if (!res.ok || data.success === false) {
      return {
        ok: false,
        error: data.message || res.statusText || 'Loops kunne ikke sende e-mail',
      }
    }
    lastId = data.id
  }

  return { ok: true, id: lastId }
}
