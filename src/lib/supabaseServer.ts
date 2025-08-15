import 'server-only'
import { createClient } from '@supabase/supabase-js'

// Create Supabase server client dynamically to avoid build-time issues
export function createSupabaseServerClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://najaxycfjgultwdwffhv.supabase.co'
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'dummy-key-for-build'
  
  // Only throw error if we're actually trying to use the client (not during build)
  if (typeof window === 'undefined' && process.env.NODE_ENV === 'production') {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Supabase server client missing env: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    }
  }
  
  return createClient(supabaseUrl, serviceRoleKey)
}

// Don't create client at build time - only when function is called
// export const supabaseServer = createSupabaseServerClient()


