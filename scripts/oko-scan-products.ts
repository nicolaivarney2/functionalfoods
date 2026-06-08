/**
 * Sæt organic_tags på VARER (produkter).
 *
 * Regler (kun ud fra NAVN — aldrig kategori alene):
 *   1. ØKO eller ØKOLOGI i navn  → organic-priority
 *   2. ØKO/ØKOLOGI i navn + mejeri eller kød (category/department) → også organic-animal
 *
 * Navne der tjekkes: name_generic + butiksnavne (product_offers.name_store).
 *
 *   npm run oko:scan-products              # preview
 *   npm run oko:scan-products:execute      # gem i FF + fooddata (hvis konfigureret)
 */
import { config } from 'dotenv'
import { resolve } from 'path'

config({ path: resolve(process.cwd(), '.env.local') })

import { createSupabaseServiceClient } from '../src/lib/supabase'
import {
  computeProductOrganicTags,
  hasOkoOrOkologiInProductName,
  normalizeProductOrganicTags,
  type ProductOrganicTagId,
} from '../src/lib/madbudget/organic-preference'
import {
  getFooddataPublishClient,
  isFooddataPublishConfigured,
  upsertProductOrganicTagsBatchInFooddata,
} from '../src/lib/fooddata-publish'

const EXECUTE = process.argv.includes('--execute')
const PRODUCT_PAGE = 1000
const OFFER_CHUNK = 100
const UPDATE_CHUNK = 100
const MAX_RETRIES = 4

interface ProductRow {
  id: string
  name_generic: string | null
  category: string | null
  department: string | null
  organic_tags: string[] | null
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

function tagsEqual(a: ProductOrganicTagId[], b: ProductOrganicTagId[]): boolean {
  return a.length === b.length && a.every((t) => b.includes(t))
}

async function withRetry<T>(label: string, fn: () => Promise<T>): Promise<T> {
  let lastErr: unknown
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastErr = err
      if (attempt < MAX_RETRIES) {
        const wait = 500 * attempt
        console.warn(`⚠️  ${label} (forsøg ${attempt}/${MAX_RETRIES}) — venter ${wait}ms…`)
        await sleep(wait)
      }
    }
  }
  throw lastErr
}

async function fetchAllProducts(
  supabase: ReturnType<typeof createSupabaseServiceClient>
): Promise<ProductRow[]> {
  const products: ProductRow[] = []
  let offset = 0

  while (true) {
    const { data, error } = await withRetry(`products ${offset}`, () =>
      supabase
        .from('products')
        .select('id, name_generic, category, department, organic_tags')
        .order('id')
        .range(offset, offset + PRODUCT_PAGE - 1)
    )

    if (error) throw error
    if (!data?.length) break

    products.push(...(data as ProductRow[]))
    if (products.length % 10_000 === 0 || data.length < PRODUCT_PAGE) {
      console.log(`   … ${products.length} produkter hentet`)
    }

    if (data.length < PRODUCT_PAGE) break
    offset += PRODUCT_PAGE
  }

  return products
}

async function fetchOfferNamesByProduct(
  supabase: ReturnType<typeof createSupabaseServiceClient>,
  productIds: string[]
): Promise<Map<string, string[]>> {
  const byProduct = new Map<string, string[]>()
  const totalChunks = Math.ceil(productIds.length / OFFER_CHUNK)

  for (let i = 0; i < productIds.length; i += OFFER_CHUNK) {
    const chunk = productIds.slice(i, i + OFFER_CHUNK)
    const chunkNo = Math.floor(i / OFFER_CHUNK) + 1

    if (chunkNo === 1 || chunkNo % 50 === 0 || chunkNo === totalChunks) {
      console.log(`   Henter butiksnavne: ${chunkNo}/${totalChunks}…`)
    }

    const { data, error } = await withRetry(`offers ${chunkNo}`, () =>
      supabase
        .from('product_offers')
        .select('product_id, name_store')
        .in('product_id', chunk)
    )

    if (error) {
      console.warn(`⚠️  Sprang offer-chunk ${chunkNo} over: ${error.message}`)
      continue
    }

    for (const row of data ?? []) {
      const pid = String(row.product_id)
      const names = byProduct.get(pid) ?? []
      if (row.name_store) names.push(String(row.name_store))
      byProduct.set(pid, names)
    }
  }

  return byProduct
}

function exampleName(product: ProductRow, offerNames: string[]): string {
  const fromOffers = offerNames.find((n) => hasOkoOrOkologiInProductName(n))
  if (fromOffers) return fromOffers
  if (product.name_generic && hasOkoOrOkologiInProductName(product.name_generic)) {
    return product.name_generic
  }
  return product.name_generic ?? product.id
}

