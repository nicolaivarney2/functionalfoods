/** True når listen har mindst én vare — tom `[]` / `{ categories: [] }` tæller ikke. */
export function shoppingListHasItems(list: unknown): boolean {
  if (!list || typeof list !== 'object') return false
  const cats = (list as { categories?: unknown }).categories
  if (!Array.isArray(cats)) return false
  return cats.some((cat) => {
    if (!cat || typeof cat !== 'object') return false
    const items = (cat as { items?: unknown }).items
    return Array.isArray(items) && items.length > 0
  })
}

export function shoppingListItemCount(list: unknown): number {
  if (!list || typeof list !== 'object') return 0
  const cats = (list as { categories?: unknown }).categories
  if (!Array.isArray(cats)) return 0
  return cats.reduce((sum, cat) => {
    if (!cat || typeof cat !== 'object') return sum
    const items = (cat as { items?: unknown }).items
    return sum + (Array.isArray(items) ? items.length : 0)
  }, 0)
}
