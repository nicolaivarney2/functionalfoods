export type PublishingListSort = 'publishedAt' | 'updatedAt'

export function recipeTimestamp(value: unknown): number {
  if (!value) return 0
  const time = value instanceof Date ? value.getTime() : new Date(String(value)).getTime()
  return Number.isFinite(time) ? time : 0
}

/** Udgivelsestid. AI-opskrifter har ofte publishedAt = null og ligger så på planlagt dato. */
export function publishedSortKey(recipe: {
  publishedAt?: Date | string | null
  scheduledDate?: Date | string | null
  scheduledTime?: string | null
}): number {
  const published = recipeTimestamp(recipe.publishedAt)
  if (published) return published
  if (!recipe.scheduledDate) return 0
  const day =
    recipe.scheduledDate instanceof Date
      ? recipe.scheduledDate.toISOString().slice(0, 10)
      : String(recipe.scheduledDate).slice(0, 10)
  const clock = recipe.scheduledTime && /^\d{2}:\d{2}/.test(recipe.scheduledTime)
    ? recipe.scheduledTime.slice(0, 5)
    : '12:00'
  return recipeTimestamp(`${day}T${clock}`)
}

export function formatAdminListDate(time: number): string {
  if (!time) return ''
  return new Date(time).toLocaleString('da-DK', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function comparePublishingRecipes<T extends {
  publishedAt?: Date | string | null
  scheduledDate?: Date | string | null
  scheduledTime?: string | null
  updatedAt?: Date | string | null
}>(listSort: PublishingListSort, a: T, b: T): number {
  if (listSort === 'publishedAt') {
    const byPublished = publishedSortKey(b) - publishedSortKey(a)
    if (byPublished !== 0) return byPublished
  }
  return recipeTimestamp(b.updatedAt) - recipeTimestamp(a.updatedAt)
}
