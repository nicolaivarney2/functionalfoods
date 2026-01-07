/**
 * Kombi-supplement system
 * Håndterer automatisk tilføjelse af supplements til kombi-opskrifter
 */

export interface KombiSupplement {
  ingredientName: string
  amount: number
  unit: string
  reason: string // Forklaring til brugeren (fx "Til keto-delen af familien")
  category: 'keto-supplement' | 'familiemad-supplement'
}

/**
 * Mapping af kombi-tags til deres supplements
 */
export const KOMBI_SUPPLEMENTS: Record<string, KombiSupplement[]> = {
  'Kombi-familiemad': [
    // Når opskrift har kartofler/ris/pasta, men skal bruges i keto-familie
    // Tilføj keto-alternativer
    {
      ingredientName: 'blomkålsris',
      amount: 200, // pr. portion til keto-delen
      unit: 'g',
      reason: 'Til keto-delen af familien (i stedet for ris)',
      category: 'keto-supplement'
    },
    {
      ingredientName: 'blomkålsmos',
      amount: 200, // pr. portion til keto-delen
      unit: 'g',
      reason: 'Til keto-delen af familien (i stedet for kartofler)',
      category: 'keto-supplement'
    }
  ],
  'Kombi-keto': [
    // Når opskrift er keto, men skal bruges i familiemad
    // Tilføj familiemad-tilbehør
    {
      ingredientName: 'kartofler',
      amount: 300, // pr. portion til børnene
      unit: 'g',
      reason: 'Til børnene (i stedet for blomkålsmos)',
      category: 'familiemad-supplement'
    },
    {
      ingredientName: 'ris',
      amount: 100, // pr. portion til børnene (tør vægt)
      unit: 'g',
      reason: 'Til børnene (i stedet for blomkålsris)',
      category: 'familiemad-supplement'
    }
  ]
}

/**
 * Hent supplements for en kombi-tag
 */
export function getKombiSupplements(tag: string): KombiSupplement[] {
  return KOMBI_SUPPLEMENTS[tag] || []
}

/**
 * Tjek om en opskrift har kombi-tag
 */
export function hasKombiTag(dietaryCategories: string[]): string | null {
  if (dietaryCategories.includes('Kombi-familiemad')) {
    return 'Kombi-familiemad'
  }
  if (dietaryCategories.includes('Kombi-keto')) {
    return 'Kombi-keto'
  }
  return null
}

/**
 * Beregn totalt supplement baseret på antal portioner
 */
export function calculateSupplementAmount(
  supplement: KombiSupplement,
  servings: number
): KombiSupplement {
  return {
    ...supplement,
    amount: supplement.amount * servings
  }
}

