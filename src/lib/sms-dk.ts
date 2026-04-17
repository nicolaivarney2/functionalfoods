/**
 * SMS.dk REST API – se https://docs.sms.dk/
 * Kræver SMS_DK_API_KEY i miljø (aldrig i klientkode).
 *
 * `receiver` skal være numerisk (landekode + nummer uden +), jf. sms.dk-eksempler – ikke E.164-streng.
 */

export type SendSmsResult = { ok: true; raw?: unknown } | { ok: false; error: string; status?: number }

/** E.164 eller cifre → heltal som sms.dk forventer (fx +4512345678 → 4512345678). */
export function e164ToSmsDkReceiver(toE164: string): number | null {
  const digits = toE164.replace(/\D/g, '')
  if (digits.length < 8 || digits.length > 15) return null
  const n = Number(digits)
  if (!Number.isFinite(n) || !Number.isSafeInteger(n)) return null
  return n
}

function smsDkBodyIndicatesFailure(parsed: unknown): string | null {
  if (!parsed || typeof parsed !== 'object') return null
  const o = parsed as Record<string, unknown>
  if (o.success === false) {
    const m = o.message
    return typeof m === 'string' ? m : 'SMS blev ikke sendt'
  }
  if (o.error && typeof o.error === 'object') {
    const err = o.error as Record<string, unknown>
    if (typeof err.message === 'string') return err.message
    if (typeof err.code === 'number') return `SMS-gateway fejl (kode ${err.code})`
  }
  return null
}

export async function sendSmsDk(params: { toE164: string; message: string; sender?: string }): Promise<SendSmsResult> {
  const apiKey = process.env.SMS_DK_API_KEY
  const base = (process.env.SMS_DK_API_BASE || 'https://api.sms.dk').replace(/\/$/, '')
  if (!apiKey) {
    return { ok: false, error: 'SMS_DK_API_KEY er ikke sat' }
  }

  const receiver = e164ToSmsDkReceiver(params.toE164)
  if (receiver == null) {
    return { ok: false, error: 'Ugyldigt telefonnummer til SMS-gateway' }
  }

  // API kræver "senderName" (fejl 1003 hvis det mangler). Standard matcher godkendt afsender i sms.dk.
  const rawSender = params.sender || process.env.SMS_DK_SENDER || 'Velia'
  const senderName = rawSender.startsWith('+') ? rawSender.slice(0, 16) : rawSender.slice(0, 11)
  const url = `${base}/v1/sms/send`

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        senderName,
        receiver,
        message: params.message,
      }),
    })

    const text = await res.text()
    let parsed: unknown
    try {
      parsed = JSON.parse(text)
    } catch {
      parsed = text
    }

    if (!res.ok) {
      const fromBody = typeof parsed === 'object' && parsed !== null ? smsDkBodyIndicatesFailure(parsed) : null
      console.error('sms.dk error', res.status, text)
      return {
        ok: false,
        error: fromBody || `SMS-gateway fejl (${res.status})`,
        status: res.status,
      }
    }

    const bizErr = smsDkBodyIndicatesFailure(parsed)
    if (bizErr) {
      console.error('sms.dk afvist i svar', text)
      return { ok: false, error: bizErr, status: res.status }
    }

    return { ok: true, raw: parsed }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Ukendt fejl'
    console.error('sms.dk fetch', e)
    return { ok: false, error: msg }
  }
}
