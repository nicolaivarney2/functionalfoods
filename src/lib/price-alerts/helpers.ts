export function buildSearchVariants(value: string): string[] {
  const variants = new Set<string>()
  const lower = value.toLowerCase().trim()
  if (!lower) return []
  variants.add(lower)

  const ascii = lower.replace(/æ/g, 'ae').replace(/ø/g, 'oe').replace(/å/g, 'aa')
  variants.add(ascii)

  if (!/[æøå]/.test(lower)) {
    variants.add(lower.replace(/aa/g, 'å').replace(/ae/g, 'æ').replace(/oe/g, 'ø'))
  }

  return Array.from(variants).filter(Boolean)
}

export function normalizeForSearch(value: string): string {
  return value
    .toLowerCase()
    .replace(/æ/g, 'ae')
    .replace(/ø/g, 'oe')
    .replace(/å/g, 'aa')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function nameMatchesAllTokens(name: string, tokens: string[]): boolean {
  if (tokens.length === 0) return false
  const nameNorm = normalizeForSearch(name)
  return tokens.every((t) => nameNorm.includes(t))
}

export function scoreOfferRelevance(name: string, searchQuery: string, tokens: string[]): number {
  const nameNorm = normalizeForSearch(name)
  const termNorm = normalizeForSearch(searchQuery)
  let score = 0
  if (nameNorm === termNorm) score += 1200
  if (nameNorm.startsWith(termNorm)) score += 900
  if (nameNorm.includes(termNorm)) score += 700
  if (` ${nameNorm} `.includes(` ${termNorm} `)) score += 450

  let tokenHits = 0
  for (const t of tokens) {
    if (nameNorm.includes(t)) tokenHits++
  }
  score += tokenHits * 220
  if (tokens.length > 1 && tokenHits === tokens.length) score += 250
  return score
}
