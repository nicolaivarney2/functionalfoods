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

    const systemPrompt = `Du er dansk sundheds- og ernæringsekspert og en ekstremt streng opsummeringsmaskine.
OPGAVE: Udtræk den ENE mest specifikke og handlingsbare pointe fra et givet afsnit.
REGLER (vigtige):
- Brug KUN information fra afsnittet – ingen generelle råd, ingen fyld.
- Vælg det mest konkrete faktum/tal/reglen/anbefalingen i afsnittet.
- Vær specifik (tal, mængder, tidsrum, betingelser), undgå generiske formuleringer som "lær principperne" eller "spis low carb".
- Maks 20 ord, én sætning, aktiv form, på dansk.
- Ingen emojis, ingen overskrift, ingen forklaringer; KUN sætningen.`
    const userPrompt = `Afsnit fra artiklen${title ? ` "${title}"` : ''}:

${content}

Returnér præcis ÉN sætning (maks 20 ord) med den mest konkrete og handlingsbare pointe fra afsnittet.`

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


