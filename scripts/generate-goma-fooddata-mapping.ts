/**
 * Generate ff-goma-fooddata-mapping.csv for Planomo.
 *
 * Maps each DISTINCT product_external_id in FF Main product_ingredient_matches
 * to fooddata (grocery) products using same_id, ean, explicit_link, etc.
 *
 * Usage:
 *   npx tsx scripts/generate-goma-fooddata-mapping.ts
 *   npx tsx scripts/generate-goma-fooddata-mapping.ts --dry-run
 *   npx tsx scripts/generate-goma-fooddata-mapping.ts --output=output/ff-goma-fooddata-mapping.csv
 */

import { config as loadEnv } from 'dotenv'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

loadEnv({ path: resolve(process.cwd(), '.env.local') })

import { createClient } from '@supabase/supabase-js'
import { getGroceryServiceClient } from '../src/grocery/db/client'
import type { SourceChain } from '../src/grocery/types'

type MatchMethod =
  | 'same_id'
  | 'ean'
  | 'explicit_link'
  | 'name_store'
  | 'ambiguous'
  | 'none'

type MappingStatus = 'active' | 'discontinued' | 'goma_only' | 'conflict'

interface FooddataProduct {
  source_chain: SourceChain
  source_id: string
  name: string
  gtin: string | null
  active: boolean
}

interface GomaProductInfo {
  name: string
  store: string
  ean: string | null
}

interface MappingRow {
  goma_id: string
  planomo_product_id: string
  source_chain: string
  source_id: string
  match_method: MatchMethod
  status: MappingStatus
  name_goma: string
  name_fooddata: string
  ean: string
  store: string
  notes: string
}

const CHAIN_PREFIXES: Array<{ prefix: string; chain: SourceChain }> = [
  { prefix: 'rema-1000', chain: 'rema-1000' },
  { prefix: 'abc-lavpris', chain: 'abc-lavpris' },
  { prefix: 'abclavpris', chain: 'abc-lavpris' },
  { prefix: 'min-koebmand', chain: 'min-koebmand' },
  { prefix: '365discount', chain: '365discount' },
  { prefix: 'superbrugsen', chain: 'superbrugsen' },
  { prefix: 'loevbjerg', chain: 'loevbjerg' },
  { prefix: 'lovbjerg', chain: 'loevbjerg' },
  { prefix: 'foetex', chain: 'foetex' },
  { prefix: 'fotex', chain: 'foetex' },
  { prefix: 'bilka', chain: 'bilka' },
  { prefix: 'netto', chain: 'netto' },
  { prefix: 'nemlig', chain: 'nemlig' },
  { prefix: 'meny', chain: 'meny' },
  { prefix: 'kvickly', chain: 'kvickly' },
  { prefix: 'brugsen', chain: 'brugsen' },
  { prefix: 'spar', chain: 'spar' },
  { prefix: 'lidl', chain: 'lidl' },
]

const STORE_LABELS: Record<string, string> = {
  bilka: 'Bilka',
  netto: 'Netto',
  foetex: 'Føtex',
  fotex: 'Føtex',
  'rema-1000': 'REMA 1000',
  nemlig: 'Nemlig',
  meny: 'MENY',
  spar: 'SPAR',
  lidl: 'Lidl',
  kvickly: 'Kvickly',
  superbrugsen: 'SuperBrugsen',
  brugsen: 'Brugsen',
  '365discount': '365discount',
  'abc-lavpris': 'ABC Lavpris',
  abclavpris: 'ABC Lavpris',
  loevbjerg: 'Løvbjerg',
  lovbjerg: 'Løvbjerg',
  'min-koebmand': 'Min Købmand',
}

const args = new Map<string, string | boolean>()
for (const arg of process.argv.slice(2)) {
  if (arg.startsWith('--')) {
    const [k, v] = arg.replace(/^--/, '').split('=')
    args.set(k, v ?? true)
  }
}

const dryRun = Boolean(args.get('dry-run'))
const outputPath =
  typeof args.get('output') === 'string'
    ? (args.get('output') as string)
    : 'output/ff-goma-fooddata-mapping.csv'

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size))
  return out
}

function normalizeName(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function parseChainGomaId(
  gomaId: string,
): { chain: SourceChain; sourceId: string } | null {
  for (const { prefix, chain } of CHAIN_PREFIXES) {
    const withDash = `${prefix}-`
    if (gomaId.startsWith(withDash)) {
      const sourceId = gomaId.slice(withDash.length)
      if (sourceId) return { chain, sourceId }
    }
  }
  return null
}

function planomoProductId(chain: string, sourceId: string): string {
  return `${chain}-${sourceId}`
}

function extractEan(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== 'object') return null
  const m = metadata as Record<string, unknown>
  for (const key of ['ean', 'gtin', 'barcode', 'EAN', 'GTIN']) {
    const val = m[key]
    if (typeof val === 'string' && val.trim()) return val.trim()
    if (typeof val === 'number') return String(val)
  }
  return null
}

