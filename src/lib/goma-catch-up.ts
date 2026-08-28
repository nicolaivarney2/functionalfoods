/**
 * Goma-kæder der er faldet bagud ift. ugeslot / daglig Nemlig-rytme.
 * Bruges af scheduled sync (GitHub + Vercel) så en misset kørsel
 * bliver indhentet næste slot — uden manuel brandslukning.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { getGroceryServiceClient } from '@/grocery/db/client'
import type { SourceChain } from '@/grocery/types'
import {
  defaultGomaImportStoreNames,
  gomaChainToStoreName,
  gomaStoreNameToChain,
  type GomaStoreName,
} from '@/lib/goma-import-stores'

/** Nemlig skifter løbende — 36t er rødt. Øvrige kæder: ugeslot + buffer. */
const STALE_MS: Partial<Record<SourceChain, number>> = {
  nemlig: 36 * 60 * 60 * 1000,
}

const DEFAULT_STALE_MS = 8 * 24 * 60 * 60 * 1000
/** Tom tilbudsavis: prøv igen næste cron, men ikke hvert kvarter. */
const EMPTY_OFFER_RETRY_MS = 18 * 60 * 60 * 1000
const CATCHUP_COOLDOWN_MS = 10 * 60 * 60 * 1000

export function gomaSyncLogSource(chain: SourceChain): `goma:${string}` {
  return `goma:${chain}`
}

export async function resolveGomaCatchUpStores(
  client: SupabaseClient = getGroceryServiceClient(),
  now: Date = new Date(),
): Promise<GomaStoreName[]> {
  const catchUp: GomaStoreName[] = []

  for (const storeName of defaultGomaImportStoreNames()) {
    const chain = gomaStoreNameToChain(storeName)
    if (!chain) continue

    const { data: log } = await client
      .from('sync_logs')
      .select('started_at, status, offers_processed')
      .eq('source', gomaSyncLogSource(chain))
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const lastLogAt = log?.started_at ? new Date(log.started_at).getTime() : 0
    if (log?.status === 'failed') {
      catchUp.push(storeName)
      continue
    }
    if (log?.status === 'running' && now.getTime() - lastLogAt > 30 * 60 * 1000) {
      catchUp.push(storeName)
      continue
    }
    if (
      lastLogAt > 0 &&
      now.getTime() - lastLogAt < CATCHUP_COOLDOWN_MS &&
      (log?.status === 'success' || log?.status === 'partial')
    ) {
      continue
    }

    const { data: fresh } = await client
      .from('product_offers')
      .select('source_synced_at')
      .eq('store_id', chain)
      .eq('source', 'goma')
      .not('source_synced_at', 'is', null)
      .order('source_synced_at', { ascending: false })
      .limit(1)

    const lastSeen = fresh?.[0]?.source_synced_at
      ? new Date(fresh[0].source_synced_at as string).getTime()
      : 0
    const ageMs = lastSeen > 0 ? now.getTime() - lastSeen : Number.POSITIVE_INFINITY
    const staleLimit = STALE_MS[chain] ?? DEFAULT_STALE_MS

    if (ageMs > staleLimit) {
      catchUp.push(storeName)
      continue
    }

    const { count: onSale } = await client
      .from('product_offers')
      .select('id', { count: 'exact', head: true })
      .eq('store_id', chain)
      .eq('source', 'goma')
      .eq('is_on_sale', true)

    if ((onSale ?? 0) === 0 && ageMs > EMPTY_OFFER_RETRY_MS) {
      catchUp.push(storeName)
    }
  }

  return catchUp
}

export function mergeGomaStoreLists(
  scheduled: GomaStoreName[],
  catchUp: GomaStoreName[],
): GomaStoreName[] {
  const out: GomaStoreName[] = []
  const seen = new Set<string>()
  for (const name of [...catchUp, ...scheduled]) {
    if (seen.has(name)) continue
    seen.add(name)
    out.push(name)
  }
  return out
}

export function parseGomaStoreQuery(raw: string | null): GomaStoreName[] {
  if (!raw?.trim()) return []
  const out: GomaStoreName[] = []
  for (const part of raw.split(',')) {
    const name = part.trim()
    if (!name) continue
    const chain = gomaStoreNameToChain(name) ?? (name as SourceChain)
    const store = gomaChainToStoreName(chain as SourceChain) ?? (name as GomaStoreName)
    if (gomaStoreNameToChain(store)) out.push(store)
  }
  return out
}
