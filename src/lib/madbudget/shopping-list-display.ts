/**
 * Visning og aggregering AF API-svar fra /api/madbudget/shopping-list-prices.
 * Bruges af madbudget-siden (web). App-repo spejler denne fil i src/lib/shopping-list.ts.
 */

import { resolveProductForDisplay } from '@/lib/madbudget/guide-prices'

export { resolveProductForDisplay, productDisplayTotal } from '@/lib/madbudget/guide-prices'

export type StorePriceProduct = {
  name?: string
  price?: number
  totalPrice?: number
  isGuidePrice?: boolean
  isOnSale?: boolean
}

export type StorePricesMap = Record<string, Record<string, StorePriceProduct>>

export type ShoppingListDisplayItem = {
  name: string
  category?: string
  isBasis?: boolean
}

/** "500 g" / "3,4 kg" / "2 stk". */
export function formatShoppingQty(amount: number, unit: string): string {
  if (!amount || amount <= 0) return ''
  const u = unit.toLowerCase().trim()
  if ((u === 'g' || u === 'gram' || u === 'grams') && amount >= 1000) {
    const kg = Math.round((amount / 1000) * 10) / 10
    const num = Number.isInteger(kg) ? String(kg) : String(kg).replace('.', ',')
    return `${num} kg`
  }
  const r = Math.round(amount * 10) / 10
  const num = Number.isInteger(r) ? String(r) : String(r).replace('.', ',')
  return `${num} ${unit}`.trim()
}

export function isCountableShoppingItem(item: ShoppingListDisplayItem): boolean {
  if (item.isBasis) return false
  const n = item.category?.toLowerCase() || ''
  if (n.includes('varer du måske') || n.includes('allerede har')) return false
  return true
}

/** Produkt-opslag pr. butik (exact + fuzzy key — som madbudget/indkøbsliste-rækker). */
export function findProductForStore(
  itemName: string,
  storeKey: string,
  storePrices: StorePricesMap,
  useGuidePrices: boolean
): StorePriceProduct | null {
  if (!storeKey || !storePrices[storeKey]) return null

  const itemNameLower = itemName?.toLowerCase().trim() || ''
  if (!itemNameLower) return null

  let product = resolveProductForDisplay(storePrices[storeKey][itemNameLower], useGuidePrices)
  if (!product) {
    const foundKey = Object.keys(storePrices[storeKey]).find(
      (key) => key.includes(itemNameLower) || itemNameLower.includes(key)
    )
    if (foundKey) {
      product = resolveProductForDisplay(storePrices[storeKey][foundKey], useGuidePrices)
    }
  }
  return product
}

export function storeTotalFromPrices(
  storePrices: StorePricesMap,
  storeKey: string,
  items: ShoppingListDisplayItem[],
  useGuidePrices = true
): number {
  let sum = 0
  for (const it of items) {
    if (!isCountableShoppingItem(it)) continue
    const p = findProductForStore(it.name, storeKey, storePrices, useGuidePrices)
    if (p) sum += p.totalPrice ?? p.price ?? 0
  }
  return Math.round(sum)
}

export function storeCoverageFromPrices(
  storePrices: StorePricesMap,
  storeKey: string,
  items: ShoppingListDisplayItem[]
): { found: number; total: number; percentage: number } {
  let found = 0
  let total = 0
  for (const it of items) {
    if (!isCountableShoppingItem(it)) continue
    total += 1
    const p = findProductForStore(it.name, storeKey, storePrices, true)
    if (p && !p.isGuidePrice) found += 1
  }
  return { found, total, percentage: total ? Math.round((found / total) * 100) : 0 }
}

export function guidePriceCountFromPrices(
  storePrices: StorePricesMap,
  storeKey: string,
  items: ShoppingListDisplayItem[]
): number {
  let n = 0
  for (const it of items) {
    if (!isCountableShoppingItem(it)) continue
    const p = findProductForStore(it.name, storeKey, storePrices, true)
    if (p?.isGuidePrice) n += 1
  }
  return n
}
