import type { SupabaseClient } from '@supabase/supabase-js'
import {
  FOODDATA_PUBLISH_SOURCE,
  isFooddataShareableIngredientId,
  type FooddataCurationSource,
} from './config'

export type ProductIngredientMatchRow = {
  ingredient_id: string
  product_external_id: string
  confidence?: number | null
  match_type?: string | null
  is_manual?: boolean | null
  product_name_snapshot?: string | null
  product_store_snapshot?: string | null
  last_known_price?: number | null
  created_at?: string | null
  updated_at?: string | null
}

function toFooddataMatchRow(
  row: ProductIngredientMatchRow,
  source: FooddataCurationSource = FOODDATA_PUBLISH_SOURCE
) {
  const now = new Date().toISOString()
  return {
    ingredient_id: row.ingredient_id,
    product_external_id: row.product_external_id,
    confidence: row.confidence ?? 100,
    match_type: row.match_type ?? 'manual',
    is_manual: row.is_manual ?? true,
    product_name_snapshot: row.product_name_snapshot ?? null,
    product_store_snapshot: row.product_store_snapshot ?? null,
    last_known_price: row.last_known_price ?? null,
    source,
    synced_at: now,
    created_at: row.created_at ?? now,
    updated_at: row.updated_at ?? now,
  }
}

export async function upsertMatchInFooddata(
  client: SupabaseClient,
  row: ProductIngredientMatchRow,
  source: FooddataCurationSource = FOODDATA_PUBLISH_SOURCE
): Promise<void> {
  if (!isFooddataShareableIngredientId(row.ingredient_id)) return

  const payload = toFooddataMatchRow(row, source)
  const { error } = await client
    .from('product_ingredient_matches')
    .upsert(payload, { onConflict: 'product_external_id,ingredient_id' })

  if (error) throw new Error(`upsertMatchInFooddata: ${error.message}`)
}

export async function deleteMatchInFooddata(
  client: SupabaseClient,
  ingredientId: string,
  productExternalId: string,
  source: FooddataCurationSource = FOODDATA_PUBLISH_SOURCE
): Promise<void> {
  const { error } = await client
    .from('product_ingredient_matches')
    .delete()
    .eq('ingredient_id', ingredientId)
    .eq('product_external_id', productExternalId)
    .eq('source', source)

  if (error) throw new Error(`deleteMatchInFooddata: ${error.message}`)
}

export async function upsertMatchesBatchInFooddata(
  client: SupabaseClient,
  rows: ProductIngredientMatchRow[],
  batchSize = 200,
  source: FooddataCurationSource = FOODDATA_PUBLISH_SOURCE
): Promise<number> {
  const shareable = rows.filter((r) => isFooddataShareableIngredientId(r.ingredient_id))
  let upserted = 0
  for (let i = 0; i < shareable.length; i += batchSize) {
    const chunk = shareable.slice(i, i + batchSize).map((r) => toFooddataMatchRow(r, source))
    const { error } = await client
      .from('product_ingredient_matches')
      .upsert(chunk, { onConflict: 'product_external_id,ingredient_id' })
    if (error) throw new Error(`upsertMatchesBatchInFooddata: ${error.message}`)
    upserted += chunk.length
  }
  return upserted
}
