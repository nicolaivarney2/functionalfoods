import { authFetch } from '@/lib/auth-fetch'

export type PriceAlertThreshold = 'any_sale' | 'min_discount'

export async function addToBasisliste(productName: string): Promise<void> {
  const res = await authFetch('/api/basisvarer', {
    method: 'POST',
    body: JSON.stringify({ ingredient_name: productName, quantity: 1, unit: 'stk' }),
  })
  if (res.status === 401) throw new Error('Du skal være logget ind')
  if (!res.ok) throw new Error('Kunne ikke tilføje til basisliste')
}

export async function addToShoppingList(productOfferId: string): Promise<void> {
  const res = await authFetch('/api/manual-shopping-items', {
    method: 'POST',
    body: JSON.stringify({ productOfferId, quantity: 1 }),
  })
  if (res.status === 401) throw new Error('Du skal være logget ind')
  if (!res.ok) throw new Error('Kunne ikke tilføje til indkøbsliste')
}

export async function createPriceAlert(
  productOfferId: string,
  thresholdType: PriceAlertThreshold,
  minDiscountPct?: number,
): Promise<void> {
  const res = await authFetch('/api/price-alerts', {
    method: 'POST',
    body: JSON.stringify({ productOfferId, thresholdType, minDiscountPct }),
  })
  if (res.status === 401) throw new Error('Du skal være logget ind')
  if (!res.ok) throw new Error('Kunne ikke oprette prisalarm')
}

export async function createPriceAlertGroup(input: {
  searchQuery: string
  label?: string
  storeIds?: string[]
  thresholdType: PriceAlertThreshold
  minDiscountPct?: number
}): Promise<{ type: 'single' | 'group'; groupId?: string }> {
  const res = await authFetch('/api/price-alerts/groups', {
    method: 'POST',
    body: JSON.stringify(input),
  })
  if (res.status === 401) throw new Error('Du skal være logget ind')
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error || 'Kunne ikke oprette prisalarm')
  }
  const data = await res.json()
  return {
    type: data.type,
    groupId: data.group?.id,
  }
}

export async function previewPriceAlertGroup(searchQuery: string, storeIds?: string[]) {
  const params = new URLSearchParams({ search: searchQuery })
  if (storeIds?.length) params.set('stores', storeIds.join(','))
  const res = await authFetch(`/api/price-alerts/groups?${params}`)
  if (!res.ok) throw new Error('Kunne ikke hente forhåndsvisning')
  return res.json()
}
