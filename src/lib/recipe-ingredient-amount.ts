/**
 * Shared scaling/formatting for ingredient quantities
 * (ingredients list + instruction tags).
 */

export function formatScaledIngredientAmount(
  amount: number,
  unit: string,
  multiplier: number
): string {
  const adjustedAmount = amount * multiplier
  const u = String(unit || '').trim()

  if (u === 'dl' && adjustedAmount >= 1) {
    return `${adjustedAmount.toFixed(1)} ${u}`
  }
  if (u === 'g' && adjustedAmount >= 1) {
    return `${Math.round(adjustedAmount)} ${u}`
  }
  if (u === 'kg' && adjustedAmount >= 0.1) {
    return `${adjustedAmount.toFixed(1)} ${u}`
  }
  if (u === 'l' && adjustedAmount >= 0.1) {
    return `${adjustedAmount.toFixed(1)} ${u}`
  }
  if (u === 'stk' || u === 'stykker') {
    if (adjustedAmount < 1 && adjustedAmount > 0) {
      return `${adjustedAmount.toFixed(1)} ${u}`
    }
    return `${Math.round(adjustedAmount)} ${u}`
  }
  if (u === 'tsk' || u === 'spsk') {
    return `${adjustedAmount.toFixed(1)} ${u}`
  }
  return `${adjustedAmount.toFixed(1)} ${u}`.trim()
}

export function formatIngredientQuantityLabel(
  ingredient: { amount: number; unit: string; name: string },
  multiplier: number
): string {
  const qty = formatScaledIngredientAmount(ingredient.amount, ingredient.unit, multiplier)
  return `${qty} ${ingredient.name}`.replace(/\s+/g, ' ').trim()
}
