import type { SupabaseClient } from '@supabase/supabase-js'
import {
  eanImageSourceRank,
  extractEanFromFfProductId,
  normalizeEan,
  resolveProductEan,
  siblingFfProductIdsForEan,
} from '@/lib/product-ean'

const PLACEHOLDER_MARKERS = ['recipe-placeholder.jpg', 'recipe-placeholder']

export function isUsableProductImage(url: string | null | undefined): boolean {
  if (!url || !String(url).trim()) return false
  const normalized = String(url).trim().toLowerCase()
  return !PLACEHOLDER_MARKERS.some((marker) => normalized.includes(marker))
}

type ImageCandidate = { ean: string; url: string; productId: string | null }

function considerCandidate(
  map: Map<string, ImageCandidate>,
  ean: string,
  url: string,
  productId: string | null,
): void {
  if (!isUsableProductImage(url)) return
  const existing = map.get(ean)
  if (!existing || eanImageSourceRank(productId) < eanImageSourceRank(existing.productId)) {
    map.set(ean, { ean, url: String(url).trim(), productId })
  }
}

/** Saml EAN for rækker uden brugbart billede (offer join med products). */
export function collectEansNeedingImagesFromOfferRows(
  rows: Array<Record<string, any>>,
): string[] {
  const eans = new Set<string>()
  for (const row of rows) {
    const p = (row.products as Record<string, any> | undefined) ?? {}
    if (isUsableProductImage(p.image_url as string | undefined)) continue
    const ean = resolveProductEan({
      ean: p.ean as string | null | undefined,
      productId: (p.id as string | undefined) ?? (row.product_id as string | undefined),
    })
    if (ean) eans.add(ean)
  }
  return [...eans]
}

/**
 * Slå billed-URL op for EAN via:
 * 1) products.ean kolonne
 * 2) products.id = `{chain}-{ean}` på tværs af kæder
 */
export async function buildEanImageLookup(
  supabase: SupabaseClient,
  eans: string[],
): Promise<Map<string, string>> {
  const unique = [...new Set(eans.map((e) => normalizeEan(e)).filter(Boolean) as string[])]
  const candidates = new Map<string, ImageCandidate>()
  if (unique.length === 0) return new Map()

  const CHUNK = 150

  for (let i = 0; i < unique.length; i += CHUNK) {
    const chunk = unique.slice(i, i + CHUNK)
    const { data, error } = await supabase
      .from('products')
      .select('id, ean, image_url')
      .in('ean', chunk)
      .not('image_url', 'is', null)

    if (error) {
      console.warn('buildEanImageLookup (ean column) failed:', error.message)
      continue
    }

    for (const row of data ?? []) {
      const ean = normalizeEan(row.ean as string | null)
      if (!ean) continue
      considerCandidate(candidates, ean, row.image_url as string, row.id as string)
    }
  }

  const unresolved = unique.filter((ean) => !candidates.has(ean))
  if (unresolved.length > 0) {
    const siblingIds = unresolved.flatMap((ean) => siblingFfProductIdsForEan(ean))
    for (let i = 0; i < siblingIds.length; i += 500) {
      const idChunk = siblingIds.slice(i, i + 500)
      const { data, error } = await supabase
        .from('products')
        .select('id, image_url')
        .in('id', idChunk)
        .not('image_url', 'is', null)

      if (error) {
        console.warn('buildEanImageLookup (sibling ids) failed:', error.message)
        continue
      }

      for (const row of data ?? []) {
        const ean = extractEanFromFfProductId(row.id as string)
        if (!ean) continue
        considerCandidate(candidates, ean, row.image_url as string, row.id as string)
      }
    }
  }

  const result = new Map<string, string>()
  for (const [ean, candidate] of candidates) {
    result.set(ean, candidate.url)
  }
  return result
}

export function resolveProductImageUrl(input: {
  ownImageUrl?: string | null
  ean?: string | null
  productId?: string | null
  lookup?: Map<string, string>
  placeholder: string
}): string {
  if (isUsableProductImage(input.ownImageUrl)) {
    return String(input.ownImageUrl).trim()
  }

  const ean = resolveProductEan({ ean: input.ean, productId: input.productId })
  if (ean && input.lookup?.has(ean)) {
    return input.lookup.get(ean)!
  }

  return input.placeholder
}

/** Enkelt produkt — fx produktdetalje-API. */
export async function resolveProductImageUrlWithLookup(
  supabase: SupabaseClient,
  input: {
    ownImageUrl?: string | null
    ean?: string | null
    productId?: string | null
    placeholder: string
  },
): Promise<string> {
  if (isUsableProductImage(input.ownImageUrl)) {
    return String(input.ownImageUrl).trim()
  }
  const ean = resolveProductEan({ ean: input.ean, productId: input.productId })
  if (!ean) return input.placeholder
  const lookup = await buildEanImageLookup(supabase, [ean])
  return resolveProductImageUrl({ ...input, lookup })
}

/** Hosts der kan loades direkte uden proxy (CDN / kæde-domæner). */
const DIRECT_DAGLIGVARER_IMAGE_HOST_SUFFIXES = [
  'netto.dk',
  'rema1000.dk',
  'bilka.dk',
  'foetex.dk',
  'nemlig.com',
  'meny.dk',
  'cloudinary.com',
  'digitaloceanspaces.com',
  'amazonaws.com',
  'googleusercontent.com',
  'gstatic.com',
] as const

export function resolveDagligvarerImageSrc(url: string | null | undefined): string {
  if (!url || !String(url).trim()) return ''
  const trimmed = String(url).trim()
  if (!trimmed.startsWith('http')) return trimmed
  try {
    const host = new URL(trimmed).hostname.toLowerCase()
    if (DIRECT_DAGLIGVARER_IMAGE_HOST_SUFFIXES.some((suffix) => host === suffix || host.endsWith(`.${suffix}`))) {
      return trimmed
    }
  } catch {
    // fall through to proxy
  }
  return `/api/images/proxy?url=${encodeURIComponent(trimmed)}`
}