function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`
  return value
}

function rowToCsv(row: MappingRow): string {
  return [
    row.goma_id,
    row.planomo_product_id,
    row.source_chain,
    row.source_id,
    row.match_method,
    row.status,
    row.name_goma,
    row.name_fooddata,
    row.ean,
    row.store,
    row.notes,
  ]
    .map((v) => csvEscape(v))
    .join(',')
}

async function fetchDistinctGomaIds(): Promise<string[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  }
  const main = createClient(url, key)
  const ids = new Set<string>()
  let offset = 0
  while (true) {
    const { data, error } = await main
      .from('product_ingredient_matches')
      .select('product_external_id')
      .order('product_external_id')
      .range(offset, offset + 999)
    if (error) throw new Error(`Failed to fetch matches: ${error.message}`)
    if (!data?.length) break
    for (const row of data) {
      if (row.product_external_id) ids.add(String(row.product_external_id))
    }
    offset += 1000
    if (data.length < 1000) break
  }
  return [...ids].sort()
}

async function loadGomaProductInfo(
  gomaIds: string[],
): Promise<Map<string, GomaProductInfo>> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
  const main = createClient(url, key)
  const map = new Map<string, GomaProductInfo>()

  for (const ids of chunk(gomaIds, 500)) {
    const { data: supermarket } = await main
      .from('supermarket_products')
      .select('external_id, name, store, metadata')
      .in('external_id', ids)
    for (const row of supermarket ?? []) {
      map.set(String(row.external_id), {
        name: row.name || '',
        store: row.store || '',
        ean: extractEan(row.metadata),
      })
    }
  }

  for (const ids of chunk(gomaIds, 200)) {
    const { data: offers } = await main
      .from('product_offers')
      .select('store_product_id, name_store, store_id')
      .in('store_product_id', ids)
    for (const row of offers ?? []) {
      const id = String(row.store_product_id)
      if (map.has(id)) continue
      map.set(id, {
        name: row.name_store || '',
        store: STORE_LABELS[row.store_id] || row.store_id || '',
        ean: null,
      })
    }
  }

  return map
}

async function loadFooddataIndex(): Promise<{
  byKey: Map<string, FooddataProduct>
  byGtin: Map<string, FooddataProduct[]>
  byChainName: Map<string, FooddataProduct[]>
}> {
  const grocery = getGroceryServiceClient()
  const byKey = new Map<string, FooddataProduct>()
  const byGtin = new Map<string, FooddataProduct[]>()
  const byChainName = new Map<string, FooddataProduct[]>()

  const chains = [
    'bilka',
    'netto',
    'foetex',
    'rema-1000',
    'nemlig',
    'lidl',
    'meny',
    'spar',
    'kvickly',
    'superbrugsen',
    'brugsen',
    '365discount',
    'abc-lavpris',
    'min-koebmand',
    'loevbjerg',
  ] as const

  let totalLoaded = 0

  for (const chain of chains) {
    let offset = 0
    while (true) {
      const { data, error } = await grocery
        .from('products')
        .select('source_chain, source_id, name, gtin, active')
        .eq('source_chain', chain)
        .order('source_id')
        .range(offset, offset + 999)
      if (error) {
        throw new Error(`Failed to load fooddata products (${chain}): ${error.message}`)
      }
      if (!data?.length) break

      for (const row of data) {
        const product: FooddataProduct = {
          source_chain: row.source_chain as SourceChain,
          source_id: String(row.source_id),
          name: row.name || '',
          gtin: row.gtin ? String(row.gtin) : null,
          active: Boolean(row.active),
        }
        byKey.set(`${product.source_chain}:${product.source_id}`, product)

        if (product.gtin) {
          const list = byGtin.get(product.gtin) ?? []
          list.push(product)
          byGtin.set(product.gtin, list)
        }

        const nameKey = `${product.source_chain}:${normalizeName(product.name)}`
        const chainNames = byChainName.get(nameKey) ?? []
        chainNames.push(product)
        byChainName.set(nameKey, chainNames)
      }

      totalLoaded += data.length
      offset += 1000
      if (data.length < 1000) break
    }
  }

  console.log(`Fooddata rows loaded: ${totalLoaded}, unique keys: ${byKey.size}`)
  return { byKey, byGtin, byChainName }
}

function activeFooddataHit(
  byKey: Map<string, FooddataProduct>,
  chain: SourceChain,
  sourceId: string,
): FooddataProduct | null {
  const hit = byKey.get(`${chain}:${sourceId}`)
  if (hit?.active) return hit
  return null
}

function buildActiveRow(
  gomaId: string,
  hit: FooddataProduct,
  matchMethod: MatchMethod,
  gomaInfo: GomaProductInfo | undefined,
  notes = '',
): MappingRow {
  return {
    goma_id: gomaId,
    planomo_product_id: planomoProductId(hit.source_chain, hit.source_id),
    source_chain: hit.source_chain,
    source_id: hit.source_id,
    match_method: matchMethod,
    status: 'active',
    name_goma: gomaInfo?.name || '',
    name_fooddata: hit.name,
    ean: hit.gtin || gomaInfo?.ean || '',
    store:
      gomaInfo?.store ||
      STORE_LABELS[hit.source_chain] ||
      hit.source_chain,
    notes,
  }
}

function buildEmptyRow(
  gomaId: string,
  matchMethod: MatchMethod,
  status: MappingStatus,
  gomaInfo: GomaProductInfo | undefined,
  notes: string,
  partial?: Partial<Pick<MappingRow, 'source_chain' | 'source_id'>>,
): MappingRow {
  return {
    goma_id: gomaId,
    planomo_product_id: '',
    source_chain: partial?.source_chain || '',
    source_id: partial?.source_id || '',
    match_method: matchMethod,
    status,
    name_goma: gomaInfo?.name || '',
    name_fooddata: '',
    ean: gomaInfo?.ean || '',
    store: gomaInfo?.store || '',
    notes,
  }
}

function mapGomaId(
  gomaId: string,
  gomaInfo: GomaProductInfo | undefined,
  indexes: {
    byKey: Map<string, FooddataProduct>
    byGtin: Map<string, FooddataProduct[]>
    byChainName: Map<string, FooddataProduct[]>
  },
): MappingRow {
  const { byKey, byGtin, byChainName } = indexes

  if (gomaId.startsWith('python-')) {
    return buildEmptyRow(
      gomaId,
      'none',
      'goma_only',
      gomaInfo,
      'dead python-* scraper id',
    )
  }

  if (/^\d+$/.test(gomaId)) {
    const hit = activeFooddataHit(byKey, 'rema-1000', gomaId)
    if (hit) {
      return buildActiveRow(
        gomaId,
        hit,
        'explicit_link',
        gomaInfo,
        'numeric id inferred as rema-1000 source_id',
      )
    }
    return buildEmptyRow(
      gomaId,
      'none',
      'discontinued',
      gomaInfo,
      'numeric id not found in fooddata rema-1000 catalog',
      { source_chain: 'rema-1000', source_id: gomaId },
    )
  }

  const parsed = parseChainGomaId(gomaId)
  if (parsed) {
    const hit = activeFooddataHit(byKey, parsed.chain, parsed.sourceId)
    if (hit) {
      return buildActiveRow(gomaId, hit, 'same_id', gomaInfo)
    }

    const inactive = byKey.get(`${parsed.chain}:${parsed.sourceId}`)
    if (inactive && !inactive.active) {
      return buildEmptyRow(
        gomaId,
        'none',
        'discontinued',
        gomaInfo,
        'found in fooddata but inactive',
        { source_chain: parsed.chain, source_id: parsed.sourceId },
      )
    }

    if (gomaInfo?.ean) {
      const gtinHits = (byGtin.get(gomaInfo.ean) ?? []).filter((p) => p.active)
      if (gtinHits.length === 1) {
        return buildActiveRow(
          gomaId,
          gtinHits[0],
          'ean',
          gomaInfo,
          'matched via gtin from goma metadata',
        )
      }
      if (gtinHits.length > 1) {
        return buildEmptyRow(
          gomaId,
          'ambiguous',
          'conflict',
          gomaInfo,
          `${gtinHits.length} fooddata products share gtin ${gomaInfo.ean}`,
          { source_chain: parsed.chain, source_id: parsed.sourceId },
        )
      }
    }

    if (gomaInfo?.name) {
      const nameKey = `${parsed.chain}:${normalizeName(gomaInfo.name)}`
      const nameHits = (byChainName.get(nameKey) ?? []).filter((p) => p.active)
      if (nameHits.length === 1) {
        return buildActiveRow(
          gomaId,
          nameHits[0],
          'name_store',
          gomaInfo,
          'unique name+store match — manual review',
        )
      }
      if (nameHits.length > 1) {
        return buildEmptyRow(
          gomaId,
          'ambiguous',
          'conflict',
          gomaInfo,
          `${nameHits.length} fooddata name matches for ${parsed.chain}`,
          { source_chain: parsed.chain, source_id: parsed.sourceId },
        )
      }
    }

    if (parsed.chain === 'nemlig') {
      return buildEmptyRow(
        gomaId,
        'none',
        'goma_only',
        gomaInfo,
        'no fooddata row for nemlig id',
        { source_chain: parsed.chain, source_id: parsed.sourceId },
      )
    }

    return buildEmptyRow(
      gomaId,
      'none',
      'discontinued',
      gomaInfo,
      'not in fooddata catalog',
      { source_chain: parsed.chain, source_id: parsed.sourceId },
    )
  }

  return buildEmptyRow(
    gomaId,
    'none',
    'goma_only',
    gomaInfo,
    'unrecognized goma_id format',
  )
}

async function main(): Promise<void> {
  console.log('────────────────────────────────────────')
  console.log('▶ Generate Goma → fooddata mapping CSV')
  console.log(`  dryRun : ${dryRun}`)
  console.log(`  output : ${outputPath}`)
  console.log('────────────────────────────────────────')

  const gomaIds = await fetchDistinctGomaIds()
  console.log(`Loaded ${gomaIds.length} distinct product_external_id values`)

  const [gomaInfoMap, fooddataIndex] = await Promise.all([
    loadGomaProductInfo(gomaIds),
    loadFooddataIndex(),
  ])
  console.log(
    `Fooddata index: ${fooddataIndex.byKey.size} unique products, ${fooddataIndex.byGtin.size} gtins`,
  )

  const rows = gomaIds.map((id) =>
    mapGomaId(id, gomaInfoMap.get(id), fooddataIndex),
  )

  const summary = {
    total_goma_ids: rows.length,
    auto_apply: 0,
    review: 0,
    goma_only: 0,
    discontinued: 0,
    conflict: 0,
    nemlig_unmapped: 0,
    python: 0,
    by_match_method: {} as Record<string, number>,
    by_status: {} as Record<string, number>,
  }

  for (const row of rows) {
    summary.by_match_method[row.match_method] =
      (summary.by_match_method[row.match_method] ?? 0) + 1
    summary.by_status[row.status] = (summary.by_status[row.status] ?? 0) + 1

    if (row.goma_id.startsWith('python-')) summary.python++
    if (row.goma_id.startsWith('nemlig-') && row.status !== 'active') {
      summary.nemlig_unmapped++
    }

    const autoMethods = new Set(['same_id', 'ean', 'explicit_link'])
    if (autoMethods.has(row.match_method) && row.status === 'active') {
      summary.auto_apply++
    } else if (
      row.match_method === 'name_store' ||
      row.match_method === 'ambiguous'
    ) {
      summary.review++
    }
    if (row.status === 'goma_only') summary.goma_only++
    if (row.status === 'discontinued') summary.discontinued++
    if (row.status === 'conflict') summary.conflict++
  }

  const header =
    'goma_id,planomo_product_id,source_chain,source_id,match_method,status,name_goma,name_fooddata,ean,store,notes'
  const csv = [header, ...rows.map(rowToCsv)].join('\n') + '\n'

  const summaryText = [
    `total_goma_ids: ${summary.total_goma_ids}`,
    `auto_apply (same_id|ean|explicit_link + active): ${summary.auto_apply}`,
    `review (name_store|ambiguous): ${summary.review}`,
    `goma_only: ${summary.goma_only}`,
    `discontinued: ${summary.discontinued}`,
    `conflict: ${summary.conflict}`,
    `nemlig_unmapped: ${summary.nemlig_unmapped}`,
    `python-*: ${summary.python}`,
    '',
    'by_match_method:',
    ...Object.entries(summary.by_match_method)
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => `  ${k}: ${v}`),
    '',
    'by_status:',
    ...Object.entries(summary.by_status)
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => `  ${k}: ${v}`),
    '',
    `generated_at: ${new Date().toISOString()}`,
  ].join('\n')

  if (!dryRun) {
    mkdirSync(dirname(resolve(outputPath)), { recursive: true })
    writeFileSync(resolve(outputPath), csv, 'utf8')
    writeFileSync(
      resolve(outputPath).replace(/\.csv$/i, '-summary.txt'),
      summaryText + '\n',
      'utf8',
    )
  }

  console.log('')
  console.log(summaryText)
  if (!dryRun) {
    console.log('')
    console.log(`✓ Wrote ${outputPath}`)
    console.log(`✓ Wrote ${outputPath.replace(/\.csv$/i, '-summary.txt')}`)
  }
}

main().catch((err) => {
  console.error('FATAL', err)
  process.exit(1)
})
