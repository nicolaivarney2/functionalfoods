/**
 * Tilbuds-only kæder skifter Goma/Tjek-id hver uge. Kuraterede rækker i
 * product_ingredient_matches er stadig gyldige — men product_external_id er død.
 *
 * Vi genskaber KUN et live tilbud, hvis name_store er det samme som et
 * product_name_snapshot I ALLEREDE har matchet til ingrediensen i den butik.
 * Ingen gæt ud fra ingrediensordet («kylling» → tilfældig kyllingepølse).
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
