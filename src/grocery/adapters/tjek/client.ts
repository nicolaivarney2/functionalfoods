/**
 * Tjek (Squid) HTTP client.
 *
 * Operational considerations baked in:
 *   - Kill-switch: env GROCERY_TJEK_DISABLED=true short-circuits all requests.
 *   - Browser-realistic headers (UA, Accept-Language, Accept-Encoding).
 *   - Inter-request jitter sleep (default 600-1400ms) so a full nightly run
 *     spreads across a minute rather than bursting.
 *   - Auto-pause: if we see 3 consecutive 4xx/5xx, throw a sentinel error so
 *     the sync stops cleanly and writes a `failed` sync_log row.
 *
 * Endpoints used (verified live, 27. May 2026):
 *   - GET /v2/dealers?country=dk&limit=200&offset=N   (max limit 200)
 *   - GET /v2/catalogs?dealer_ids=A,B,C&limit=N       (catalog metadata)
 *   - GET /v2/offers?dealer_ids=X&limit=100&offset=N  (max limit 100)
 *   - GET /v2/offers?catalog_ids=X&limit=100&offset=N (offers in one catalog)
 */

import type { TjekCatalog, TjekDealer, TjekOffer } from './types'

const BASE_URL = 'https://squid-api.tjek.com/v2'

/**
 * Browser-realistic headers. Deliberately mimics a normal Chrome session on
 * macOS — Tjek's API serves their own apps (eTilbudsavis, Madpris) using
 * essentially these same headers, so our traffic blends with normal app
 * background fetches.
 */
const DEFAULT_HEADERS: Record<string, string> = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  Accept: 'application/json, text/plain, */*',
  'Accept-Language': 'da-DK,da;q=0.9,en;q=0.8',
  'Accept-Encoding': 'gzip, deflate, br',
  Origin: 'https://etilbudsavis.dk',
  Referer: 'https://etilbudsavis.dk/',
}

const DEALERS_PAGE_LIMIT = 200
const OFFERS_PAGE_LIMIT = 100

/** Throws if the kill-switch is set. Call before every outbound request. */
function ensureNotDisabled(): void {
  if (process.env.GROCERY_TJEK_DISABLED === 'true') {
    throw new TjekDisabledError(
      'Tjek sync disabled via GROCERY_TJEK_DISABLED=true',
    )
  }
}

export class TjekDisabledError extends Error {
  constructor(msg: string) {
    super(msg)
    this.name = 'TjekDisabledError'
  }
}

export class TjekAutoPausedError extends Error {
  constructor(msg: string) {
    super(msg)
    this.name = 'TjekAutoPausedError'
  }
}

export interface TjekClientOptions {
  /** Min ms to sleep between requests. Default 600. */
  minSleepMs?: number
  /** Max ms to sleep between requests. Default 1400. */
  maxSleepMs?: number
  /** Consecutive errors before auto-pause. Default 3. */
  errorThreshold?: number
}

export class TjekClient {
  private consecutiveErrors = 0
  private readonly minSleepMs: number
  private readonly maxSleepMs: number
  private readonly errorThreshold: number

  constructor(opts: TjekClientOptions = {}) {
    this.minSleepMs = opts.minSleepMs ?? 600
    this.maxSleepMs = opts.maxSleepMs ?? 1400
    this.errorThreshold = opts.errorThreshold ?? 3
  }

  private async sleep(): Promise<void> {
    const span = this.maxSleepMs - this.minSleepMs
    const ms = this.minSleepMs + Math.floor(Math.random() * span)
    await new Promise((r) => setTimeout(r, ms))
  }

  private async fetchJson<T>(path: string): Promise<T> {
    ensureNotDisabled()

    const url = `${BASE_URL}${path}`
    const res = await fetch(url, {
      headers: DEFAULT_HEADERS,
      cache: 'no-store',
    })

    if (!res.ok) {
      this.consecutiveErrors++
      const body = await res.text().catch(() => '<no body>')
      const snippet = body.slice(0, 300)

      if (this.consecutiveErrors >= this.errorThreshold) {
        throw new TjekAutoPausedError(
          `Tjek auto-paused after ${this.consecutiveErrors} consecutive errors. Last: HTTP ${res.status} ${path} — ${snippet}`,
        )
      }
      throw new Error(`Tjek ${res.status}: ${path} — ${snippet}`)
    }

    this.consecutiveErrors = 0
    return (await res.json()) as T
  }

  /** Fetch all DK dealers (paginated). */
  async getAllDkDealers(): Promise<TjekDealer[]> {
    const out: TjekDealer[] = []
    let offset = 0
    while (true) {
      const page = await this.fetchJson<TjekDealer[]>(
        `/dealers?country=dk&limit=${DEALERS_PAGE_LIMIT}&offset=${offset}`,
      )
      if (!Array.isArray(page) || page.length === 0) break
      out.push(...page)
      if (page.length < DEALERS_PAGE_LIMIT) break
      offset += DEALERS_PAGE_LIMIT
      await this.sleep()
    }
    return out
  }

  /** Fetch all active catalogs for a list of dealers (one request). */
  async getCatalogsForDealers(
    dealerIds: string[],
    limit = 100,
  ): Promise<TjekCatalog[]> {
    if (dealerIds.length === 0) return []
    const qs = new URLSearchParams({
      dealer_ids: dealerIds.join(','),
      limit: String(limit),
    })
    return this.fetchJson<TjekCatalog[]>(`/catalogs?${qs.toString()}`)
  }

  /**
   * Yields every active offer for a single dealer, paginated.
   * Sleeps between pages so per-dealer load stays gentle.
   */
  async *iterateDealerOffers(dealerId: string): AsyncGenerator<TjekOffer> {
    let offset = 0
    const seen = new Set<string>()
    while (true) {
      const page = await this.fetchJson<TjekOffer[]>(
        `/offers?dealer_ids=${dealerId}&limit=${OFFERS_PAGE_LIMIT}&offset=${offset}`,
      )
      if (!Array.isArray(page) || page.length === 0) break

      let yielded = 0
      for (const offer of page) {
        if (seen.has(offer.id)) continue
        seen.add(offer.id)
        yielded++
        yield offer
      }

      if (page.length < OFFERS_PAGE_LIMIT) break
      offset += OFFERS_PAGE_LIMIT
      if (yielded === 0) break // safety: nothing new, stop paginating
      await this.sleep()
    }
  }
}
