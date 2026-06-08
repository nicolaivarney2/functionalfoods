import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@/lib/supabase'
import {
  FOODDATA_ACTIVE_SYNC_STORE_IDS,
  FOODDATA_STORE_IDS,
  mapStoreIdToDisplayName,
} from '@/lib/fooddata-stores'

const FROZEN_MODIFIER_TOKENS = new Set([
  'frosne',
  'frossen',
  'frost',
  'dybfrost',
  'frozen',
])

/** Primære dagligvarekæder — søg per butik så én kæde ikke fylder hele limit. */
const PRIMARY_MATCHING_STORE_IDS = [
  ...new Set(
    FOODDATA_ACTIVE_SYNC_STORE_IDS.map((id) => (id === 'fotex' ? 'foetex' : id))
  ),
] as const

export const dynamic = 'force-dynamic'
export const revalidate = 0

const DEFAULT_LIMIT = 500
const MAX_LIMIT = 800

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(
      MAX_LIMIT,
      Math.max(1, parseInt(searchParams.get('limit') || String(DEFAULT_LIMIT), 10))
    )
    const search = searchParams.get('search') || ''
    const ingredientId = searchParams.get('ingredient_id') || ''

    const supabase = createSupabaseServiceClient()

    let matchQuery = supabase
      .from('product_ingredient_matches')
      .select('product_external_id')

    if (ingredientId) {
      matchQuery = matchQuery.eq('ingredient_id', ingredientId)
    }

    const { data: existingMatches } = await matchQuery
    const matchedIds = new Set(existingMatches?.map((m) => m.product_external_id) || [])

    const parseSearchTerm = (raw: string) => {
      const trimmed = raw.trim()
      const quoted = trimmed.match(/^["'](.+)["']$/)
      if (quoted) {
        return { term: quoted[1].trim(), wholeWordOnly: true }
      }
      return { term: trimmed, wholeWordOnly: false }
    }

    const { term, wholeWordOnly } = parseSearchTerm(search)

    if (!term || term.length < 2) {
      return NextResponse.json({
        success: true,
        message: 'Search term too short',
        data: {
          products: [],
          pagination: { page, limit, total: 0, totalPages: 0, hasMore: false }
        }
      })
    }
    const buildSearchVariants = (value: string) => {
      const variants = new Set<string>()
      const lower = value.toLowerCase()
      variants.add(lower)

      const ascii = lower
        .replace(/æ/g, 'ae')
        .replace(/ø/g, 'oe')
        .replace(/å/g, 'aa')
      variants.add(ascii)

      if (!/[æøå]/.test(lower)) {
        const accented = lower
          .replace(/aa/g, 'å')
          .replace(/ae/g, 'æ')
          .replace(/oe/g, 'ø')
        variants.add(accented)
      }

      return Array.from(variants).filter(Boolean)
    }

    const termVariants = buildSearchVariants(term)
    const normalizeForSearch = (value: string) =>
      value
        .toLowerCase()
        .replace(/æ/g, 'ae')
        .replace(/ø/g, 'oe')
        .replace(/å/g, 'aa')
        .replace(/[^\p{L}\p{N}\s]/gu, ' ')
        .replace(/\s+/g, ' ')
        .trim()
    const allTokens = normalizeForSearch(term).split(' ').filter((t) => t.length >= 2)
    const wantsFrozen = allTokens.some((t) => FROZEN_MODIFIER_TOKENS.has(t))
    const productTokens = allTokens.filter((t) => !FROZEN_MODIFIER_TOKENS.has(t))
    const queryTokens = wantsFrozen && productTokens.length > 0 ? productTokens : allTokens
    // Primary search: full phrase only (not per-token OR — avoids "bok choy" → "boksers")
    const phraseVariants = Array.from(
      new Set(
        termVariants
          .map((t) => t.replace(/[(),]/g, ' ').replace(/\s+/g, ' ').trim())
          .filter((t) => t.length >= 2)
      )
    )

    const nameMatchesAllTokens = (name: string) => {
      const nameNorm = normalizeForSearch(name)
      return queryTokens.every((t) => nameNorm.includes(t))
    }

    /** Quoted search: "citron" matches "frisk citron" but not "citronmåne" */
    const nameContainsWholeTerm = (name: string, searchTerm: string) => {
      const nameNorm = normalizeForSearch(name)
      return buildSearchVariants(searchTerm).some((variant) => {
        const termNorm = normalizeForSearch(variant)
        if (!termNorm) return false
        if (nameNorm === termNorm) return true
        return ` ${nameNorm} `.includes(` ${termNorm} `)
      })
    }

    const isFrozenDepartment = (department?: string, category?: string) => {
      const meta = normalizeForSearch(`${department || ''} ${category || ''}`)
      return /frost|dybfrost|frosne|frozen/.test(meta)
    }

    const scoreProductRelevance = (product: {
      name?: string
      category?: string
      is_on_sale?: boolean
      _frozenMatch?: boolean
    }) => {
      const nameNorm = normalizeForSearch(product.name || '')
      const termNorm = normalizeForSearch(term)

      let score = 0
      if (nameNorm === termNorm) score += 1200
      if (nameNorm.startsWith(termNorm)) score += 900
      if (nameNorm.includes(termNorm)) score += 700
      if (` ${nameNorm} `.includes(` ${termNorm} `)) score += 450

      let tokenHits = 0
      for (const t of queryTokens) {
        if (nameNorm.includes(t)) tokenHits++
      }
      score += tokenHits * 220
      if (queryTokens.length > 1 && tokenHits === queryTokens.length) score += 250
      if (product._frozenMatch) score += 600
      if (product._frozenMatch && queryTokens.length === 1 && nameNorm === queryTokens[0]) score += 400
      if (product.is_on_sale) score += 20

      return score
    }

    const buildOrQuery = (fields: string[], terms: string[]) =>
      fields.flatMap((field) => terms.map((t) => `${field}.ilike.%${t}%`)).join(',')

    const offerSelect = `
      product_id,
      store_id,
      store_product_id,
      name_store,
      current_price,
      normal_price,
      is_on_sale,
      discount_percentage,
      is_available,
      products:product_id!inner (
        name_generic,
        brand,
        category,
        subcategory,
        department,
        unit,
        amount
      )
    `

    const mapStoreDisplay = (storeId: string | null) =>
      mapStoreIdToDisplayName(storeId)

    const mapOfferRows = (offerRows: unknown[]) => {
      const map = new Map<string, Record<string, unknown>>()
      for (const row of offerRows as Array<Record<string, unknown>>) {
        const productId = row.product_id ? String(row.product_id) : ''
        if (!productId || matchedIds.has(productId)) continue

        const p = Array.isArray(row.products) ? row.products[0] : row.products
        const pRec = (p || {}) as Record<string, unknown>

        const existing = map.get(productId)
        const candidate = {
          external_id: productId,
          name: (row.name_store as string) || (pRec.name_generic as string),
          category: (pRec.category as string) || (pRec.department as string) || 'Andre',
          department: (pRec.department as string) || '',
          store: mapStoreDisplay(row.store_id as string | null),
          source: 'product_offers',
          price: row.current_price,
          original_price: row.normal_price,
          is_on_sale: !!row.is_on_sale,
          last_updated: null
        }

        if (!existing) {
          map.set(productId, candidate)
          continue
        }
        if (!existing.is_on_sale && candidate.is_on_sale) {
          map.set(productId, candidate)
        }
      }
      return Array.from(map.values())
    }

    const nameOrQuery = buildOrQuery(['name_store'], phraseVariants)
    const productsOrQuery = buildOrQuery(['name_generic'], phraseVariants)

    const PER_STORE_SEARCH_LIMIT = 350

    const fetchOffersByName = (orQuery: string, storeIds: readonly string[] = FOODDATA_STORE_IDS) =>
      supabase
        .from('product_offers')
        .select(offerSelect)
        .in('store_id', [...storeIds])
        .eq('is_available', true)
        .or(orQuery)
        .order('is_on_sale', { ascending: false })
        .limit(storeIds.length === 1 ? PER_STORE_SEARCH_LIMIT : 1000)

    const fetchOffersPerPrimaryStore = async (orQuery: string) => {
      const results = await Promise.all(
        PRIMARY_MATCHING_STORE_IDS.map((storeId) => fetchOffersByName(orQuery, [storeId]))
      )
      const rows: unknown[] = []
      for (const result of results) {
        if (result.error) {
          console.warn('⚠️ product_offers name search:', result.error.message)
          continue
        }
        if (result.data?.length) rows.push(...result.data)
      }
      return rows
    }

    const fetchProductIdsByName = (orQuery: string) =>
      supabase.from('products').select('id').or(orQuery).limit(1000)

    const productTokenVariants = Array.from(
      new Set(productTokens.flatMap((token) => buildSearchVariants(token)))
    )
    const productTokenOrQuery =
      productTokenVariants.length > 0
        ? buildOrQuery(['name_store'], productTokenVariants)
        : nameOrQuery

    const runFrozenProductSearch = async () => {
      const offerRows = await fetchOffersPerPrimaryStore(productTokenOrQuery)
      return mapOfferRows(offerRows)
        .filter((p) => {
          const row = p as Record<string, unknown>
          const name = String(row.name || '')
          const nameNorm = normalizeForSearch(name)
          const tokensInName = queryTokens.every((t) => nameNorm.includes(t))
          if (!tokensInName) return false
          return (
            isFrozenDepartment(
              String(row.department || ''),
              String(row.category || '')
            ) || FROZEN_MODIFIER_TOKENS.has(nameNorm)
          )
        })
        .map((p) => ({ ...p, _frozenMatch: true }))
    }

    let merged: Record<string, unknown>[] = []

    if (wantsFrozen && productTokens.length > 0) {
      merged = await runFrozenProductSearch()
    } else {
      const [directOfferRows, productsResult] = await Promise.all([
        fetchOffersPerPrimaryStore(nameOrQuery),
        fetchProductIdsByName(productsOrQuery),
      ])

      if (productsResult.error) {
        console.warn('⚠️ products catalog search:', productsResult.error.message)
      }

      merged = mapOfferRows(directOfferRows)

    const mergeOfferResults = (
      primary: Record<string, unknown>[],
      extra: Record<string, unknown>[]
    ) => {
      const byId = new Map<string, Record<string, unknown>>()
      for (const p of [...primary, ...extra]) {
        const key = String(p.external_id || '')
        if (!key) continue
        const existing = byId.get(key)
        if (!existing || (!existing.is_on_sale && p.is_on_sale)) {
          byId.set(key, p)
        }
      }
      return Array.from(byId.values())
    }

    const loadOffersForProductIds = async (productIds: string[]) => {
      if (!productIds.length) return [] as Record<string, unknown>[]
      const PRODUCT_ID_CHUNK_SIZE = 200
      const extraRows: unknown[] = []
      for (let i = 0; i < productIds.length; i += PRODUCT_ID_CHUNK_SIZE) {
        const chunk = productIds.slice(i, i + PRODUCT_ID_CHUNK_SIZE)
        const { data: offerRows, error: offersError } = await supabase
          .from('product_offers')
          .select(offerSelect)
          .in('store_id', [...FOODDATA_STORE_IDS])
          .eq('is_available', true)
          .in('product_id', chunk)
          .limit(1000)

        if (offersError) {
          console.warn('⚠️ product_offers by product_id chunk:', offersError.message)
          continue
        }
        if (offerRows?.length) extraRows.push(...offerRows)
      }
      return mapOfferRows(extraRows)
    }

    const collectCatalogProductIds = (
      directRows: Array<{ product_id?: string }>,
      catalogRows: Array<{ id?: string }>
    ) => {
      const ids = new Set<string>()
      for (const m of catalogRows) {
        if (m?.id) ids.add(String(m.id))
      }
      for (const row of directRows) {
        if (row?.product_id) ids.delete(String(row.product_id))
      }
      return Array.from(ids)
    }

      let productIdsFromCatalog = collectCatalogProductIds(
        directOfferRows as Array<{ product_id?: string }>,
        (productsResult.data || []) as Array<{ id?: string }>
      )
      const extraMapped = await loadOffersForProductIds(productIdsFromCatalog.slice(0, 1200))
      merged = mergeOfferResults(merged, extraMapped)

      // Fallback for multi-word queries: all tokens in name, per store (avoids one chain filling limit)
      const MIN_RESULTS_BEFORE_TOKEN_FALLBACK = 20
      if (queryTokens.length > 1 && merged.length < MIN_RESULTS_BEFORE_TOKEN_FALLBACK) {
        const tokenOrQuery = buildOrQuery(
          ['name_store'],
          queryTokens.flatMap((token) => buildSearchVariants(token))
        )
        const tokenProductsOrQuery = buildOrQuery(
          ['name_generic'],
          queryTokens.flatMap((token) => buildSearchVariants(token))
        )

        const [tokenOfferRows, tokenProductsResult] = await Promise.all([
          fetchOffersPerPrimaryStore(tokenOrQuery),
          fetchProductIdsByName(tokenProductsOrQuery),
        ])

        const tokenDirect = mapOfferRows(tokenOfferRows).filter((p) =>
          nameMatchesAllTokens(String(p.name || ''))
        )
        const tokenProductIds = collectCatalogProductIds(
          tokenOfferRows as Array<{ product_id?: string }>,
          (tokenProductsResult.data || []) as Array<{ id?: string }>
        )
        const tokenExtra = await loadOffersForProductIds(tokenProductIds.slice(0, 1200))
        const tokenMerged = mergeOfferResults(tokenDirect, tokenExtra).filter((p) =>
          nameMatchesAllTokens(String(p.name || ''))
        )

        merged = mergeOfferResults(merged, tokenMerged)
      }
    }

    if (wholeWordOnly) {
      merged = merged.filter((p) => nameContainsWholeTerm(String(p.name || ''), term))
    }

    type ScoredProduct = Record<string, unknown> & { _score: number }

    const allProducts: ScoredProduct[] = merged.map((p): ScoredProduct => {
      const row = p as Record<string, unknown>
      return {
        ...row,
        _score: scoreProductRelevance({
          name: row.name as string | undefined,
          category: row.category as string | undefined,
          is_on_sale: row.is_on_sale as boolean | undefined,
          _frozenMatch: row._frozenMatch as boolean | undefined,
        }),
      }
    })
      .sort((a, b) => {
        if (b._score !== a._score) return b._score - a._score
        if (!!a.is_on_sale !== !!b.is_on_sale) return a.is_on_sale ? -1 : 1
        const aPrice = Number(a.price || 0)
        const bPrice = Number(b.price || 0)
        if (aPrice !== bPrice) return aPrice - bPrice
        return String(a.name || '').localeCompare(String(b.name || ''))
      })

    const total = allProducts.length
    const offset = (page - 1) * limit
    const paginatedProducts = allProducts.slice(offset, offset + limit).map(({ _score, ...rest }) => rest)
    const hasMore = offset + limit < total

    return NextResponse.json({
      success: true,
      message: 'Products loaded for matching',
      data: {
        products: paginatedProducts,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit) || 0,
          hasMore
        }
      }
    })
  } catch (error) {
    console.error('❌ Error loading products for matching:', error)
    return NextResponse.json(
      {
        success: false,
        message: `Failed to load products: ${error instanceof Error ? error.message : 'Unknown error'}`
      },
      { status: 500 }
    )
  }
}
