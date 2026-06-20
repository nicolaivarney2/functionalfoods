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
