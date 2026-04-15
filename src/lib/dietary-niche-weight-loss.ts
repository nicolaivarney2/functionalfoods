/**
 * Matcher niche til vægttab-side (fx keto/vaegttab, sense/vaegttab osv.).
 * Bruger først mainCategory hvis den matcher en kendt niche, ellers dietaryCategories.
 *
 * Bemærk: `mainCategory` i Recipe er typisk måltidstype (Aftensmad, Frokost).
 * Matcher den ikke en niche-regel, falder vi tilbage til dietaryCategories uændret.
 */

export type NicheWeightLossLink = {
  label: string
  href: string
  /** Ingen kendt niche — vis kortere tekst og link til generel vægttab-side */
  generic: boolean
}

function normalizeCategory(cat: string): string {
  return cat.trim().toLowerCase().replace(/\s+/g, ' ')
}

type Rule = { match: (n: string) => boolean; label: string; href: string }

const RULES: Rule[] = [
  { match: (n) => n === 'keto', label: 'Keto', href: '/keto/vaegttab' },
  { match: (n) => n === 'sense', label: 'Sense', href: '/sense/vaegttab' },
  {
    match: (n) => n === 'familiemad' || n === 'familie',
    label: 'Kalorietælling',
    href: '/kalorietaelling/vaegttab',
  },
  {
    match: (n) => n === 'proteinrig kost' || n === 'proteinrig',
    label: 'Proteinrig kost',
    href: '/proteinrig-kost/vaegttab',
  },
  {
    match: (n) =>
      n === 'antiinflammatorisk' ||
      n === 'anti-inflammatorisk' ||
      n === 'anti inflammatorisk',
    label: 'Anti-inflammatorisk kost',
    href: '/anti-inflammatory/vaegttab',
  },
  {
    match: (n) => n === 'fleksitarisk' || n === 'flexitarian',
    label: 'Fleksitarisk kost',
    href: '/flexitarian/vaegttab',
  },
  {
    match: (n) =>
      n === '5:2' ||
      n === '5:2 diæt' ||
      n === '5-2' ||
      n.startsWith('5:2'),
    label: '5:2-diæt',
    href: '/5-2-diet/vaegttab',
  },
  {
    match: (n) =>
      n === 'glp-1 kost' ||
      n === 'glp-1' ||
      n === 'glp1 kost' ||
      n === 'glp1',
    label: 'GLP-1 kost',
    href: '/GLP-1/vaegttab',
  },
  {
    match: (n) =>
      n === 'lchf' ||
      n === 'lchf/paleo' ||
      n === 'paleo' ||
      n === 'lchf / paleo',
    label: 'LCHF/Paleo',
    href: '/lchf-paleo/vaegttab',
  },
]

const FALLBACK_HREF = '/vaegttab'

function matchNicheFromString(raw: string | undefined | null): NicheWeightLossLink | null {
  if (!raw?.trim()) return null
  const n = normalizeCategory(raw)
  for (const rule of RULES) {
    if (rule.match(n)) {
      return { label: rule.label, href: rule.href, generic: false }
    }
  }
  return null
}

/**
 * 1) `mainCategory` hvis den matcher en kendt niche (fx ikke "Aftensmad").
 * 2) Ellers første match i `dietaryCategories` (rækkefølge bevares).
 * 3) Ellers generel vægttab-side.
 */
export function resolveNicheWeightLossLink(
  dietaryCategories: string[] | undefined | null,
  mainCategory?: string | null
): NicheWeightLossLink {
  const fromMain = matchNicheFromString(mainCategory)
  if (fromMain) {
    return fromMain
  }

  if (!dietaryCategories?.length) {
    return { label: '', href: FALLBACK_HREF, generic: true }
  }
  for (const raw of dietaryCategories) {
    const hit = matchNicheFromString(raw)
    if (hit) {
      return hit
    }
  }
  return { label: '', href: FALLBACK_HREF, generic: true }
}
