import type { SupabaseClient } from '@supabase/supabase-js'
import { parseIngredientTags } from '@/lib/dietary-exclusions'
import {
  FOODDATA_PUBLISH_SOURCE,
  isFooddataShareableIngredientId,
  type FooddataCurationSource,
} from './config'

export async function upsertIngredientTagsInFooddata(
  client: SupabaseClient,
  ingredientId: string,
  exclusions: unknown,
  source: FooddataCurationSource = FOODDATA_PUBLISH_SOURCE
): Promise<void> {
  if (!isFooddataShareableIngredientId(ingredientId)) return

  const parsed = parseIngredientTags(exclusions)
  const now = new Date().toISOString()

  const { error } = await client.from('ingredient_dietary_tags').upsert(
    {
      ingredient_id: ingredientId,
      food_exclusions: parsed.foodExclusions,
      source,
      synced_at: now,
      updated_at: now,
    },
    { onConflict: 'ingredient_id' }
  )

  if (error) throw new Error(`upsertIngredientTagsInFooddata: ${error.message}`)
}

export async function upsertIngredientTagsBatchInFooddata(
  client: SupabaseClient,
  rows: Array<{ ingredient_id: string; exclusions: unknown }>,
  batchSize = 200,
  source: FooddataCurationSource = FOODDATA_PUBLISH_SOURCE
): Promise<number> {
  const shareable = rows.filter((row) => isFooddataShareableIngredientId(row.ingredient_id))
  const now = new Date().toISOString()
  let upserted = 0

  for (let i = 0; i < shareable.length; i += batchSize) {
    const chunk = shareable.slice(i, i + batchSize).map((row) => {
      const parsed = parseIngredientTags(row.exclusions)
      return {
        ingredient_id: row.ingredient_id,
        food_exclusions: parsed.foodExclusions,
        source,
        synced_at: now,
        updated_at: now,
      }
    })

    const { error } = await client
      .from('ingredient_dietary_tags')
      .upsert(chunk, { onConflict: 'ingredient_id' })

    if (error) throw new Error(`upsertIngredientTagsBatchInFooddata: ${error.message}`)
    upserted += chunk.length
  }

  return upserted
}
