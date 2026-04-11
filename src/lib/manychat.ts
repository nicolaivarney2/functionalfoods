/**
 * ManyChat REST API (fb namespace). Kræver MANYCHAT_API_KEY i miljø.
 * @see https://api.manychat.com/swagger
 */

const BASE = 'https://api.manychat.com'

type SetFieldInput = { field_id: number; field_value: string | number }

function getApiKey(): string | null {
  const k = process.env.MANYCHAT_API_KEY?.trim()
  return k || null
}

async function postFb<T>(path: string, body: Record<string, unknown>): Promise<{ ok: true; data: T } | { ok: false; status: number; text: string }> {
  const key = getApiKey()
  if (!key) {
    return { ok: false, status: 500, text: 'MANYCHAT_API_KEY missing' }
  }

  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  const text = await res.text()
  if (!res.ok) {
    return { ok: false, status: res.status, text: text.slice(0, 500) }
  }

  try {
    const data = JSON.parse(text) as T & { status?: string }
    if (data && typeof data === 'object' && 'status' in data && data.status && data.status !== 'success') {
      return { ok: false, status: res.status, text: text.slice(0, 500) }
    }
    return { ok: true, data: data as T }
  } catch {
    return { ok: true, data: {} as T }
  }
}

export async function manychatSetCustomFields(
  subscriberId: string,
  fields: SetFieldInput[]
): Promise<{ ok: boolean; error?: string }> {
  if (!fields.length) return { ok: true }
  const sid = /^\d+$/.test(subscriberId) ? Number(subscriberId) : subscriberId
  const result = await postFb<{ status?: string }>('/fb/subscriber/setCustomFields', {
    subscriber_id: sid,
    fields,
  })
  if (!result.ok) {
    return { ok: false, error: result.text }
  }
  return { ok: true }
}

/** Læser numeriske field IDs fra env: MANYCHAT_FIELD_FF_USER_ID, MANYCHAT_FIELD_AGENT_SUMMARY */
export function getConfiguredManychatFieldIds(): {
  ffUserId?: number
  agentSummary?: number
} {
  const u = process.env.MANYCHAT_FIELD_FF_USER_ID
  const s = process.env.MANYCHAT_FIELD_AGENT_SUMMARY
  return {
    ffUserId: u ? parseInt(u, 10) : undefined,
    agentSummary: s ? parseInt(s, 10) : undefined,
  }
}

const SYNC_COOLDOWN_MS = 5 * 60 * 1000

export function shouldSyncManychatContext(lastSyncedAt: string | null | undefined): boolean {
  if (!lastSyncedAt) return true
  const t = new Date(lastSyncedAt).getTime()
  if (Number.isNaN(t)) return true
  return Date.now() - t >= SYNC_COOLDOWN_MS
}
