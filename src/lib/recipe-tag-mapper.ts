/**
 * Centralized tag mapping for recipe categories
 * Maps internal category names to the correct Danish tags used in the system
 */

export function getDietaryCategories(category: string): string[] {
  const categoryMap: Record<string, string[]> = {
    'familiemad': ['Familiemad'],
    'keto': ['Keto'],
    'sense': ['Sense'],
    'paleo': ['Paleo', 'LCHF'], // LCHF/PALEO = Paleo, LCHF (2 separate tags)
    'lchf': ['Paleo', 'LCHF'], // Same as paleo
    'antiinflammatorisk': ['Antiinflammatorisk'],
    'fleksitarisk': ['Fleksitarisk'],
    '5-2': ['5:2'], // 5:2 DIÆT = 5:2
    'meal-prep': ['Meal prep'], // MEAL PREP, Meal prep
    'mealprep': ['Meal prep'] // Alternative spelling
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
