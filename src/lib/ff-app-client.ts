/**
 * Skelner Functional Foods native app (Expo) fra almindelig web.
 * Bruges bl.a. til at skjule web-kommentarer i app-kontekst.
 */

export const FF_APP_CLIENT_HEADER = 'x-ff-client'
export const FF_APP_CLIENT_VALUE = 'app'

export function isFfAppUserAgent(userAgent: string | null | undefined): boolean {
  if (!userAgent) return false
  return (
    /FunctionalFoodsApp/i.test(userAgent) ||
    /FFApp\//i.test(userAgent) ||
    (/Expo/i.test(userAgent) && /FunctionalFoods/i.test(userAgent))
  )
}

export function isFfAppClient(input: {
  ffClientHeader?: string | null
  ffClientQuery?: string | null
  userAgent?: string | null
}): boolean {
  if (input.ffClientHeader?.trim().toLowerCase() === FF_APP_CLIENT_VALUE) return true
  if (input.ffClientQuery?.trim().toLowerCase() === FF_APP_CLIENT_VALUE) return true
  return isFfAppUserAgent(input.userAgent)
}

export function isFfAppClientFromHeaders(headers: Headers): boolean {
  return isFfAppClient({
    ffClientHeader: headers.get(FF_APP_CLIENT_HEADER),
    userAgent: headers.get('user-agent'),
  })
}
