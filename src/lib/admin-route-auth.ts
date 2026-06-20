import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSupabaseRouteUser } from '@/lib/supabase-api-user'

/**
 * Verificerer at den kaldende bruger er admin (user_profiles.role in admin/super_admin).
 * Bruger Bearer/cookie via getSupabaseRouteUser og service role til rolleopslag.
 * Returnerer { id, role } ved succes, ellers null.
 */
export async function requireAdmin(
  request: NextRequest
): Promise<{ id: string; role: string } | null> {
  const user = await getSupabaseRouteUser(request)
  if (!user) return null

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null

  const supabase = createClient(url, key)
  const { data, error } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (error || !data) return null
  if (data.role !== 'admin' && data.role !== 'super_admin') return null
  return { id: user.id, role: data.role }
}
