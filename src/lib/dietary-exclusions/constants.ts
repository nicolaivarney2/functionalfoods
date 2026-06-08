export type ExclusionTagId =
  | 'red-meat'
  | 'poultry'
  | 'pork'
  | 'fish'
  | 'eggs'
  | 'shellfish'
  | 'nuts'
  | 'dairy'
  | 'gluten'
  | 'soy'

export interface ExclusionTagDefinition {
  id: ExclusionTagId
  label: string
  description: string
  isAnimalProduct: boolean
}

export const EXCLUSION_TAGS: readonly ExclusionTagDefinition[] = [
  { id: 'red-meat', label: 'Rødt kød', description: 'Oksekød, kalv, lam m.m.', isAnimalProduct: true },
  { id: 'poultry', label: 'Fjerkræ', description: 'Kylling, kalkun, and m.m.', isAnimalProduct: true },
  { id: 'pork', label: 'Svinekød', description: 'Svinekoteletter, bacon, flæsk m.m.', isAnimalProduct: true },
  { id: 'fish', label: 'Fisk', description: 'Laks, torsk, sild m.m.', isAnimalProduct: true },
  { id: 'eggs', label: 'Æg', description: 'Æg og æggeprodukter', isAnimalProduct: true },
  { id: 'shellfish', label: 'Skaldyr', description: 'Rejer, muslinger, blæksprutter m.m.', isAnimalProduct: true },
  { id: 'nuts', label: 'Nødder', description: 'Mandler, hasselnødder, peanuts m.m.', isAnimalProduct: false },
  { id: 'dairy', label: 'Mælkeprodukter', description: 'Mælk, ost, fløde, smør m.m.', isAnimalProduct: true },
  { id: 'gluten', label: 'Gluten', description: 'Hvede, rug, byg og glutenholdige produkter', isAnimalProduct: false },
  { id: 'soy', label: 'Soja', description: 'Tofu, sojasovs, sojamælk m.m.', isAnimalProduct: false },
] as const

export const EXCLUSION_TAG_IDS: readonly ExclusionTagId[] = EXCLUSION_TAGS.map((t) => t.id)
export const EXCLUSION_TAG_BY_ID = new Map(EXCLUSION_TAGS.map((t) => [t.id, t]))

const LEGACY_TAG_ALIASES: Record<string, ExclusionTagId> = {
  svinekød: 'pork',
  svin: 'pork',
  flæsk: 'pork',
  bacon: 'pork',
  fjerkræ: 'poultry',
  kylling: 'poultry',
  fisk: 'fish',
  æg: 'eggs',
  skaldyr: 'shellfish',
  nødder: 'nuts',
  mejeri: 'dairy',
  mælk: 'dairy',
  soja: 'soy',
  gluten: 'gluten',
}

export function normalizeExclusionTag(raw: string): ExclusionTagId | null {
  const trimmed = String(raw || '').trim().toLowerCase()
  if (!trimmed) return null
  if (EXCLUSION_TAG_BY_ID.has(trimmed as ExclusionTagId)) return trimmed as ExclusionTagId
  return LEGACY_TAG_ALIASES[trimmed] ?? null
}

export function normalizeExclusionTags(raw: unknown): ExclusionTagId[] {
  if (!Array.isArray(raw)) return []
  const out = new Set<ExclusionTagId>()
  for (const item of raw) {
    const normalized = normalizeExclusionTag(String(item))
    if (normalized) out.add(normalized)
  }
  return Array.from(out)
}

/** Heuristic name-based tag suggestions for admin bulk-assignment. */
export function suggestExclusionTagsFromName(name: string): ExclusionTagId[] {
  const n = name.toLowerCase().trim()
  if (!n) return []

  const suggestions = new Set<ExclusionTagId>()

  if (/\b(bacon|svine|flæsk|skinke|pølse|medister|serrano|pancetta)\b/.test(n)) {
    suggestions.add('pork')
  }
  if (/\b(okse|bøf|kalv|lamm|entrecote|hakket okse|steg|ribeye)\b/.test(n)) {
    suggestions.add('red-meat')
  }
  if (/\b(kylling|kalkun|and\b|fjerkræ|høne)\b/.test(n)) {
    suggestions.add('poultry')
  }
  if (/\b(laks|torsk|sild|fisk|tun|makrel|kulmule|rødspætte|torskefilet)\b/.test(n)) {
    suggestions.add('fish')
  }
  if (/\b(reje|musling|blæksprutte|krabbe|hummer|skaldyr)\b/.test(n)) {
    suggestions.add('shellfish')
  }
  if (/\b(æg|ægge|æggehvide|æggeblomme)\b/.test(n)) {
    suggestions.add('eggs')
  }
  if (/\b(mælk|fløde|ost|smør|yoghurt|skyr|creme fraiche|parmesan|mozzarella|ricotta|feta)\b/.test(n)) {
    suggestions.add('dairy')
  }
  if (/\b(mandel|hasselnød|valnød|peanut|cashew|pistacie|nød)\b/.test(n)) {
    suggestions.add('nuts')
  }
  if (/\b(soja|tofu|tempeh|edamame|miso)\b/.test(n)) {
    suggestions.add('soy')
  }
  if (/\b(sojasovs|sojasauce)\b/.test(n)) {
    suggestions.add('soy')
  }
  if (/\b(hvede|rug|byg|mel\b|pasta|brød|tortilla|bulgur|couscous)\b/.test(n)) {
    suggestions.add('gluten')
  }

  return Array.from(suggestions)
}
