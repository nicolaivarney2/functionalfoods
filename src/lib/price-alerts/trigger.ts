/** Delt logik for prisalarm-trigger — brug is_offer_active ?? is_on_sale (Goma/fooddata). */

export function offerIsOnSale(offer: Record<string, unknown> | undefined): boolean {
  if (!offer) return false
  return Boolean(offer.is_offer_active ?? offer.is_on_sale)
}

export function isPriceAlertTriggered(
  alert: Record<string, unknown>,
  offer: Record<string, unknown> | undefined,
): boolean {
  if (!offerIsOnSale(offer)) return false
  if (alert.threshold_type === 'any_sale') return true
  const discount =
    offer!.discount_percentage != null
      ? Number(offer!.discount_percentage)
      : offer!.normal_price && offer!.current_price
        ? Math.round(
            ((Number(offer!.normal_price) - Number(offer!.current_price)) /
              Number(offer!.normal_price)) *
              100,
          )
        : 0
  return discount >= Number(alert.min_discount_pct ?? 0)
}

export function discountPctFromOffer(offer: Record<string, unknown> | undefined): number | null {
  if (!offer) return null
  if (offer.discount_percentage != null) return Number(offer.discount_percentage)
  if (offer.normal_price && offer.current_price) {
    return Math.round(
      ((Number(offer.normal_price) - Number(offer.current_price)) / Number(offer.normal_price)) * 100,
    )
  }
  return null
}
