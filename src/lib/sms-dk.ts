/**
 * SMS.dk REST API – se https://docs.sms.dk/
 * Kræver SMS_DK_API_KEY i miljø (aldrig i klientkode).
 */

export type SendSmsResult = { ok: true; raw?: unknown } | { ok: false; error: string; status?: number }

export async function sendSmsDk(params: { toE164: string; message: string; sender?: string }): Promise<SendSmsResult> {
  const apiKey = process.env.SMS_DK_API_KEY
  const base = (process.env.SMS_DK_API_BASE || 'https://api.sms.dk').replace(/\/$/, '')
  if (!apiKey) {
    return { ok: false, error: 'SMS_DK_API_KEY er ikke sat' }
  }

  // API kræver "senderName" (fejl 1003 hvis det mangler). Standard matcher godkendt afsender i sms.dk.
  const raw = params.sender || process.env.SMS_DK_SENDER || 'Velia'
  const senderName = raw.startsWith('+') ? raw.slice(0, 16) : raw.slice(0, 11)
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
        receiver: params.toE164,
        message: params.message,
      }),
    })

    const text = await res.text()
    let raw: unknown
    try {
      raw = JSON.parse(text)
    } catch {
      raw = text
    }

    if (!res.ok) {
      console.error('sms.dk error', res.status, text)
      return { ok: false, error: `SMS-gateway fejl (${res.status})`, status: res.status }
    }

    return { ok: true, raw }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Ukendt fejl'
    console.error('sms.dk fetch', e)
    return { ok: false, error: msg }
  }
}
