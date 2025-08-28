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

// Export a default instance for convenience
export const supabase = createSupabaseClient()

// Function to reset client (useful for testing or auth changes)
export function resetSupabaseClient() {
  supabaseInstance = null
} 