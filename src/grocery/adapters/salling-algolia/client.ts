import {
  type AlgoliaQueryResponse,
  type SallingAlgoliaHit,
  type SallingChain,
  SALLING_INDEX_BY_CHAIN,
} from './types'

/**
 * Salling Group Algolia client — grocery indexes on app F9VBJLR1BK:
 *   prod_NETTO_PRODUCTS, prod_FOETEX_PRODUCTS, prod_BILKATOGO_PRODUCTS
 *
 * Search-only keys are public (embedded in the chain frontends) and
 * index-restricted. The bilkatogo.dk key only allows Bilka To Go and
 * returns 403 for Netto/Føtex. Default is the grocery catalog key that
 * can query all three indexes.
 *
 * Endpoint: https://f9vbjlr1bk-dsn.algolia.net/1/indexes/{INDEX}/query
 *
 * Note: foetex.dk / bilka.dk use a different Algolia app (DRP4O45G5T)
 * with a Hybris department-store schema — not compatible with this mapper.
 */

export const SALLING_ALGOLIA_APP_ID = 'F9VBJLR1BK'

/** Grocery catalog search key (Netto + Føtex + Bilka To Go). */
const SALLING_ALGOLIA_GROCERY_SEARCH_KEY = 'd4f161f51f749bdd5baf699175d5f956'

/**
 * Resolves the Algolia search key, preferring an env-var override.
 * Override must be allowed to query Netto/Føtex/Bilka To Go — the
 * bilkatogo.dk-only key (`1deaf41c…`) 403's on Netto and Føtex.
 */
export function getSallingAlgoliaSearchKey(): string {
  const override = process.env.SALLING_ALGOLIA_SEARCH_KEY?.trim()
  if (override) return override
  return SALLING_ALGOLIA_GROCERY_SEARCH_KEY
}

function getApiKey(): string {
  return getSallingAlgoliaSearchKey()
}

function endpoint(chain: SallingChain): string {
  const index = SALLING_INDEX_BY_CHAIN[chain]
  return `https://${SALLING_ALGOLIA_APP_ID.toLowerCase()}-dsn.algolia.net/1/indexes/${index}/query`
}

export interface AlgoliaQueryParams {
  page?: number
  hitsPerPage?: number
  /** Algolia attribute filters. Each entry is a `field:value` string. */
  filters?: string
  facetFilters?: Array<string | string[]>
  facets?: string[]
  attributesToRetrieve?: string[]
}

function buildParamsString(params: AlgoliaQueryParams): string {
  const usp = new URLSearchParams()
  if (params.hitsPerPage !== undefined) usp.set('hitsPerPage', String(params.hitsPerPage))
  if (params.page !== undefined) usp.set('page', String(params.page))
  if (params.filters) usp.set('filters', params.filters)
  if (params.facetFilters) usp.set('facetFilters', JSON.stringify(params.facetFilters))
  if (params.facets) usp.set('facets', JSON.stringify(params.facets))
  if (params.attributesToRetrieve) {
    usp.set('attributesToRetrieve', JSON.stringify(params.attributesToRetrieve))
  }
  return usp.toString()
}

export async function querySalling(
  chain: SallingChain,
  params: AlgoliaQueryParams = {},
): Promise<AlgoliaQueryResponse<SallingAlgoliaHit>> {
  const body = {
    params: buildParamsString({
      hitsPerPage: 1000,
      // Salling's Algolia config excludes a lot of fields (gtin, storeData,
      // cpOffer*, etc.) from the default "retrievable" set. Request '*'
      // explicitly so we get the full payload.
      attributesToRetrieve: ['*'],
      ...params,
    }),
  }

  const res = await fetch(endpoint(chain), {
    method: 'POST',
    headers: {
      'X-Algolia-Application-Id': SALLING_ALGOLIA_APP_ID,
      'X-Algolia-API-Key': getApiKey(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    cache: 'no-store',
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '<no body>')
    throw new Error(`Algolia query failed (${res.status}): ${text.slice(0, 500)}`)
  }

  return (await res.json()) as AlgoliaQueryResponse<SallingAlgoliaHit>
}

/**
 * Yields every product across all pages.
 *
 * Salling's Algolia config caps pagination at 30,000 hits per query session
 * (`paginationLimitedTo=30000`). For larger indexes (Bilka has 39,522), we
 * fall back to per-category chunking using `consumerFacingHierarchy.lvl0`
 * facets, which are reliably < 30k per category.
 */
export async function* iterateAllProducts(
  chain: SallingChain,
  options: { hitsPerPage?: number; maxPages?: number; filters?: string } = {},
): AsyncGenerator<SallingAlgoliaHit, void, unknown> {
  // Probe first to decide strategy.
  const probe = await querySalling(chain, { hitsPerPage: 1, page: 0, filters: options.filters })
  const PAGINATION_LIMIT = probe.nbPages * 1 // when hitsPerPage=1, nbPages = max retrievable

  if (probe.nbHits <= PAGINATION_LIMIT) {
    yield* paginate(chain, options)
    return
  }

  // Chunked strategy: fetch the lvl0 facet values, then paginate within each.
  const facetField = 'consumerFacingHierarchy.lvl0'
  const facetRes = await querySalling(chain, {
    hitsPerPage: 0,
    page: 0,
    facets: [facetField],
    filters: options.filters,
  })

  const seen = new Set<string>()
  const facetValues = facetRes.facets?.[facetField]
    ? Object.keys(facetRes.facets[facetField])
    : []

  for (const facetValue of facetValues) {
    for await (const hit of paginate(chain, {
      ...options,
      facetFilters: [`${facetField}:${facetValue}`],
    })) {
      if (seen.has(hit.objectID)) continue
      seen.add(hit.objectID)
      yield hit
    }
  }

  // Safety net: also paginate without filter to catch any products
  // missing a top-level category (we observed ~48 such in Netto).
  for await (const hit of paginate(chain, options)) {
    if (seen.has(hit.objectID)) continue
    seen.add(hit.objectID)
    yield hit
  }
}

async function* paginate(
  chain: SallingChain,
  options: {
    hitsPerPage?: number
    maxPages?: number
    filters?: string
    facetFilters?: Array<string | string[]>
  },
): AsyncGenerator<SallingAlgoliaHit, void, unknown> {
  const hitsPerPage = options.hitsPerPage ?? 1000
  const maxPages = options.maxPages ?? Infinity
  let page = 0
  let totalPages = Infinity
  while (page < totalPages && page < maxPages) {
    const result = await querySalling(chain, {
      page,
      hitsPerPage,
      filters: options.filters,
      facetFilters: options.facetFilters,
    })
    totalPages = result.nbPages
    for (const hit of result.hits) yield hit
    page++
  }
}
