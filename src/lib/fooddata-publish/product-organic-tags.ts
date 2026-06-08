import type { SupabaseClient } from '@supabase/supabase-js'
import {
  normalizeProductOrganicTags,
  type ProductOrganicTagId,
} from '@/lib/madbudget/organic-preference'
import {
  FOODDATA_PUBLISH_SOURCE,
  type FooddataCurationSource,
} from './config'

export function mergeOrganicTagArrays(
  a: ProductOrganicTagId[],
  b: ProductOrganicTagId[]
): ProductOrganicTagId[] {
  return Array.from(new Set([...a, ...b]))
}

export async function upsertProductOrganicTagsInFooddata(
  client: SupabaseClient,
  productExternalId: string,
  organicTags: unknown,
  source: FooddataCurationSource = FOODDATA_PUBLISH_SOURCE
): Promise<void> {
  const now = new Date().toISOString()
  const tags = normalizeProductOrganicTags(organicTags)

  const { error } = await client.from('product_organic_tags').upsert(
    {
      product_external_id: productExternalId,
      organic_tags: tags,
      source,
      synced_at: now,
      updated_at: now,
    },
    { onConflict: 'product_external_id' }
  )

  if (error) throw new Error(`upsertProductOrganicTagsInFooddata: ${error.message}`)
}

export async function upsertProductOrganicTagsBatchInFooddata(
  client: SupabaseClient,
  rows: Array<{ product_external_id: string; organic_tags: unknown }>,
  batchSize = 200,
  source: FooddataCurationSource = FOODDATA_PUBLISH_SOURCE
): Promise<number> {
  const now = new Date().toISOString()
  let upserted = 0

  for (let i = 0; i < rows.length; i += batchSize) {
    const chunk = rows.slice(i, i + batchSize).map((row) => ({
      product_external_id: row.product_external_id,
      organic_tags: normalizeProductOrganicTags(row.organic_tags),
      source,
      synced_at: now,
      updated_at: now,
    }))

    const { error } = await client
      .from('product_organic_tags')
      .upsert(chunk, { onConflict: 'product_external_id' })

    if (error) throw new Error(`upsertProductOrganicTagsBatchInFooddata: ${error.message}`)
    upserted += chunk.length
  }

  return upserted
}
