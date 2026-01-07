/**
 * Centralized tag mapping for recipe categories
 * Maps internal category names to the correct Danish tags used in the system
 */

export function getDietaryCategories(category: string): string[] {
  const categoryMap: Record<string, string[]> = {
    'familiemad': ['Familiemad'],
    'keto': ['Keto'],
    'sense': ['Sense'],
    'glp-1': ['GLP-1 kost'],
    'glp1': ['GLP-1 kost'],
    'antiinflammatorisk': ['Antiinflammatorisk'],
    'fleksitarisk': ['Fleksitarisk'],
    '5-2': ['5:2'], // 5:2 DIÆT = 5:2
    'meal-prep': ['Meal prep'], // MEAL PREP, Meal prep
    'mealprep': ['Meal prep'], // Alternative spelling
    'kombi-familiemad': ['Kombi-familiemad'], // Opskrift med kartofler/ris/pasta, kan bruges i keto-familie
    'kombi-keto': ['Kombi-keto'] // Keto opskrift, kan bruges i familiemad
  }
  
  return categoryMap[category] || [category]
}

/**
 * Get the correct tag for a specific category
 * This ensures consistency across all recipe generators
 */
export function getCategoryTag(category: string): string {
  const tags = getDietaryCategories(category)
  return tags[0] || category
}
