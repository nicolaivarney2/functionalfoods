import { supabase } from '@/lib/supabase'

/** Authorization header for authenticated API calls from the client. */
export async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) return {}
  return { Authorization: `Bearer ${token}` }
}

export async function authFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
): Promise<Response> {
  const authHeaders = await getAuthHeaders()
  const headers = new Headers(init.headers)
  for (const [key, value] of Object.entries(authHeaders)) {
    headers.set(key, value)
  }
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  return fetch(input, { ...init, headers })
}
