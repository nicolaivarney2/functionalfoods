/**
 * Kuraterede rækker i product_ingredient_matches er stadig gyldige, når
 * product_external_id er dødt (avis-id skifter, eller Salling udskifter varen).
 *
 * To genveje, begge ud fra product_name_snapshot — aldrig ud fra ingrediensordet
 * («kylling» → tilfældig kyllingepølse, «flødeost» → peberfrugt med flødeost):
 *
 * - Tilbudsaviser: name_store skal være det samme som snapshot.
 * - Fuldt katalog: den live vare skal starte med samme produktlinje som snapshot
 *   («Flødeost naturel …» → «Flødeost 21% fedt», «Radiser m. top» → «Radiser»).
 */

import { normalizeForSearch } from '@/lib/price-alerts/helpers'
import type { LiveOfferRow } from '@/lib/madbudget/shopping-list-pricing'

export function normalizeOfferLabel(name: string): string {
  return normalizeForSearch(name)
}

export function liveOffersForCuratedSnapshots<T extends LiveOfferRow>(
  curatedNames: Array<string | null | undefined>,
  offers: T[]
): T[] {
  const allowed = new Set(
    curatedNames.map((n) => normalizeOfferLabel(String(n || ''))).filter((n) => n.length >= 3)
  )
  if (allowed.size === 0) return []
  return offers.filter((offer) => allowed.has(normalizeOfferLabel(String(offer.name_store || ''))))
}

/** Tilberedning foran varen. Alene er ordet for bredt («hakket» → hakket kylling). */
const PRODUCT_LINE_MODIFIERS = new Set([
  'hakket',
  'frisk',
  'friske',
  'frossen',
  'frosne',
  'marineret',
  'marinerede',
  'paneret',
  'panerede',
  'roget',
  'kogt',
  'stegt',
  'dansk',
  'danske',
  'okologisk',
  'oeko',
  'organic',
  'skaaret',
  'skaret',
])

/**
 * Første betydende ord i et kurateret varenavn.
 * «Flødeost naturel 16% …» → «flødeost». «Hakket oksekød» → «hakket oksekød».
 */
export function productLinePhrase(name: string | null | undefined): string {
  const tokens = String(name || '')
    .replace(/[()]/g, ' ')
    .split(/[\s,/]+/)
    .map((token) => token.replace(/[^\p{L}\p{N}-]/gu, ''))
    .filter(Boolean)

  const significant: string[] = []
  for (const token of tokens) {
    const folded = normalizeForSearch(token)
    if (folded.length < 4) continue
    if (/^\d+$/.test(folded)) continue
    significant.push(token.toLowerCase())
    if (significant.length === 2) break
  }

  if (significant.length === 0) return ''
  const first = normalizeForSearch(significant[0])
  if (PRODUCT_LINE_MODIFIERS.has(first)) {
    return significant[1] ? `${significant[0]} ${significant[1]}` : ''
  }
  return significant[0]
}

export function offerStartsWithProductLine(offerName: string, phrase: string): boolean {
  const name = normalizeOfferLabel(offerName)
  const head = normalizeOfferLabel(phrase)
  if (!name || head.length < 4) return false
  return name === head || name.startsWith(`${head} `)
}

/** Live katalogvarer i samme produktlinje som et kurateret snapshot. */
export function liveOffersForCuratedProductLine<T extends LiveOfferRow>(
  curatedNames: Array<string | null | undefined>,
  offers: T[]
): T[] {
  const phrases = [
    ...new Set(curatedNames.map((name) => productLinePhrase(name)).filter((phrase) => phrase.length >= 4)),
  ]
  if (phrases.length === 0) return []
  return offers.filter((offer) =>
    phrases.some((phrase) => offerStartsWithProductLine(String(offer.name_store || ''), phrase))
  )
}

/** PostgREST-sikkert prefix. Tom streng hvis navnet ikke kan bruges i et or-filter. */
export function productLinePrefixFilter(phrase: string): string | null {
  const cleaned = phrase.trim().toLowerCase()
  if (cleaned.length < 4 || cleaned.length > 40) return null
  if (!/^[\p{L}\p{N} -]+$/u.test(cleaned)) return null
  return `name_store.ilike."${cleaned}*"`
}
