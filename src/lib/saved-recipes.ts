import { authFetch } from '@/lib/auth-fetch'

const LEGACY_FAVORITES_KEY = 'favorite_recipes'
const LEGACY_MIGRATED_KEY = 'favorite_recipes_migrated'

export interface SavedRecipe {
  id: string
  recipeId: string
  title: string
  slug: string
  imageUrl: string | null
  shortDescription: string | null
  savedAt: string
}

export async function fetchSavedRecipes(): Promise<SavedRecipe[]> {
  const res = await authFetch('/api/saved-recipes')
  if (res.status === 401) return []
  if (!res.ok) throw new Error('Kunne ikke hente gemte opskrifter')
  const data = await res.json()
  return data.recipes ?? []
}

export async function isRecipeSaved(recipeId: string): Promise<boolean> {
  const res = await authFetch(`/api/saved-recipes?recipeId=${encodeURIComponent(recipeId)}`)
  if (res.status === 401) return false
  if (!res.ok) return false
  const data = await res.json()
  return Boolean(data.saved)
}

export async function saveRecipe(recipeId: string): Promise<void> {
  const res = await authFetch('/api/saved-recipes', {
    method: 'POST',
    body: JSON.stringify({ recipeId }),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error || 'Kunne ikke gemme opskrift')
  }
}

export async function unsaveRecipe(recipeId: string): Promise<void> {
  const res = await authFetch(
    `/api/saved-recipes?recipeId=${encodeURIComponent(recipeId)}`,
    { method: 'DELETE' },
  )
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error || 'Kunne ikke fjerne opskrift')
  }
}

/** One-time import of localStorage favorites into DB. */
export async function migrateLegacyFavoritesToDb(): Promise<void> {
  if (typeof window === 'undefined') return
  if (localStorage.getItem(LEGACY_MIGRATED_KEY) === 'true') return

  try {
    const raw = localStorage.getItem(LEGACY_FAVORITES_KEY)
    if (!raw) {
      localStorage.setItem(LEGACY_MIGRATED_KEY, 'true')
      return
    }
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) {
      localStorage.setItem(LEGACY_MIGRATED_KEY, 'true')
      return
    }
    for (const item of parsed) {
      const recipeId = item?.id
      if (typeof recipeId === 'string' && recipeId) {
        await saveRecipe(recipeId).catch(() => {})
      }
    }
    localStorage.removeItem(LEGACY_FAVORITES_KEY)
    localStorage.setItem(LEGACY_MIGRATED_KEY, 'true')
  } catch {
    // Ignore migration errors — user can re-save manually
  }
}
