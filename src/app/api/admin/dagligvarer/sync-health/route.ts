import { NextResponse } from 'next/server'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const revalidate = 0

type DanishWeekday = 'Mandag' | 'Tirsdag' | 'Onsdag' | 'Torsdag' | 'Fredag' | 'Lørdag' | 'Søndag'

const WEEKDAY_INDEX: Record<DanishWeekday, number> = {
  Søndag: 0,
  Mandag: 1,
  Tirsdag: 2,
  Onsdag: 3,
  Torsdag: 4,
  Fredag: 5,
  Lørdag: 6,
}

type StoreDef = {
  /** store_id slug as it appears in product_offers (matches goma-import.resolveStoreSlug) */
  storeId: string
  label: string
  offerDay: DanishWeekday
}

/**
 * The 13 stores we expect to see offers for. Order matches the admin UI.
 */
const KNOWN_STORES: StoreDef[] = [
  { storeId: 'netto', label: 'Netto', offerDay: 'Fredag' },
  { storeId: 'rema-1000', label: 'REMA 1000', offerDay: 'Lørdag' },
  { storeId: '365discount', label: '365 Discount', offerDay: 'Onsdag' },
  { storeId: 'lidl', label: 'Lidl', offerDay: 'Lørdag' },
  { storeId: 'bilka', label: 'Bilka', offerDay: 'Fredag' },
  { storeId: 'nemlig', label: 'Nemlig', offerDay: 'Søndag' },
  { storeId: 'meny', label: 'MENY', offerDay: 'Torsdag' },
  { storeId: 'spar', label: 'Spar', offerDay: 'Torsdag' },
  { storeId: 'kvickly', label: 'Kvickly', offerDay: 'Torsdag' },
  { storeId: 'superbrugsen', label: 'SuperBrugsen', offerDay: 'Torsdag' },
  { storeId: 'brugsen', label: 'Brugsen', offerDay: 'Fredag' },
  { storeId: 'lovbjerg', label: 'Løvbjerg', offerDay: 'Torsdag' },
  { storeId: 'abc-lavpris', label: 'ABC Lavpris', offerDay: 'Tirsdag' },
  { storeId: 'fotex', label: 'Føtex', offerDay: 'Torsdag' },
]

function getAdminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    throw new Error('Missing Supabase admin environment variables')
  }
  return createClient(url, serviceKey)
}

/**
 * Last time we actually saw this store's offers in a Goma import.
 * Uses `last_seen_at` (only set by importGomaProducts) so global cleanup runs
 * don't accidentally make every store look like it was just synced.
 * Falls back to `updated_at` for legacy rows where last_seen_at is null.
 */
async function getLastSync(supabase: SupabaseClient, storeId: string): Promise<string | null> {
  const { data } = await supabase
    .from('product_offers')
    .select('last_seen_at')
    .eq('store_id', storeId)
    .not('last_seen_at', 'is', null)
    .order('last_seen_at', { ascending: false })
    .limit(1)

  if (data && data.length > 0 && data[0].last_seen_at) {
    return data[0].last_seen_at as string
  }

  // Fallback for stores where last_seen_at hasn't been backfilled yet
  const { data: legacy } = await supabase
    .from('product_offers')
    .select('updated_at')
    .eq('store_id', storeId)
    .order('updated_at', { ascending: false })
    .limit(1)

  return legacy && legacy.length > 0 ? (legacy[0].updated_at as string) : null
}

/** Run a head-count query on product_offers for this store with optional extra filter. */
async function countOffers(
  supabase: SupabaseClient,
  storeId: string,
  extra?: (q: any) => any
): Promise<number> {
  let query: any = supabase
    .from('product_offers')
    .select('*', { count: 'exact', head: true })
    .eq('store_id', storeId)
  if (extra) {
    query = extra(query)
  }
  const { count, error } = await query
  if (error) {
    console.error(`countOffers error for ${storeId}:`, error.message)
    return 0
  }
  return count || 0
}

function daysSince(iso: string | null): number | null {
  if (!iso) return null
  const ms = Date.now() - new Date(iso).getTime()
  return Math.max(0, ms / (24 * 60 * 60 * 1000))
}

/**
 * Returns how many days have passed since this store's last expected offer day,
 * given today's Danish weekday. We are "due for sync" within ~24h of that day.
 */
function daysSinceLastOfferDay(offerDay: DanishWeekday): number {
  const now = new Date()
  const danish = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Copenhagen' }))
  const today = danish.getDay()
  const target = WEEKDAY_INDEX[offerDay]
  let diff = (today - target + 7) % 7
  // If today *is* the offer day, treat it as "0 days since" — sync should happen today.
  return diff
}

