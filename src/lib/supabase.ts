import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Singleton pattern to ensure only one Supabase client instance
let supabaseInstance: SupabaseClient | null = null

export function createSupabaseClient(): SupabaseClient {
  // Return existing instance if available
  if (supabaseInstance) {
    return supabaseInstance
  }
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing required Supabase environment variables')
  }
  
  // Create new instance only once
  supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      // Use consistent storage key to avoid conflicts
      storageKey: 'functionalfoods-auth',
      // Auto refresh tokens
      autoRefreshToken: true,
      // Persist auth state
      persistSession: true,
      // Detect session in URL
      detectSessionInUrl: true
    }
  })
  
  return supabaseInstance
}

// Create a service role client for server-side operations (bypasses RLS)
export function createSupabaseServiceClient(): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  console.log('🔑 Creating service role client...')
  console.log('🔑 Supabase URL:', supabaseUrl ? '✅ Set' : '❌ Missing')
  console.log('🔑 Service Role Key:', supabaseServiceKey ? '✅ Set' : '❌ Missing')
  
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing required Supabase service role environment variables')
  }
  
  console.log('🔑 Service role key length:', supabaseServiceKey.length)
  console.log('🔑 Service role key starts with:', supabaseServiceKey.substring(0, 10) + '...')
  
  const client = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
  
  console.log('🔑 Service role client created successfully')
  return client
}

// Export a default instance for convenience
export const supabase = createSupabaseClient()

// Function to reset client (useful for testing or auth changes)
export function resetSupabaseClient() {
  supabaseInstance = null
} 