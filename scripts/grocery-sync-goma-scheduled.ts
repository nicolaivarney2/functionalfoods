#!/usr/bin/env tsx
/**
 * Planlagt Goma → fooddata sync (GitHub Actions).
 *
 * Kører dagens kæder + catch-up (Nemlig/stale/tom avis).
 * Bruger GOMA_API_KEY lokalt når den er sat; ellers ét Vercel-kald pr. kæde
 * (300s loft pr. kæde i stedet for alle kæder i ét request).
 *
 *   npx tsx scripts/grocery-sync-goma-scheduled.ts
 *   npx tsx scripts/grocery-sync-goma-scheduled.ts --catch-up-only
 *   npx tsx scripts/grocery-sync-goma-scheduled.ts --print-stores
 */

import { resolve } from 'node:path'
import { config as loadEnv } from 'dotenv'

loadEnv({ path: resolve(process.cwd(), '.env.local') })
process.env.GOMA_IMPORT_ENABLED = 'true'

import { syncGoma } from '../src/grocery/adapters/goma'
import { cleanupExpiredOffers } from '../src/lib/dagligvarer-offer-cleanup'
import {
  mergeGomaStoreLists,
  parseGomaStoreQuery,
  resolveGomaCatchUpStores,
} from '../src/lib/goma-catch-up'
import { getGomaStoresForDanishWeekday } from '../src/lib/goma-import-stores'
import { getCopenhagenWeekday } from '../src/lib/grocery/sync-schedule'
import { isGomaImportEnabled } from '../src/lib/goma-sunset'
import type { GomaStoreName } from '../src/lib/goma-import-stores'

const args = new Set(process.argv.slice(2))
const forceArg = process.argv.slice(2).find((a) => a.startsWith('--stores='))

async function resolveStores(): Promise<{
  stores: GomaStoreName[]
  scheduled: GomaStoreName[]
  catchUp: GomaStoreName[]
}> {
  if (forceArg) {
    const stores = parseGomaStoreQuery(forceArg.split('=')[1] ?? '')
    return { stores, scheduled: stores, catchUp: [] }
  }
  const scheduled = args.has('--catch-up-only')
    ? []
    : getGomaStoresForDanishWeekday(getCopenhagenWeekday())
  const catchUp = await resolveGomaCatchUpStores()
  return {
    stores: mergeGomaStoreLists(scheduled, catchUp),
    scheduled,
    catchUp,
  }
}

async function syncViaProduction(stores: GomaStoreName[]): Promise<void> {
  const siteUrl = (process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || '').replace(
    /\/$/,
    '',
  )
  const cronSecret = process.env.CRON_SECRET
  if (!siteUrl || !cronSecret) {
    throw new Error(
      'Mangler GOMA_API_KEY og kan ikke falde tilbage til Vercel (SITE_URL + CRON_SECRET)',
    )
  }

  const errors: string[] = []
  for (let i = 0; i < stores.length; i++) {
    const store = stores[i]
    const last = i === stores.length - 1
    const url = `${siteUrl}/api/admin/goma/scheduled-sync?stores=${encodeURIComponent(store)}&catchUp=0${last ? '' : '&skipCleanup=1'}`
    console.log(`▶ Vercel Goma sync: ${store}`)
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-cron-secret': cronSecret,
      },
    })
    const body = await res.text()
    if (!res.ok) {
      errors.push(`${store}: HTTP ${res.status} ${body.slice(0, 400)}`)
      console.error(`❌ ${store}`, res.status, body.slice(0, 400))
      continue
    }
    console.log(`✅ ${store}`, body.slice(0, 300))
  }
  if (errors.length) {
    throw new Error(errors.join('\n'))
  }
}

async function main(): Promise<void> {
  if (!isGomaImportEnabled() && !args.has('--print-stores')) {
    console.log('GOMA_IMPORT_ENABLED er ikke true — intet at køre.')
    return
  }

  const { stores, scheduled, catchUp } = await resolveStores()
  console.log('scheduled:', scheduled.join(', ') || '(ingen)')
  console.log('catch-up:', catchUp.join(', ') || '(ingen)')
  console.log('kører:', stores.join(', ') || '(ingen)')

  if (args.has('--print-stores')) {
    console.log(stores.join(','))
    return
  }

  if (stores.length === 0) {
    console.log('Ingen Goma-kæder i dag og ingen catch-up.')
    try {
      const cleanup = await cleanupExpiredOffers()
      console.log('FF expired-offer cleanup:', cleanup.cleaned)
    } catch (err) {
      console.warn('Cleanup sprunget over:', err instanceof Error ? err.message : err)
    }
    return
  }

  if (process.env.GOMA_API_KEY?.trim()) {
    const result = await syncGoma({ stores: [...stores] })
    console.log('Goma sync', {
      imported: result.totalImported,
      synced: result.storesSynced,
      errors: result.errors,
    })
    try {
      const cleanup = await cleanupExpiredOffers()
      console.log('FF expired-offer cleanup:', cleanup.cleaned)
    } catch (err) {
      console.warn('Cleanup fejlede (non-fatal):', err instanceof Error ? err.message : err)
    }
    if (result.errors.length) process.exit(1)
    return
  }

  await syncViaProduction(stores)
}

main().catch((err) => {
  console.error('FATAL', err)
  process.exit(1)
})
