import { NextRequest, NextResponse } from 'next/server'
import { getOpenAIConfig } from '@/lib/openai-config'

interface SeoRequest {
  title: string
  contentPreview: string
}

export async function POST(request: NextRequest) {
  try {
    const { title, contentPreview }: SeoRequest = await request.json()
    if (!title || !contentPreview) {
      return NextResponse.json({ success: false, error: 'Missing title or content' }, { status: 400 })
    }

    const openai = getOpenAIConfig()
    if (!openai?.apiKey) {
      return NextResponse.json({ success: false, error: 'OpenAI API key not configured' }, { status: 500 })
    }

    const system = 'Du er SEO-copywriter. Svar KUN med én meta description på dansk mellem 140 og 160 tegn.'
    const user = `Skriv en SEO meta description til en blog med titlen "${title}".
Indhold (uddrag):
${contentPreview.slice(0, 3000)}

Krav:
- 140-160 tegn
- Aktiv, hjælpsom tone
- Ingen citationstegn, ingen emojis, ingen ekstra tekst.`

    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openai.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user }
        ],
        temperature: 0.4,
        max_tokens: 120
      })
    })

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}))
      throw new Error(err.error?.message || 'OpenAI API error')
    }

    const data = await resp.json()
    const description = (data.choices?.[0]?.message?.content || '').trim()
    if (!description) throw new Error('No description generated')

    return NextResponse.json({ success: true, description })
  } catch (e) {
    console.error('SEO generation failed', e)
    return NextResponse.json({ success: false, error: 'Failed to generate description' }, { status: 500 })
  }
}


