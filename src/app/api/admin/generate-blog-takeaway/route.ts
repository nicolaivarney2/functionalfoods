import { NextRequest, NextResponse } from 'next/server'
import { getOpenAIConfig } from '@/lib/openai-config'

interface TakeawayRequest {
  title?: string
  sectionHtml?: string
  sectionText?: string
}

export async function POST(request: NextRequest) {
  try {
    const { title, sectionHtml, sectionText }: TakeawayRequest = await request.json()
    const content = (sectionText || sectionHtml || '').toString().slice(0, 8000)
    if (!content) {
      return NextResponse.json({ success: false, error: 'Missing section content' }, { status: 400 })
    }

    const openaiConfig = getOpenAIConfig()
    if (!openaiConfig?.apiKey) {
      return NextResponse.json({ success: false, error: 'OpenAI API key not configured' }, { status: 500 })
    }

    const systemPrompt = `Du er en dansk sundheds- og ernæringsekspert. Du skriver ultra-kort og præcist på dansk.`
    const userPrompt = `Giv én (1) klart formuleret "takeaway"-sætning (max 25 ord) for læseren baseret på dette blogafsnit${title ? ` i artiklen "${title}"` : ''}:

${content}

Krav:
- Svar som en enkelt sætning.
- Ingen emojis, ingen overskrift, ingen forklaringer; kun sætningen.`

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiConfig.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,
        max_tokens: 120
      })
    })

    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      throw new Error(err.error?.message || 'OpenAI API error')
    }

    const completion = await response.json()
    const takeaway = completion.choices?.[0]?.message?.content?.trim()
    if (!takeaway) throw new Error('No content generated')

    return NextResponse.json({ success: true, takeaway })
  } catch (error) {
    console.error('Error generating takeaway:', error)
    return NextResponse.json({ success: false, error: 'Failed to generate takeaway' }, { status: 500 })
  }
}


