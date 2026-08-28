/**
 * Fold search strings so "xray", "x-ray" and "X-Ray" match.
 * Strips separators; keeps letters/digits including Danish.
 */
export function foldDagligvarerSearch(value: string | null | undefined): string {
  return String(value ?? '')
    .toLowerCase()
    .replace(/æ/g, 'ae')
    .replace(/ø/g, 'oe')
    .replace(/å/g, 'aa')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '')
}

export function dagligvarerSearchMatches(haystack: string, needle: string): boolean {
  const term = needle.trim()
  if (!term) return true
  const raw = haystack.toLowerCase()
  if (raw.includes(term.toLowerCase())) return true
  const foldedHay = foldDagligvarerSearch(haystack)
  const foldedNeedle = foldDagligvarerSearch(term)
  return foldedNeedle.length > 0 && foldedHay.includes(foldedNeedle)
}
