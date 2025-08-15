import { createClient } from '@supabase/supabase-js'

// Create Supabase client dynamically to avoid build-time issues
export function createSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://najaxycfjgultwdwffhv.supabase.co'
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_7Vz1i0EKTMPNw0ldFMIScQ_qX_iHMKI'
  
  return createClient(supabaseUrl, supabaseAnonKey)
}

// Export a default client for backward compatibility
export const supabase = createSupabaseClient() 