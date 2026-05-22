import {
  type AlgoliaQueryResponse,
  type SallingAlgoliaHit,
  type SallingChain,
  SALLING_INDEX_BY_CHAIN,
} from './types'

/**
 * Salling Group Algolia client.
 *
 * Uses the public search-only API key embedded in the bilkatogo.dk frontend
 * (https://www.bilkatogo.dk/_nuxt/a2c814a.js). This key is intentionally
 * exposed for client-side search and rate-limited to search operations only.
 *
 * Application ID: F9VBJLR1BK
 * Endpoint: https://f9vbjlr1bk-dsn.algolia.net/1/indexes/{INDEX}/query
 */

const ALGOLIA_APP_ID = 'F9VBJLR1BK'

/**
 * Resolves the Algolia search key, preferring an env-var override.
 * Falls back to the publicly-visible frontend key.
 */
function getApiKey(): string {
  const override = process.env.SALLING_ALGOLIA_SEARCH_KEY?.trim()
  if (override) return override
  return '1deaf41c87e729779f7695c00f190cc9'
}

function endpoint(chain: SallingChain): string {
  const index = SALLING_INDEX_BY_CHAIN[chain]
  return `https://${ALGOLIA_APP_ID.toLowerCase()}-dsn.algolia.net/1/indexes/${index}/query`
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
      'X-Algolia-Application-Id': ALGOLIA_APP_ID,
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
