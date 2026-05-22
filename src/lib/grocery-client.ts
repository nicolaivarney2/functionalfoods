/**
 * Grocery Service Client
 * ──────────────────────
 * Type-safe wrapper around the internal /api/grocery/* endpoints.
 *
 * Use this from server-side code (route handlers, server components, sync
 * jobs). Do NOT import it into client components — that would leak the
 * API key into the browser bundle.
 *
 * Architecture: The grocery service is a self-contained subsystem with its
 * own Supabase project. Today it ships inside the `functionalfoods` repo;
 * later it can be extracted to its own service without changing this
 * client's surface — only the `baseUrl` would need to update.
 */

import type {
  GroceryCategoryNode,
  GroceryOfferDto,
  GroceryProductDto,
} from '@/grocery/api/shapes'

// ─────────────────────────────────────────────────────────────────────────────
// Public types (re-exported so consumers only import from this module)
// ─────────────────────────────────────────────────────────────────────────────

export type { GroceryProductDto, GroceryOfferDto, GroceryCategoryNode }

export interface GroceryListMeta {
  total: number
  limit: number
  offset: number
}

export interface GroceryListResponse<T> {
  data: T[]
  meta: GroceryListMeta
}

export interface GrocerySingleResponse<T> {
  data: T
}

export type GroceryChain =
  | 'netto'
  | 'foetex'
  | 'bilka'
  | 'rema-1000'
  | 'nemlig'
  | 'lidl'
  | string // forward-compat with future chains

export interface GroceryListProductsParams {
  chain?: GroceryChain
  category?: string
  q?: string
  gtin?: string
  onSale?: boolean
  limit?: number
  offset?: number
  orderBy?: 'name' | 'price_asc' | 'price_desc' | 'recent'
}

export interface GrocerySearchParams {
  q: string
  chain?: GroceryChain
  limit?: number
}

export interface GroceryOffersParams {
  chain?: GroceryChain
  category?: string
  limit?: number
  offset?: number
}

// ─────────────────────────────────────────────────────────────────────────────
// Errors
// ─────────────────────────────────────────────────────────────────────────────

export class GroceryClientError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly endpoint: string,
    public readonly details?: unknown,
  ) {
    super(message)
    this.name = 'GroceryClientError'
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────────────────────

function defaultBaseUrl(): string {
  const explicit = process.env.GROCERY_API_BASE_URL
  if (explicit) return explicit.replace(/\/$/, '')
  // Use Vercel system env (set automatically) or fall back to localhost.
  const vercelUrl = process.env.VERCEL_URL
  if (vercelUrl) return `https://${vercelUrl}`
  return 'http://localhost:3000'
}

function buildQuery(params: object): string {
  const usp = new URLSearchParams()
  for (const [key, value] of Object.entries(params as Record<string, unknown>)) {
    if (value === undefined || value === null || value === '') continue
    usp.set(key, typeof value === 'boolean' ? String(value) : String(value))
  }
  const s = usp.toString()
  return s ? `?${s}` : ''
}

// ─────────────────────────────────────────────────────────────────────────────
// Client
// ─────────────────────────────────────────────────────────────────────────────

export interface GroceryClientOptions {
  /** Base URL of the grocery API. Defaults to current Vercel deployment or localhost. */
  baseUrl?: string
  /** API key. Defaults to `process.env.GROCERY_INTERNAL_API_KEY`. */
  apiKey?: string
  /** Fetch implementation (defaults to global fetch). Useful for testing. */
  fetch?: typeof fetch
  /** Default Next.js revalidate/cache hint for responses (seconds). */
  revalidate?: number
}

export class GroceryClient {
  private readonly baseUrl: string
  private readonly apiKey: string
  private readonly _fetch: typeof fetch
  private readonly revalidate?: number

  constructor(options: GroceryClientOptions = {}) {
    this.baseUrl = options.baseUrl ?? defaultBaseUrl()
    const apiKey = options.apiKey ?? process.env.GROCERY_INTERNAL_API_KEY
    if (!apiKey) {
      throw new Error(
        'GroceryClient: missing API key (set GROCERY_INTERNAL_API_KEY or pass apiKey).',
      )
    }
    this.apiKey = apiKey
    this._fetch = options.fetch ?? fetch
    this.revalidate = options.revalidate
  }

  private async request<T>(path: string): Promise<T> {
    const url = `${this.baseUrl}${path}`
    const init: RequestInit & { next?: { revalidate?: number } } = {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        Accept: 'application/json',
      },
    }
    if (this.revalidate !== undefined) {
      init.next = { revalidate: this.revalidate }
    }

    const res = await this._fetch(url, init)
    if (!res.ok) {
      let details: unknown
      try {
        details = await res.json()
      } catch {
        details = await res.text().catch(() => '<no body>')
      }
      const message =
        typeof details === 'object' && details && 'error' in details
          ? String((details as { error: unknown }).error)
          : `Request failed (${res.status})`
      throw new GroceryClientError(message, res.status, path, details)
    }

    return (await res.json()) as T
  }

  // ── Products ─────────────────────────────────────────────────────────────

  async listProducts(
    params: GroceryListProductsParams = {},
  ): Promise<GroceryListResponse<GroceryProductDto>> {
    return this.request(`/api/grocery/products${buildQuery(params)}`)
  }

  async getProduct(idOrGtin: string): Promise<GroceryProductDto | null> {
    try {
      const res = await this.request<GrocerySingleResponse<GroceryProductDto>>(
        `/api/grocery/products/${encodeURIComponent(idOrGtin)}`,
      )
      return res.data
    } catch (err) {
      if (err instanceof GroceryClientError && err.status === 404) return null
      throw err
    }
  }

  // ── Search ───────────────────────────────────────────────────────────────

  async search(
    params: GrocerySearchParams,
  ): Promise<GroceryListResponse<GroceryProductDto>> {
    return this.request(`/api/grocery/search${buildQuery(params)}`)
  }

  // ── Offers ───────────────────────────────────────────────────────────────

  async listOffers(
    params: GroceryOffersParams = {},
  ): Promise<GroceryListResponse<GroceryProductDto>> {
    return this.request(`/api/grocery/offers${buildQuery(params)}`)
  }

  // ── Categories ───────────────────────────────────────────────────────────

  async getCategoryTree(
    params: { chain?: GroceryChain } = {},
  ): Promise<{ data: GroceryCategoryNode[]; meta: { totalProducts: number } }> {
    return this.request(`/api/grocery/categories${buildQuery(params)}`)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Singleton for convenience (lazy-initialized)
// ─────────────────────────────────────────────────────────────────────────────

let _defaultClient: GroceryClient | null = null

/**
 * Returns a process-singleton GroceryClient using env vars for config.
 * Throws if `GROCERY_INTERNAL_API_KEY` is not set.
 */
export function getGroceryClient(): GroceryClient {
  if (!_defaultClient) _defaultClient = new GroceryClient()
  return _defaultClient
}
