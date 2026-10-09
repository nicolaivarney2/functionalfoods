import { getOpenAIConfig } from '@/lib/openai-config'
import {
  buildTipsUserPrompt,
  FF_TIPS_FALLBACK,
  FF_TIPS_SYSTEM_PROMPT,
} from '@/lib/ff-recipe-prompt'

export type RecipeTipsInput = {
  title: string
  description?: string
  nicheLabel?: string
  ingredients?: string[]
  instructions?: string[]
}

export async function generateRecipeTips(input: RecipeTipsInput): Promise<string> {
  const config = getOpenAIConfig()
  if (!config?.apiKey) return FF_TIPS_FALLBACK

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: FF_TIPS_SYSTEM_PROMPT },
          { role: 'user', content: buildTipsUserPrompt(input) },
        ],
        temperature: 0.7,
        presence_penalty: 0.45,
        frequency_penalty: 0.3,
        max_tokens: 700,
      }),
    })

    if (!response.ok) return FF_TIPS_FALLBACK
    const data = await response.json()
    const content = String(data.choices?.[0]?.message?.content || '').trim()
    return content || FF_TIPS_FALLBACK
  } catch {
    return FF_TIPS_FALLBACK
  }
}
