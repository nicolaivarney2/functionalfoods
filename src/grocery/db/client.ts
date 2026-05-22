import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * Grocery service Supabase clients.
 *
 * IMPORTANT: This connects to a SEPARATE Supabase project ("Fooddata"),
 * fully isolated from the main functionalfoods database.
 * Existing `src/lib/supabase.ts` is untouched.
 */

let secretClient: SupabaseClient | null = null
let publishableClient: SupabaseClient | null = null

/**
 * Server-side client with secret key. Bypasses RLS.
 * Use this for sync workers and admin operations.
 * NEVER expose this in client-side code.
 */
export function getGroceryServiceClient(): SupabaseClient {
  if (secretClient) return secretClient

  const url = process.env.GROCERY_SUPABASE_URL
  const secretKey = process.env.GROCERY_SUPABASE_SECRET_KEY

  if (!url || !secretKey) {
    throw new Error(
      'Missing required env vars: GROCERY_SUPABASE_URL, GROCERY_SUPABASE_SECRET_KEY',
    )
  }

  secretClient = createClient(url, secretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    db: {
      schema: 'public',
    },
  })

  return secretClient
}

/**
 * Read-only client with publishable key. Respects RLS (which currently denies
 * all non-service-role access). Reserved for future public read endpoints.
 */
export function getGroceryPublishableClient(): SupabaseClient {
  if (publishableClient) return publishableClient

  const url = process.env.GROCERY_SUPABASE_URL
  const publishableKey = process.env.GROCERY_SUPABASE_PUBLISHABLE_KEY

  if (!url || !publishableKey) {
    throw new Error(
      'Missing required env vars: GROCERY_SUPABASE_URL, GROCERY_SUPABASE_PUBLISHABLE_KEY',
    )
  }

  publishableClient = createClient(url, publishableKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  return publishableClient
}
