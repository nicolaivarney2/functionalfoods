/**
 * Sender push-beskeder via Expo Push API (https://exp.host/--/api/v2/push/send).
 * Ingen nøgle nødvendig for at sende til Expo-tokens. Batcher i bidder à 100.
 */

export type ExpoPushMessage = {
  to: string
  title: string
  body: string
  data?: Record<string, unknown>
  sound?: 'default' | null
}

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send'
const CHUNK = 100

function isExpoToken(token: string): boolean {
  return token.startsWith('ExponentPushToken[') || token.startsWith('ExpoPushToken[')
}

/** Sender beskeder og returnerer antal accepterede. Fejl logges, ikke kastet. */
export async function sendExpoPush(messages: ExpoPushMessage[]): Promise<number> {
  const valid = messages.filter((m) => isExpoToken(m.to))
  if (valid.length === 0) return 0

  let accepted = 0
  for (let i = 0; i < valid.length; i += CHUNK) {
    const batch = valid.slice(i, i + CHUNK).map((m) => ({ sound: 'default' as const, ...m }))
    try {
      const res = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(batch),
      })
      const json = await res.json().catch(() => null)
      const data = Array.isArray(json?.data) ? json.data : []
      accepted += data.filter((d: any) => d?.status === 'ok').length
    } catch (err) {
      console.error('[expo-push] batch failed:', err)
    }
  }
  return accepted
}
