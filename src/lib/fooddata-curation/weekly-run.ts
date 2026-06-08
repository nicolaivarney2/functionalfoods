import type { SupabaseClient } from '@supabase/supabase-js'
import {
  pullCurationFromFooddata,
  type CurationPullResult,
} from '@/lib/fooddata-import/curation-pull'
import {
  loadLocalCurationStats,
  reconcileLocalQueueWithMatches,
  type LocalCurationStats,
} from './reconcile-queue'

export type WeeklyCurationStats = {
  fooddata: { pending: number; matches: number }
  local: LocalCurationStats
}

export type WeeklyCurationResult = {
  pull: CurationPullResult | null
  reconcile: { resolved: number } | null
  stats: WeeklyCurationStats
}

async function loadFooddataQueueStats(fooddata: SupabaseClient) {
  const { count: pending } = await fooddata
    .from('product_ingredient_match_queue')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'pending')

  const { count: matches } = await fooddata
    .from('product_ingredient_matches')
    .select('id', { count: 'exact', head: true })

  return { pending: pending ?? 0, matches: matches ?? 0 }
}

export async function runWeeklyCuration(options: {
  local: SupabaseClient
  fooddata: SupabaseClient
  dryRun?: boolean
}): Promise<WeeklyCurationResult> {
  const dryRun = options.dryRun ?? false

  let pull: CurationPullResult | null = null
  let reconcile: { resolved: number } | null = null

  if (!dryRun) {
    pull = await pullCurationFromFooddata(options.local, options.fooddata, {
      pullQueue: true,
    })
    reconcile = await reconcileLocalQueueWithMatches(options.local)
  }

  const [fd, loc] = await Promise.all([
    loadFooddataQueueStats(options.fooddata),
    loadLocalCurationStats(options.local),
  ])

  return {
    pull,
    reconcile,
    stats: { fooddata: fd, local: loc },
  }
}
