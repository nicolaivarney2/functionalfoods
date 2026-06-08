import type { SupabaseClient } from '@supabase/supabase-js'
import { FOODDATA_STORE_IDS, mapStoreIdToDisplayName } from './fooddata-stores'

export type ProductMatchSnapshot = {
  product_name_snapshot: string | null
  product_store_snapshot: string | null
  last_known_price: number | null
}

export function parseFooddataProductId(
  productId: string
): { source_chain: string; source_id: string } | null {
  const id = productId.trim()
  if (!id) return null

  const chains = [...FOODDATA_STORE_IDS].sort((a, b) => b.length - a.length)
  for (const chain of chains) {
    const prefix = `${chain}-`
    if (id.startsWith(prefix)) {
      const source_id = id.slice(prefix.length)
      if (source_id) return { source_chain: chain, source_id }
    }
  }
  return null
}

/** True when id is a canonical fooddata key (`bilka-110606`, `rema-1000-306872`, …). */
export function isFooddataProductExternalId(productId: string | null | undefined): boolean {
  if (!productId) return false
  return parseFooddataProductId(productId) !== null
}

export async function resolveProductMatchSnapshot(
  supabase: SupabaseClient,
  productExternalId: string,
  hints?: { name?: string; store?: string; price?: number }
): Promise<ProductMatchSnapshot> {
  if (hints?.name && hints.store) {
    return {
      product_name_snapshot: hints.name,
      product_store_snapshot: hints.store,
      last_known_price:
        hints.price != null && Number.isFinite(hints.price) ? hints.price : null,
    }
  }

  const { data: offers } = await supabase
    .from('product_offers')
    .select('name_store, store_id, current_price, is_available')
    .or(`product_id.eq.${productExternalId},store_product_id.eq.${productExternalId}`)
    .order('is_available', { ascending: false })
    .limit(5)

  const offer = offers?.find((o) => o.is_available) ?? offers?.[0]

  if (offer) {
    return {
      product_name_snapshot: offer.name_store ?? null,
      product_store_snapshot: mapStoreIdToDisplayName(offer.store_id),
      last_known_price:
        offer.current_price != null ? Number(offer.current_price) : null,
    }
  }

  const { data: product } = await supabase
    .from('products')
    .select('name_generic, department, category')
    .eq('id', productExternalId)
    .maybeSingle()

  if (product) {
    return {
      product_name_snapshot: product.name_generic ?? null,
      product_store_snapshot: parseFooddataProductId(productExternalId)
        ? mapStoreIdToDisplayName(parseFooddataProductId(productExternalId)!.source_chain)
        : 'Katalog',
      last_known_price: null,
    }
  }

  return {
    product_name_snapshot: hints?.name ?? null,
    product_store_snapshot: hints?.store ?? null,
    last_known_price: hints?.price ?? null,
  }
}

export function snapshotToResolvedProduct(
  snapshot: Partial<ProductMatchSnapshot>,
  fallbackCategory = 'Andre',
): {
  name: string
  category: string
  store: string
  price: number
  originalPrice: number | null
  isOnSale: boolean
} | null {
  const name = snapshot.product_name_snapshot?.trim()
  if (!name) return null
  return {
    name,
    category: fallbackCategory,
    store: snapshot.product_store_snapshot || 'Ukendt butik',
    price: snapshot.last_known_price ?? 0,
    originalPrice: null,
    isOnSale: false,
  }
}