type StoreHealth = {
  storeId: string
  label: string
  offerDay: DanishWeekday
  lastSyncAt: string | null
  daysSinceSync: number | null
  daysSinceLastOfferDay: number
  totalOffers: number
  activeOffers: number
  onSaleFlag: number
  expiredButStillFlagged: number
  updatedLast24h: number
  updatedLast7d: number
  status: 'healthy' | 'late' | 'stale' | 'empty'
  statusReason: string
}

function classify(input: Omit<StoreHealth, 'status' | 'statusReason'>): {
  status: StoreHealth['status']
  statusReason: string
} {
  if (input.totalOffers === 0) {
    return { status: 'empty', statusReason: 'Ingen tilbud i databasen' }
  }
  if (input.expiredButStillFlagged > 0) {
    return {
      status: 'stale',
      statusReason: `${input.expiredButStillFlagged} udløbne tilbud står stadig som aktive`,
    }
  }
  if (input.daysSinceSync == null) {
    return { status: 'stale', statusReason: 'Ingen updated_at registreret' }
  }
  // Allow 1 day grace from offer day. Beyond 9 days = clearly stale.
  if (input.daysSinceSync > 9) {
    return {
      status: 'stale',
      statusReason: `Ikke synket i ${Math.round(input.daysSinceSync)} dage`,
    }
  }
  // If the offer day was 1+ days ago and we still haven't synced since, mark as late
  if (input.daysSinceLastOfferDay >= 1 && input.daysSinceSync > input.daysSinceLastOfferDay + 1) {
    return {
      status: 'late',
      statusReason: `Forventet sync efter ${input.offerDay} – sidst opdateret for ${Math.round(input.daysSinceSync)} dage siden`,
    }
  }
  return { status: 'healthy', statusReason: 'OK' }
}

export async function GET() {
  try {
    const supabase = getAdminClient()
    const startedAt = Date.now()
    const nowIso = new Date().toISOString()
    const t24hAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const t7dAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

    const stores: StoreHealth[] = await Promise.all(
      KNOWN_STORES.map(async (store) => {
        const [
          lastSyncAt,
          totalOffers,
          activeOffers,
          onSaleFlag,
          expiredButStillFlagged,
          updatedLast24h,
          updatedLast7d,
        ] = await Promise.all([
          getLastSync(supabase, store.storeId),
          countOffers(supabase, store.storeId),
          countOffers(supabase, store.storeId, (q) => q.eq('is_offer_active', true)),
          countOffers(supabase, store.storeId, (q) => q.eq('is_on_sale', true)),
          countOffers(supabase, store.storeId, (q) =>
            q.eq('is_on_sale', true).not('sale_valid_to', 'is', null).lt('sale_valid_to', nowIso)
          ),
          countOffers(supabase, store.storeId, (q) => q.gte('updated_at', t24hAgo)),
          countOffers(supabase, store.storeId, (q) => q.gte('updated_at', t7dAgo)),
        ])

        const dSinceSync = daysSince(lastSyncAt)
        const dSinceOffer = daysSinceLastOfferDay(store.offerDay)

        const partial = {
          storeId: store.storeId,
          label: store.label,
          offerDay: store.offerDay,
          lastSyncAt,
          daysSinceSync: dSinceSync != null ? Math.round(dSinceSync * 10) / 10 : null,
          daysSinceLastOfferDay: dSinceOffer,
          totalOffers,
          activeOffers,
          onSaleFlag,
          expiredButStillFlagged,
          updatedLast24h,
          updatedLast7d,
        }

        const { status, statusReason } = classify(partial)
        return { ...partial, status, statusReason }
      })
    )

    const summary = {
      totalStores: stores.length,
      healthy: stores.filter((s) => s.status === 'healthy').length,
      late: stores.filter((s) => s.status === 'late').length,
      stale: stores.filter((s) => s.status === 'stale').length,
      empty: stores.filter((s) => s.status === 'empty').length,
      totalOffers: stores.reduce((sum, s) => sum + s.totalOffers, 0),
      totalActiveOffers: stores.reduce((sum, s) => sum + s.activeOffers, 0),
      totalExpiredButStillFlagged: stores.reduce((sum, s) => sum + s.expiredButStillFlagged, 0),
      generatedAt: nowIso,
      durationMs: Date.now() - startedAt,
    }

    return NextResponse.json({ success: true, summary, stores })
  } catch (error) {
    console.error('❌ Error in sync-health endpoint:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
