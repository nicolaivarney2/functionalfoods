/** Shared diet choices for onboarding, Madbudget profile, and meal-plan generation. */
export const DIETARY_APPROACH_OPTIONS = [
  { id: 'keto', name: 'Keto', desc: 'Højt fedt, moderat protein, meget lavt kulhydrat' },
  { id: 'sense', name: 'Sense', desc: 'Balanceret tilgang til sund mad og vægttab' },
  { id: 'glp-1', name: 'GLP-1', desc: 'Tilpasset til GLP-1 medicin' },
  { id: 'anti-inflammatory', name: 'Anti-inflammatorisk', desc: 'Fokuserer på anti-inflammatoriske fødevarer' },
  { id: 'flexitarian', name: 'Fleksitarisk', desc: 'Primært plantebaseret med lejlighedsvis kød' },
  { id: '5-2', name: '5:2 diæt', desc: '5 dage normal spisning, 2 dage med meget lavt kalorieindtag' },
  { id: 'lchf-paleo', name: 'LCHF/Paleo', desc: 'Lavt kulhydrat, højt fedt med fokus på paleo-fødevarer' },
  { id: 'mediterranean', name: 'Middelhavsdiæt', desc: 'Sund spisning med fisk, olivenolie, grøntsager og fuldkorn' },
  { id: 'proteinrig-kost', name: 'Proteinrig kost', desc: 'Proteinrige opskrifter til optimal næring' },
  {
    id: 'familiemad',
    name: 'Kalorietælling',
    desc: 'Almindelig familiemad med planlagte kalorier og fuld næring — hele familien kan spise med',
  },
] as const

export type DietaryApproachOptionId = (typeof DIETARY_APPROACH_OPTIONS)[number]['id']

export function dietaryApproachLabel(id: string | undefined): string {
  if (!id) return '—'
  return DIETARY_APPROACH_OPTIONS.find((o) => o.id === id)?.name ?? id
}
