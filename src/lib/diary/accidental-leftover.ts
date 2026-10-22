/**
 * Tilfældige rester i madloggen: en portion man ikke havde planlagt.
 * Der trækkes 25 % fra, fordi en resteportion typisk er lidt mindre.
 * Madplanens planlagte rester bruger ikke denne faktor.
 */

export const ACCIDENTAL_LEFTOVER_PORTIONS = 0.75

export function perPortionAmount(total: number | null | undefined, servings: number): number | null {
  if (total == null || !Number.isFinite(Number(total))) return null
  const portions = Number.isFinite(servings) && servings > 0 ? servings : 1
  return Number(total) / portions
}

export function accidentalLeftoverAmount(perPortion: number): number {
  return perPortion * ACCIDENTAL_LEFTOVER_PORTIONS
}

export function perPortionMicroMap(
  map: Record<string, number> | undefined,
  servings: number
): Record<string, number> | undefined {
  if (!map) return undefined
  const portions = Number.isFinite(servings) && servings > 0 ? servings : 1
  const out: Record<string, number> = {}
  for (const [key, value] of Object.entries(map)) {
    const n = Number(value)
    if (!Number.isFinite(n) || n <= 0) continue
    out[key] = n / portions
  }
  return Object.keys(out).length ? out : undefined
}
