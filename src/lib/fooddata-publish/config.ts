import { getGroceryServiceClient } from '@/grocery/db/client'
import type { SupabaseClient } from '@supabase/supabase-js'

export type FooddataCurationSource = 'planomo' | 'ff'

export const FOODDATA_PUBLISH_SOURCE: FooddataCurationSource = 'ff'

const FOODDATA_INGREDIENT_UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const FOODDATA_INGREDIENT_LEGACY_REGEX = /^ingredient-\d+-[a-z0-9]+$/i

export function isFooddataShareableIngredientId(id: string | null | undefined): boolean {
  if (typeof id !== 'string') return false
  const trimmed = id.trim()
  return (
    FOODDATA_INGREDIENT_UUID_REGEX.test(trimmed) ||
    FOODDATA_INGREDIENT_LEGACY_REGEX.test(trimmed)
  )
}

export function isFooddataPublishConfigured(): boolean {
  return Boolean(
    process.env.GROCERY_SUPABASE_URL && process.env.GROCERY_SUPABASE_SECRET_KEY
  )
}

export function getFooddataPublishClient(): SupabaseClient {
  return getGroceryServiceClient()
}

export type FooddataPublishResult = {
  ok: boolean
  skipped?: boolean
  error?: string
}

export async function runFooddataPublish(
  label: string,
  fn: (client: SupabaseClient) => Promise<void>
): Promise<FooddataPublishResult> {
  if (!isFooddataPublishConfigured()) {
    return { ok: false, skipped: true, error: 'fooddata_not_configured' }
  }

  try {
    await fn(getFooddataPublishClient())
    return { ok: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(`[fooddata-publish] ${label} failed:`, message)
    return { ok: false, error: message }
  }
}