async function main() {
  const supabase = createSupabaseServiceClient()

  try {
    await withRetry('probe organic_tags', () =>
      supabase.from('products').select('organic_tags').limit(1)
    )
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    if (/organic_tags/i.test(msg)) {
      console.error(
        '\n❌ Kolonnen organic_tags mangler. Kør migration:\n' +
          '   supabase/migrations/20260607130000_add_products_organic_tags.sql\n'
      )
      process.exit(1)
    }
    throw err
  }

  console.log('📦 Henter alle produkter…')
  const products = await fetchAllProducts(supabase)
  if (products.length === 0) {
    console.log('\n⚠️  Ingen produkter fundet.\n')
    return
  }

  const needsStoreNames = products.filter(
    (p) => !hasOkoOrOkologiInProductName(p.name_generic ?? '')
  )
  console.log(
    `📦 Henter butiksnavne for ${needsStoreNames.length}/${products.length} produkter (øko kun i butiksnavn)…`
  )
  const offerNamesByProduct = await fetchOfferNamesByProduct(
    supabase,
    needsStoreNames.map((p) => p.id)
  )

  const toSet: Array<{
    id: string
    tags: ProductOrganicTagId[]
    exampleName: string
    action: 'set' | 'clear'
  }> = []

  let priorityCount = 0
  let animalCount = 0
  let alreadyOk = 0
  let toClearCount = 0

  for (const product of products) {
    const offerNames = offerNamesByProduct.get(product.id) ?? []
    const computed = computeProductOrganicTags(
      product.name_generic,
      offerNames,
      product.category,
      product.department
    )
    const current = normalizeProductOrganicTags(product.organic_tags)

    if (computed.length > 0) {
      priorityCount++
      if (computed.includes('organic-animal')) animalCount++
    }

    if (tagsEqual(computed, current)) {
      alreadyOk++
      continue
    }

    if (computed.length === 0 && current.length > 0) {
      toClearCount++
      toSet.push({
        id: product.id,
        tags: [],
        exampleName: product.name_generic ?? product.id,
        action: 'clear',
      })
      continue
    }

    if (computed.length > 0) {
      toSet.push({
        id: product.id,
        tags: computed,
        exampleName: exampleName(product, offerNames),
        action: 'set',
      })
    }
  }

  const toApply = toSet.filter((r) => r.action === 'set')
  const toClear = toSet.filter((r) => r.action === 'clear')

  console.log(`\n🌿 Øko-tags scan (${EXECUTE ? 'EXECUTE' : 'PREVIEW'})`)
  console.log(`   Produkter scannet:        ${products.length.toLocaleString('da-DK')}`)
  console.log(`   Allerede korrekte:        ${alreadyOk.toLocaleString('da-DK')}`)
  console.log(`   Med øko/økologi i navn:   ${priorityCount.toLocaleString('da-DK')}`)
  console.log(`   → organic-priority:     ${priorityCount.toLocaleString('da-DK')}`)
  console.log(`   → organic-animal:       ${animalCount.toLocaleString('da-DK')}`)
  console.log(`   Skal sættes/opdateres:    ${toApply.length.toLocaleString('da-DK')}`)
  console.log(`   Skal fjernes (stale):     ${toClear.length.toLocaleString('da-DK')}`)

  if (toApply.length > 0) {
    console.log('\n── Eksempler: sæt tags (max 15) ──')
    for (const row of toApply.slice(0, 15)) {
      console.log(`   ${row.exampleName}`)
      console.log(`     ${row.id}  →  ${row.tags.join(', ')}`)
    }
    if (toApply.length > 15) console.log(`   … og ${toApply.length - 15} flere`)
  }

  if (toClear.length > 0) {
    console.log('\n── Eksempler: fjern stale tags (max 5) ──')
    for (const row of toClear.slice(0, 5)) {
      console.log(`   ${row.exampleName}  (${row.id})`)
    }
    if (toClear.length > 5) console.log(`   … og ${toClear.length - 5} flere`)
  }

  if (!EXECUTE) {
    console.log('\n💡 Kør med --execute for at gemme:\n')
    console.log('   npm run oko:scan-products:execute\n')
    return
  }

  console.log('\n💾 Gemmer organic_tags…')
  let updated = 0
  let failed = 0

  for (let i = 0; i < toSet.length; i += UPDATE_CHUNK) {
    const batch = toSet.slice(i, i + UPDATE_CHUNK)
    await Promise.all(
      batch.map(async (row) => {
        const { error } = await supabase
          .from('products')
          .update({ organic_tags: row.tags })
          .eq('id', row.id)

        if (error) {
          failed++
          console.error(`❌ ${row.id}: ${error.message}`)
        } else {
          updated++
        }
      })
    )

    if ((i + UPDATE_CHUNK) % 1000 === 0 || i + UPDATE_CHUNK >= toSet.length) {
      console.log(
        `   … ${Math.min(i + UPDATE_CHUNK, toSet.length)}/${toSet.length} behandlet`
      )
    }
  }

  console.log(`\n✅ Opdateret ${updated} varer (${failed} fejl)\n`)

  if (updated > 0 && isFooddataPublishConfigured()) {
    try {
      const fooddata = getFooddataPublishClient()
      const published = await upsertProductOrganicTagsBatchInFooddata(
        fooddata,
        toSet.map((row) => ({
          product_external_id: row.id,
          organic_tags: row.tags,
        }))
      )
      console.log(`✅ Publiceret ${published} rækker til fooddata product_organic_tags\n`)
    } catch (err) {
      console.warn('⚠️  fooddata publish fejlede:', err)
    }
  } else if (updated > 0) {
    console.log('ℹ️  Fooddata publish ikke konfigureret — kun FF products opdateret.\n')
  }
}

main().catch((err) => {
  console.error('Fatal:', err instanceof Error ? err.message : err)
  console.error(
    '\nTip: Tjek NEXT_PUBLIC_SUPABASE_URL og SUPABASE_SERVICE_ROLE_KEY i .env.local\n'
  )
  process.exit(1)
})
