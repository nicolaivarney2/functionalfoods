#!/usr/bin/env node
/**
 * Batch-genberegning af ernæring (Frida) for opskrifter.
 *
 * Kører mod den lokale dev-server (port 3002 som default), så der ingen
 * Vercel-timeout er, og du kan se progress live. Gemmer ændringer i Supabase
 * præcis som /api/recalculate-nutrition gør pr. opskrift.
 *
 * Brug:
 *   # Tør-kørsel på 5 opskrifter (ingen DB-skrivning):
 *   node --env-file=.env.local scripts/recalc-all-nutrition.mjs --limit 5 --dry-run
 *
 *   # Rigtig genberegning af 5 opskrifter:
 *   node --env-file=.env.local scripts/recalc-all-nutrition.mjs --limit 5
 *
 *   # ALLE opskrifter:
 *   node --env-file=.env.local scripts/recalc-all-nutrition.mjs
 *
 * Flags:
 *   --limit N        Behandl højst N opskrifter (default: alle)
 *   --concurrency N  Antal parallelle kald (default: 2)
 *   --base URL       Base URL (default: http://localhost:3002)
 *   --dry-run        Hent recipe-listen, men kald ikke endpointet
 *   --offset N       Spring de første N opskrifter over (til genoptag)
 *   --filter-empty   Kør kun opskrifter hvor nutrition mangler/er 0
 */

import { createClient } from '@supabase/supabase-js'

const args = process.argv.slice(2)
function getFlag(name, fallback) {
  const i = args.indexOf(`--${name}`)
  if (i === -1) return fallback
  const v = args[i + 1]
  if (!v || v.startsWith('--')) return true
  return v
}

const LIMIT = Number(getFlag('limit', 0)) || 0
const OFFSET = Number(getFlag('offset', 0)) || 0
const CONCURRENCY = Math.max(1, Number(getFlag('concurrency', 2)) || 2)
const BASE = String(getFlag('base', 'http://localhost:3002'))
const DRY_RUN = Boolean(getFlag('dry-run', false))
const FILTER_EMPTY = Boolean(getFlag('filter-empty', false))

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!SUPABASE_URL || !SUPABASE_SERVICE) {
  console.error('Mangler NEXT_PUBLIC_SUPABASE_URL eller SUPABASE_SERVICE_ROLE_KEY i miljøet.')
  console.error('Kør med:  node --env-file=.env.local scripts/recalc-all-nutrition.mjs ...')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE)

console.log('═'.repeat(60))
console.log('Frida nutrition recalc')
console.log('  base       :', BASE)
console.log('  concurrency:', CONCURRENCY)
console.log('  limit      :', LIMIT || 'alle')
console.log('  offset     :', OFFSET)
console.log('  dry-run    :', DRY_RUN ? 'ja' : 'nej')
console.log('  filter     :', FILTER_EMPTY ? 'kun opskrifter uden nutrition' : 'ingen filter')
console.log('═'.repeat(60))

let query = supabase.from('recipes').select('id, title, calories', { count: 'exact' }).order('id', { ascending: true })
if (FILTER_EMPTY) {
  query = query.or('calories.is.null,calories.eq.0')
}
const pageSize = 1000
const all = []
let from = 0
while (true) {
  const { data, error, count } = await query.range(from, from + pageSize - 1)
  if (error) {
    console.error('Kunne ikke hente recipes:', error.message)
    process.exit(1)
  }
  all.push(...(data || []))
  if (!data || data.length < pageSize) {
    if (count != null) console.log(`Fundet ${count} opskrifter (${all.length} hentet).`)
    break
  }
  from += pageSize
}

let work = all.slice(OFFSET)
if (LIMIT) work = work.slice(0, LIMIT)
console.log(`Kommer til at behandle: ${work.length} opskrifter`)

if (DRY_RUN) {
  console.log('--- DRY RUN — første 10 opskrifter der ville blive genberegnet:')
  for (const r of work.slice(0, 10)) {
    console.log(`  ${r.id}  ${r.title}`)
  }
  process.exit(0)
}

let processed = 0
let succeeded = 0
let failed = 0
const failures = []
const startedAt = Date.now()

async function processOne(recipe) {
  const t0 = Date.now()
  try {
    const res = await fetch(`${BASE}/api/recalculate-nutrition`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipeId: recipe.id }),
    })
    const text = await res.text()
    let json = null
    try {
      json = JSON.parse(text)
    } catch {
      // ignore
    }
    if (!res.ok || !json?.success) {
      failed += 1
      const msg = json?.error || json?.details || `HTTP ${res.status}`
      failures.push({ id: recipe.id, title: recipe.title, error: msg })
      console.log(`✗ ${recipe.id}  ${recipe.title}  — ${msg}`)
    } else {
      succeeded += 1
      const matched = json.matchedIngredients ?? '?'
      const total = json.totalIngredients ?? '?'
      const cal = json?.nutrition?.calories != null ? Math.round(json.nutrition.calories) : '?'
      const ms = Date.now() - t0
      console.log(`✓ ${recipe.id}  ${recipe.title}  matched=${matched}/${total}  cal=${cal}  (${ms}ms)`)
    }
  } catch (err) {
    failed += 1
    const msg = err instanceof Error ? err.message : String(err)
    failures.push({ id: recipe.id, title: recipe.title, error: msg })
    console.log(`✗ ${recipe.id}  ${recipe.title}  — ${msg}`)
  } finally {
    processed += 1
    if (processed % 25 === 0 || processed === work.length) {
      const elapsedSec = Math.round((Date.now() - startedAt) / 1000)
      const rate = (processed / Math.max(1, elapsedSec)).toFixed(1)
      const remain = work.length - processed
      const etaSec = Math.round(remain / Math.max(0.01, Number(rate) || 0))
      console.log(
        `… ${processed}/${work.length}  ok=${succeeded} fail=${failed}  ${rate}/s  eta ${etaSec}s`,
      )
    }
  }
}

async function runWithConcurrency(items, n, fn) {
  const queue = items.slice()
  const workers = Array.from({ length: n }, async () => {
    while (queue.length > 0) {
      const next = queue.shift()
      if (!next) break
      await fn(next)
    }
  })
  await Promise.all(workers)
}

await runWithConcurrency(work, CONCURRENCY, processOne)

const elapsed = Math.round((Date.now() - startedAt) / 1000)
console.log('═'.repeat(60))
console.log(`Færdig. ${succeeded} ok, ${failed} fejl på ${elapsed}s`)
if (failures.length > 0) {
  console.log('Første 20 fejl:')
  for (const f of failures.slice(0, 20)) {
    console.log(`  ${f.id}  ${f.title}  — ${f.error}`)
  }
}
process.exit(failed > 0 ? 2 : 0)
