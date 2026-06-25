/**
 * READ-ONLY diagnose af fooddata-sync. Skriver INTET (hverken DB eller env).
 *
 * Tjekker:
 *   1. FF hoved-DB: hvornår importen sidst kørte (products.metadata.synced_from_fooddata_at)
 *   2. Fooddata-DB: seneste sync_logs + friskhed (products.last_seen_at)
 *
 * Brug: npx tsx scripts/diagnose-fooddata-sync.ts
 */

import { config as loadEnv } from 'dotenv'
import { resolve } from 'node:path'
loadEnv({ path: resolve(process.cwd(), '.env.local') })

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

function clientOrNull(url?: string, key?: string): SupabaseClient | null {
  if (!url || !key) return null
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
    db: { schema: 'public' },
  })
}

function line(label: string) {
  console.log('\n' + '─'.repeat(64))
  console.log(label)
  console.log('─'.repeat(64))
}

function ago(iso: string | null | undefined): string {
  if (!iso) return 'ukendt'
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return 'ukendt'
  const days = Math.floor((Date.now() - then) / 86_400_000)
  return `${iso}  (${days} dage siden)`
}

async function main() {
  const ffUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const ffKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const fdUrl = process.env.GROCERY_SUPABASE_URL
  const fdKey = process.env.GROCERY_SUPABASE_SECRET_KEY

  line('ENV-tjek (kun navne — ingen værdier vises)')
  console.log(`  NEXT_PUBLIC_SUPABASE_URL    : ${ffUrl ? 'sat' : 'MANGLER'}`)
  console.log(`  SUPABASE_SERVICE_ROLE_KEY   : ${ffKey ? 'sat' : 'MANGLER'}`)
  console.log(`  GROCERY_SUPABASE_URL        : ${fdUrl ? 'sat' : 'MANGLER'}`)
  console.log(`  GROCERY_SUPABASE_SECRET_KEY : ${fdKey ? 'sat' : 'MANGLER'}`)

  const ff = clientOrNull(ffUrl, ffKey)
  const fd = clientOrNull(fdUrl, fdKey)

  // ── 1. FF hoved-DB: hvornår kørte importen sidst? ───────────────────────
  line('1) FF hoved-DB — sidste fooddata-import (det /dagligvarer viser)')
  if (!ff) {
    console.log('  ⊘ Springer over — FF env mangler.')
  } else {
    const { count: productCount } = await ff
      .from('products')
      .select('id', { count: 'exact', head: true })
    console.log(`  products i alt              : ${productCount ?? '?'}`)

    const { data: newest, error: nErr } = await ff
      .from('products')
      .select('id, metadata')
      .order('metadata->>synced_from_fooddata_at', { ascending: false })
      .limit(1)
    if (nErr) {
      console.log(`  ⚠ kunne ikke læse synced_from_fooddata_at: ${nErr.message}`)
    } else {
      const ts = newest?.[0]?.metadata?.synced_from_fooddata_at as string | undefined
      console.log(`  Seneste import (synced_from_fooddata_at): ${ago(ts)}`)
    }

    const { data: offer, error: oErr } = await ff
      .from('product_offers')
      .select('last_seen_at')
      .order('last_seen_at', { ascending: false })
      .limit(1)
    if (!oErr) {
      console.log(`  Seneste product_offers.last_seen_at     : ${ago(offer?.[0]?.last_seen_at)}`)
    }
  }

  // ── 2. Fooddata-DB: kører scraperen? ────────────────────────────────────
  line('2) Fooddata-DB — kører den natlige scraper?')
  if (!fd) {
    console.log('  ⊘ Springer over — GROCERY env mangler.')
  } else {
    const { count: fdProducts } = await fd
      .from('products')
      .select('id', { count: 'exact', head: true })
    console.log(`  products i alt              : ${fdProducts ?? '?'}`)

    const { data: fresh } = await fd
      .from('products')
      .select('last_seen_at')
      .order('last_seen_at', { ascending: false })
      .limit(1)
    console.log(`  Seneste products.last_seen_at : ${ago(fresh?.[0]?.last_seen_at)}`)

    const { data: logs, error: lErr } = await fd
      .from('sync_logs')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(12)
    if (lErr) {
      console.log(`  ⚠ kunne ikke læse sync_logs: ${lErr.message}`)
    } else if (!logs?.length) {
      console.log('  ⚠ Ingen sync_logs fundet — scraperen har aldrig kørt (eller logger ikke).')
    } else {
      console.log('\n  Seneste sync-kørsler:')
      for (const l of logs) {
        const started = l.started_at ?? l.created_at ?? '?'
        const src = l.source ?? l.chain ?? l.adapter ?? '?'
        const status = l.status ?? '?'
        const rows = l.rows_affected ?? l.products_count ?? l.offers_count ?? ''
        console.log(`   • ${started}  [${status}]  ${src}  ${rows !== '' ? `(${rows} rows)` : ''}`)
      }
    }
  }

  line('FÆRDIG (intet blev skrevet)')
}

main().catch((err) => {
  console.error('\nFATAL', err)
  process.exit(1)
})
