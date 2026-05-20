import { NextRequest, NextResponse } from 'next/server'
import { extractStructuredRecipeFromHtml } from '@/lib/recipe-source-extract'

export const dynamic = 'force-dynamic'

function isBlockedHost(hostname: string) {
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const rawUrl = typeof body?.url === 'string' ? body.url.trim() : ''

    if (!rawUrl) {
      return NextResponse.json({ error: 'URL mangler' }, { status: 400 })
    }

    let url: URL
    try {
      url = new URL(rawUrl)
    } catch {
      return NextResponse.json({ error: 'Ugyldigt link' }, { status: 400 })
    }

    if (!['http:', 'https:'].includes(url.protocol) || isBlockedHost(url.hostname)) {
      return NextResponse.json({ error: 'Linket kan ikke hentes' }, { status: 400 })
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10_000)

    try {
      const response = await fetch(url.toString(), {
        signal: controller.signal,
        headers: {
          Accept: 'text/html,application/xhtml+xml,text/plain;q=0.8,*/*;q=0.5',
          'User-Agent': 'FunctionalFoodsRecipeImporter/1.0',
        },
      })

      if (!response.ok) {
        return NextResponse.json(
          { error: `Kunne ikke hente linket (${response.status})` },
          { status: 502 }
        )
      }

      const raw = await response.text()
      const structured = extractStructuredRecipeFromHtml(raw, url.toString())

      if (!structured.ingredientsText && !structured.instructionsText && !structured.formattedSource) {
        return NextResponse.json({ error: 'Kunne ikke læse opskriftstekst fra linket' }, { status: 422 })
      }

      return NextResponse.json({
        ok: true,
        ...structured,
        sourceText: structured.formattedSource,
        truncated: structured.rawText.length >= 12_000,
      })
    } finally {
      clearTimeout(timeout)
    }
  } catch (error) {
    console.error('extract-recipe-source', error)
    return NextResponse.json({ error: 'Kunne ikke hente opskriftslink' }, { status: 500 })
  }
}
