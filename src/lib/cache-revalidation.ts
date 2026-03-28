import { revalidatePath } from 'next/cache'
import { dietaryCategories } from '@/lib/sample-data'

type RecipeLike = {
  mainCategory?: string | null
  dietaryCategories?: unknown
}

function normalizeCategory(value: string): string {
  return value.trim().toLowerCase()
}

function slugifyCategory(value: string): string {
  return normalizeCategory(value)
    .replace(/æ/g, 'ae')
    .replace(/ø/g, 'oe')
    .replace(/å/g, 'aa')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

function getDietarySlugByName(name: string): string {
  const normalizedName = normalizeCategory(name)
  const found = dietaryCategories.find((c) => normalizeCategory(c.name) === normalizedName)
  return found?.slug || slugifyCategory(name)
}

export function getRecipeCollectionPaths(recipe: RecipeLike): string[] {
  const paths = new Set<string>(['/', '/opskriftsoversigt'])
  const categories = Array.isArray(recipe.dietaryCategories)
    ? recipe.dietaryCategories.filter((c): c is string => typeof c === 'string' && c.trim().length > 0)
    : []

  for (const category of categories) {
    const slug = getDietarySlugByName(category)
    if (slug) {
      paths.add(`/opskrifter/${slug}`)
    }

    const normalized = normalizeCategory(category)
    if (normalized.includes('keto')) {
      paths.add('/keto/opskrifter')
    }
    if (normalized.includes('glp-1') || normalized.includes('glp1')) {
      paths.add('/GLP-1/opskrifter')
    }
  }

  const mainCategory = typeof recipe.mainCategory === 'string' ? recipe.mainCategory.trim() : ''
  if (mainCategory) {
    const mainSlug = slugifyCategory(mainCategory)
    if (mainSlug) {
      paths.add(`/opskrifter/${mainSlug}`)
    }
  }

  return Array.from(paths)
}

export function revalidateRecipeCollectionPaths(recipe: RecipeLike): void {
  for (const path of getRecipeCollectionPaths(recipe)) {
    revalidatePath(path)
  }
}
