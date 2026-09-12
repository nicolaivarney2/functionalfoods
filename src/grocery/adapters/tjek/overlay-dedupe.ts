/**
 * Salling Tjek-overlay må kun fylde huller Algolia ikke har som live tilbud.
 * Papiravisen gentager Coca-Cola, kaffe osv. — de skal ikke vises to gange.
 */

const STOP = new Set([
  'eller',
  'og',
  'med',
  'fra',
  'til',
  'stk',
  'pakke',
  'sodavand',
  'oeko',
  'oko',
  'okologisk',
  'oekologisk',
])

export function normalizeOfferName(name: string): string {
  return name
    .toLowerCase()
    .replace(/ø/g, 'oe')
    .replace(/æ/g, 'ae')
    .replace(/å/g, 'aa')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function tokens(name: string): Set<string> {
  return new Set(
    normalizeOfferName(name)
      .split(' ')
      .filter((t) => t.length > 2 && !STOP.has(t)),
  )
}

export function tjekOverlayDuplicatesCatalog(
  tjekHeading: string,
  catalogSaleNames: readonly string[],
): boolean {
  const tjekNorm = normalizeOfferName(tjekHeading)
  if (tjekNorm.length < 4) return false
  const tjekTokens = tokens(tjekHeading)
  if (tjekTokens.size === 0) return false

  for (const catalogName of catalogSaleNames) {
    const catNorm = normalizeOfferName(catalogName)
    if (!catNorm) continue
    if (catNorm === tjekNorm) return true
    if (catNorm.length >= 6 && tjekNorm.length >= 6) {
      if (catNorm.includes(tjekNorm) || tjekNorm.includes(catNorm)) return true
    }
    const catTokens = tokens(catalogName)
    if (catTokens.size === 0) continue
    const tjekInCat = [...tjekTokens].every((t) => catTokens.has(t))
    const catInTjek = [...catTokens].every((t) => tjekTokens.has(t))
    if (tjekTokens.size >= 2 && tjekInCat) return true
    if (catTokens.size >= 2 && catInTjek) return true
    let inter = 0
    for (const t of tjekTokens) {
      if (catTokens.has(t)) inter++
    }
    const union = tjekTokens.size + catTokens.size - inter
    if (union > 0 && inter / union >= 0.7) return true
    if (inter >= 2) return true
  }
  return false
}
