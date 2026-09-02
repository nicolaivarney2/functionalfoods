/**
 * Enheds-konvertering til rester-fratræk på indkøbslisten.
 *
 * Rester og indkøbsliste kommer fra to forskellige kilder: brugeren skriver
 * "500 gram hakket oksekød" i rester-wizarden, mens opskrifterne kan aggregere
 * til "0,5 kg". Uden konvertering matcher de ikke, og resten bliver aldrig
 * trukket fra — varen står stadig på listen i fuld mængde.
 */

const MASS_TO_GRAM: Record<string, number> = {
  gram: 1,
  kg: 1000,
}

const VOLUME_TO_ML: Record<string, number> = {
  ml: 1,
  cl: 10,
  dl: 100,
  liter: 1000,
  spsk: 15,
  tsk: 5,
}

export function normalizeUnit(unit?: string | null): string {
  const u = String(unit || '')
    .toLowerCase()
    .trim()
  if (!u) return 'stk'
  if (u === 'gram' || u === 'g' || u === 'gr') return 'gram'
  if (u === 'kg' || u === 'kilo' || u === 'kilogram') return 'kg'
  if (u === 'stk' || u === 'styk' || u === 'stykker') return 'stk'
  if (u === 'bundter') return 'bundt'
  if (u === 'l' || u === 'ltr') return 'liter'
  if (u === 'milliliter') return 'ml'
  if (u === 'centiliter') return 'cl'
  if (u === 'deciliter') return 'dl'
  if (u === 'spiseskefuld' || u === 'spiseskefulde') return 'spsk'
  if (u === 'teskefuld' || u === 'teskefulde') return 'tsk'
  return u
}

export function toBaseAmount(
  amount: number,
  unit?: string | null
): { family: string; amount: number } | null {
  const value = Number(amount)
  if (!Number.isFinite(value)) return null

  const u = normalizeUnit(unit)
  if (MASS_TO_GRAM[u] != null) return { family: 'mass', amount: value * MASS_TO_GRAM[u] }
  if (VOLUME_TO_ML[u] != null) return { family: 'volume', amount: value * VOLUME_TO_ML[u] }
  return { family: `unit:${u}`, amount: value }
}

export function fromBaseAmount(baseAmount: number, unit?: string | null): number {
  const u = normalizeUnit(unit)
  if (MASS_TO_GRAM[u] != null) return baseAmount / MASS_TO_GRAM[u]
  if (VOLUME_TO_ML[u] != null) return baseAmount / VOLUME_TO_ML[u]
  return baseAmount
}

export function roundAmount(value: number): number {
  return Math.round(value * 100) / 100
}

export function formatAmount(value: number): string {
  if (!Number.isFinite(value)) return '0'
  const rounded = roundAmount(value)
  const text = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1)
  return text.replace('.', ',')
}
