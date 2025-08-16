import 'server-only'
import { createClient } from '@supabase/supabase-js'

// Create Supabase server client dynamically to avoid build-time issues
export function createSupabaseServerClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing required Supabase environment variables')
  }
  
  return createClient(supabaseUrl, serviceRoleKey)
}

// Don't create client at build time - only when function is called
// export const supabaseServer = createSupabaseServerClient()


