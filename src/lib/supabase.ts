import { createClient } from '@supabase/supabase-js'

// Create Supabase client dynamically to avoid build-time issues
export function createSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing required Supabase environment variables')
  }
  
  return createClient(supabaseUrl, supabaseAnonKey)
}

// Don't create client at build time - only when function is called
// export const supabase = createSupabaseClient() 