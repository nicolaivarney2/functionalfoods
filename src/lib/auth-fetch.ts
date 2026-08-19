import { supabase } from '@/lib/supabase'

function assertNotAborted(signal?: AbortSignal) {
  if (signal?.aborted) {
    throw new DOMException('The operation was aborted.', 'AbortError')
  }
}

/** Authorization header for authenticated API calls from the client. */
export async function getAuthHeaders(accessToken?: string): Promise<Record<string, string>> {
  if (accessToken) {
    return { Authorization: `Bearer ${accessToken}` }
  }
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) return {}
  return { Authorization: `Bearer ${token}` }
}

export async function authFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
  accessToken?: string,
): Promise<Response> {
  assertNotAborted(init.signal)
  const authHeaders = await getAuthHeaders(accessToken)
  assertNotAborted(init.signal)
  const headers = new Headers(init.headers)
  for (const [key, value] of Object.entries(authHeaders)) {
    headers.set(key, value)
  }
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  return fetch(input, { ...init, headers })
}
