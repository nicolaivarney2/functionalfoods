import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import type { NextRequest } from 'next/server'
import type { User } from '@supabase/supabase-js'

/**
 * Bruger fra Authorization: Bearer <access_token> (anbefalet fra klient efter login)
 * eller fra Supabase-auth cookies.
 */
export async function getAuthenticatedUser(request: NextRequest): Promise<User | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !anonKey) return null

  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.replace('Bearer ', '')
    // Service role foretrækkes; anon virker også til getUser(jwt) (fx når SERVICE_ROLE_KEY ikke er sat i miljøet).
    const key = serviceKey || anonKey
    if (key) {
      const supabase = createClient(supabaseUrl, key)
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser(token)
      if (!error && user) return user
    }
  }

  const cookieStore = await cookies()
  const supabaseCookie = createServerClient(supabaseUrl, anonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value
      },
      set() {},
      remove() {},
    },
  })
  const {
    data: { user },
    error,
  } = await supabaseCookie.auth.getUser()
  if (!error && user) return user

  return null
}
