import { extractStructuredRecipeFromHtml } from '@/lib/recipe-source-extract'

export function isBlockedRecipeFetchHost(hostname: string): boolean {
  const host = hostname.toLowerCase()
  return (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '0.0.0.0' ||
    host.startsWith('10.') ||
    host.startsWith('192.168.') ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(host)
  )
}

export function parseRecipePageUrl(rawUrl: string): URL {
  const trimmed = rawUrl.trim()
  if (!trimmed) throw new Error('URL mangler')
  let url: URL
  try {
    url = new URL(trimmed)
  } catch {
    throw new Error('Ugyldigt link')
  }
  if (!['http:', 'https:'].includes(url.protocol) || isBlockedRecipeFetchHost(url.hostname)) {
    throw new Error('Linket kan ikke hentes')
  }
  return url
}

export async function fetchRecipePageHtml(url: URL, timeoutMs = 10_000): Promise<string> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(url.toString(), {
      signal: controller.signal,
      headers: {
        Accept: 'text/html,application/xhtml+xml,text/plain;q=0.8,*/*;q=0.5',
        'User-Agent': 'FunctionalFoodsRecipeImporter/1.0',
      },
    })
    if (!response.ok) {
      throw new Error(`Kunne ikke hente linket (${response.status})`)
    }
    return await response.text()
  } finally {
    clearTimeout(timeout)
  }
}

export async function fetchStructuredRecipeFromUrl(rawUrl: string) {
  const url = parseRecipePageUrl(rawUrl)
  const html = await fetchRecipePageHtml(url)
  const structured = extractStructuredRecipeFromHtml(html, url.toString())
  return { url: url.toString(), html, structured }
}
