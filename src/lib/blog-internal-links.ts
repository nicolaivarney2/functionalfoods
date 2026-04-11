export type BlogBriefInternalLink = {
  title: string
  slug: string
  reason: string
}

export type LinkableBlogSection = {
  section_type: string
  title?: string
  content: string
}

const STOP_WORDS = new Set([
  'den',
  'det',
  'der',
  'som',
  'for',
  'med',
  'til',
  'fra',
  'eller',
  'men',
  'om',
  'på',
  'af',
  'et',
  'en',
  'at',
  'i',
  'du',
  'din',
  'dit',
  'dine',
  'kan',
  'skal',
  'bliver',
  'mere',
  'mindre',
  'hvordan',
  'hvorfor',
  'bedste',
  'guide',
])

function tokenize(value: string): string[] {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9æøå\s-]/gi, ' ')
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 2 && !STOP_WORDS.has(token))
}

function scoreLinkForSection(section: LinkableBlogSection, link: BlogBriefInternalLink): number {
  const sectionTitleTokens = new Set(tokenize(section.title || ''))
  const sectionContentTokens = new Set(tokenize(section.content || ''))
  const linkTokens = tokenize(`${link.title} ${link.reason}`)

  let score = 0

  for (const token of linkTokens) {
    if (sectionTitleTokens.has(token)) score += 3
    if (sectionContentTokens.has(token)) score += 1
  }

  return score
}

function buildInternalLinkMarkdown(link: BlogBriefInternalLink, categorySlug: string) {
  return `Relateret læsning: [${link.title}](/blog/${categorySlug}/${link.slug}).`
}

export function injectInternalLinksIntoSections<T extends LinkableBlogSection>(
  sections: T[],
  internalLinks: BlogBriefInternalLink[] | undefined,
  categorySlug: string
): T[] {
  if (!Array.isArray(sections) || sections.length === 0) return sections
  if (!Array.isArray(internalLinks) || internalLinks.length === 0 || !categorySlug) return sections

  const nextSections = sections.map((section) => ({ ...section }))
  const targetIndexes = nextSections
    .map((section, index) => ({ section, index }))
    .filter(({ section }) => section.section_type === 'content')
    .map(({ index }) => index)

  const eligibleIndexes =
    targetIndexes.length > 0
      ? targetIndexes
      : nextSections
          .map((section, index) => ({ section, index }))
          .filter(({ section }) => section.section_type !== 'widget')
          .map(({ index }) => index)

  const maxLinks = Math.min(3, internalLinks.length, eligibleIndexes.length)
  const usedSlugs = new Set<string>()

  for (const index of eligibleIndexes) {
    if (usedSlugs.size >= maxLinks) break

    const section = nextSections[index]
    const rankedLinks = internalLinks
      .filter((link) => !usedSlugs.has(link.slug))
      .map((link) => ({ link, score: scoreLinkForSection(section, link) }))
      .sort((a, b) => b.score - a.score)

    const selectedLink = rankedLinks[0]?.link
    if (!selectedLink) continue

    const targetHref = `/blog/${categorySlug}/${selectedLink.slug}`
    const alreadyHasLink =
      section.content.includes(targetHref) ||
      section.content.toLowerCase().includes(selectedLink.title.toLowerCase())

    if (alreadyHasLink) {
      usedSlugs.add(selectedLink.slug)
      continue
    }

    section.content = `${section.content.trim()}\n\n${buildInternalLinkMarkdown(selectedLink, categorySlug)}`.trim()
    usedSlugs.add(selectedLink.slug)
  }

  return nextSections
}

export function injectInternalLinkIntoSection<T extends LinkableBlogSection>(
  section: T,
  internalLinks: BlogBriefInternalLink[] | undefined,
  categorySlug: string
): T {
  const [updated] = injectInternalLinksIntoSections([section], internalLinks, categorySlug)
  return updated || section
}

