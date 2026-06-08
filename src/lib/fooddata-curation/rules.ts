/**
 * Fælles kurering — regler for hvad der deles i fooddata vs. forbliver lokalt.
 *
 * ÉN fælles kø i fooddata for nye varer (mad only).
 * Matches og tags skrives til fooddata ved gem → begge apps puller.
 */

/** Produkt↔ingrediens match i fooddata — deles når begge apps kender id'erne. */
export type SharedCurationMatch = {
  product_external_id: string
  ingredient_id: string
  source: 'planomo' | 'ff'
}

/** Fravalg-tags på ingrediens — deles via ingredient_dietary_tags. */
export type SharedCurationIngredientTags = {
  ingredient_id: string
  food_exclusions: string[]
  source: 'planomo' | 'ff'
}

/** Øko-tags på vare — deles via product_organic_tags (produktniveau). */
export type SharedCurationProductOrganic = {
  product_external_id: string
  organic_tags: string[]
  source: 'planomo' | 'ff'
}

/** Fælles kø: én række pr. product_id i fooddata. */
export type SharedMatchQueueRow = {
  product_id: string
  status: 'pending' | 'matched' | 'dismissed'
  source: 'planomo' | 'ff'
}

/**
 * Match er **delt** når:
 * - product_external_id findes i lokal products (fooddata-nøgle)
 * - ingredient_id findes i lokal ingredients
 *
 * Ellers ligger match stadig i fooddata, men den anden app ignorerer ved pull.
 */
export function isMatchSharedLocally(
  match: { product_external_id: string; ingredient_id: string },
  localProductIds: Set<string>,
  localIngredientIds: Set<string>
): boolean {
  return (
    localProductIds.has(match.product_external_id) &&
    localIngredientIds.has(match.ingredient_id)
  )
}

/**
 * Match er **kun lokal relevans** (app-specifik ingrediens):
 * - Gemmes/pushes til fooddata (valgfrit)
 * - Anden app filtrerer ved pull
 */
export function isMatchLocalOnly(
  match: { ingredient_id: string },
  localIngredientIds: Set<string>,
  otherAppIngredientIds: Set<string>
): boolean {
  return localIngredientIds.has(match.ingredient_id) && !otherAppIngredientIds.has(match.ingredient_id)
}

/** Ugentlig kurationsdag pr. app (lokal tid). */
export const CURATION_WEEKDAY = {
  ff: 'wednesday' as const,
  planomo: 'thursday' as const,
}

export const CURATION_WEEKDAY_LABEL = {
  ff: 'Onsdag',
  planomo: 'Torsdag',
} as const
