import type {
  CurationIngredientTagsDto,
  CurationMatchDto,
  CurationOrganicTagsDto,
  CurationQueueItemDto,
} from './shapes'

interface RawMatch {
  ingredient_id: string
  product_external_id: string
  confidence: number | null
  is_manual: boolean | null
  match_type: string | null
  product_name_snapshot: string | null
  product_store_snapshot: string | null
  last_known_price: number | null
  source: string
  synced_at: string
}

interface RawQueueItem {
  product_id: string
  store_product_id: string
  store_id: string
  product_name_snapshot: string | null
  status: string
  queued_at: string
  resolved_at: string | null
  source: string
  synced_at: string
}

interface RawIngredientTags {
  ingredient_id: string
  food_exclusions: string[] | null
  source: string
  synced_at: string
  updated_at: string
}

interface RawOrganicTags {
  product_external_id: string
  organic_tags: string[] | null
  source: string
  synced_at: string
  updated_at: string
}

export function mapMatch(row: RawMatch): CurationMatchDto {
  return {
    productExternalId: row.product_external_id,
    ingredientId: row.ingredient_id,
    confidence: row.confidence ?? 100,
    isManual: row.is_manual ?? true,
    matchType: row.match_type ?? 'manual',
    productNameSnapshot: row.product_name_snapshot,
    productStoreSnapshot: row.product_store_snapshot,
    lastKnownPrice: row.last_known_price,
    source: row.source as CurationMatchDto['source'],
    syncedAt: row.synced_at,
  }
}

export function mapQueueItem(row: RawQueueItem): CurationQueueItemDto {
  return {
    productId: row.product_id,
    storeProductId: row.store_product_id,
    storeId: row.store_id,
    productNameSnapshot: row.product_name_snapshot,
    status: row.status as CurationQueueItemDto['status'],
    queuedAt: row.queued_at,
    resolvedAt: row.resolved_at,
    source: row.source as CurationQueueItemDto['source'],
    syncedAt: row.synced_at,
  }
}

export function mapIngredientTags(row: RawIngredientTags): CurationIngredientTagsDto {
  return {
    ingredientId: row.ingredient_id,
    foodExclusions: row.food_exclusions ?? [],
    source: row.source as CurationIngredientTagsDto['source'],
    syncedAt: row.synced_at,
    updatedAt: row.updated_at,
  }
}

export function mapOrganicTags(row: RawOrganicTags): CurationOrganicTagsDto {
  return {
    productExternalId: row.product_external_id,
    organicTags: row.organic_tags ?? [],
    source: row.source as CurationOrganicTagsDto['source'],
    syncedAt: row.synced_at,
    updatedAt: row.updated_at,
  }
}
