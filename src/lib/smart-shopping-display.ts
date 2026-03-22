/**
 * Visning af butiks-køb (pakker/stk) vs. opskriftsmængde på smart-shopping-siden.
 * Bruger felter fra shopping-list-prices (quantityNeeded, amount, unit).
 */

export function formatPurchaseHint(productInfo: Record<string, unknown> | null | undefined): string | null {
  if (!productInfo) return null
  const qn = Number(productInfo.quantityNeeded)
  if (!Number.isFinite(qn) || qn <= 0) return null

  const unitRaw = String(productInfo.unit ?? '').trim()
  const u = unitRaw.toLowerCase()
  const amountStr = productInfo.amount != null ? String(productInfo.amount).trim() : ''
  const packHint = `${amountStr} ${unitRaw}`.trim()

  if (/\bpak|pk\b|pakke/i.test(u) || /\bpak|pk\b|pakke/i.test(amountStr)) {
    if (qn === 1) return '1 pakke'
    return `${qn} pakker`
  }
  if (u === 'stk' || u === 'st' || u === 'stks' || /^stk\b/i.test(u)) {
    if (qn === 1) return '1 stk'
    return `${qn} stk`
  }
  if (u.includes('g') || u.includes('kg') || u.includes('ml') || u.includes('cl') || u.includes('l')) {
    if (packHint) {
      return qn === 1 ? `1 × ${packHint}` : `${qn} × ${packHint}`
    }
    return qn === 1 ? '1 enhed' : `${qn} enheder`
  }
  if (packHint) {
    return qn === 1 ? `1 × ${packHint}` : `${qn} × ${packHint}`
  }
  return qn === 1 ? '1 enhed' : `${qn} enheder`
}
