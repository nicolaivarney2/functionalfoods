/** Et barn under 10 år tæller 0.5 PE, et barn 10+ tæller 1.0. */
export function ageBandToPersonEquivalent(band: string | undefined): number {
  if (!band) return 0.5
  if (band === '0-3' || band === '4-8') return 0.5
  return 1.0
}

/** Samlet person-ækvivalent for børn (aldersbånd). */
export function computeChildPersonEquivalent(childrenAges: string[] | undefined): number {
  return (childrenAges || []).reduce((sum, band) => sum + ageBandToPersonEquivalent(band), 0)
}

/** Voksne + børn som samlet PE (minimum 1). */
export function computeFamilyPersonEquivalent(
  adults: number,
  childrenAges: string[] | undefined
): number {
  const adultPe = Math.max(0, adults) * 1.0
  const childPe = computeChildPersonEquivalent(childrenAges)
  return Math.max(1, adultPe + childPe)
}
