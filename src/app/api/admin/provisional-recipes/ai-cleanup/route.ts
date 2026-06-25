import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { requireAdmin } from '@/lib/admin-route-auth'
import { getOpenAIConfig } from '@/lib/openai-config'
import {
  normalizeAiRecipeIngredients,
  normalizeAiRecipeInstructions,
  type AiIngredientInput,
  type AiInstructionInput,
} from '@/lib/ai-recipe-ingredient-normalize'
import { generateMidjourneyPromptWithMeta } from '@/lib/midjourney-generator'
import { sanitizeIngredients, sanitizeInstructions } from '@/lib/provisional-recipes'

export const dynamic = 'force-dynamic'

function resolveOpenAIApiKey(): string | null {
  if (process.env.OPENAI_API_KEY?.trim()) return process.env.OPENAI_API_KEY.trim()
  return getOpenAIConfig()?.apiKey?.trim() || null
}

/**
 * AI-klargøring af en foreløbig (bruger-indsendt) opskrift før godkendelse.
 *
 * VIGTIGT: Vi ødelægger IKKE brugerens opskrift. AI'en må KUN:
 *  - sætte ingrediensnavne på vores FF/Frida-form (rene basisnavne + tilberedning i notes)
 *  - rydde sprogligt op i fremgangsmåden (stavning, grammatik, klar nummerering)
 * AI'en må IKKE: opfinde nye ingredienser, fjerne trin, ændre metode, mængder eller selve retten.
 */
const SYSTEM_PROMPT = `Du er redaktør for danske madopskrifter hos Functional Foods.
Du får en opskrift som en BRUGER selv har indsendt. Det er DERES opskrift — du må IKKE lave den om.

Din ENESTE opgave er at "skrive den rent", så den passer ind i vores format:

INGREDIENSER:
- Behold præcis de samme ingredienser, mængder og enheder som brugeren har sendt. Tilføj/fjern ALDRIG ingredienser.
- Sæt "name" til et rent basisnavn (fx "løg", "kyllingebryst", "olivenolie") og læg tilberedning/forklaring i "notes" (fx "finthakket", "i tern").
- Ret kun åbenlyse stavefejl i navne. Oversæt ikke. Gæt ikke mængder.

FREMGANGSMÅDE:
- Behold nøjagtigt de samme trin i samme rækkefølge med samme metode og mængder.
- Ret kun sprog: stavning, grammatik, tegnsætning og gør hvert trin til en klar, kort sætning.
- Slå IKKE trin sammen og del dem IKKE op, medmindre to handlinger åbenlyst er ét trin. Opfind aldrig nye trin eller detaljer.
- Skriv på dansk.

Returnér KUN gyldig JSON i præcis dette format (ingen markdown):
{
  "ingredients": [{ "name": "kyllingebryst", "amount": 300, "unit": "g", "notes": "i tern" }],
  "instructions": [{ "stepNumber": 1, "instruction": "..." }]
}`

function buildUserPrompt(recipe: {
  title: string
  description?: string
  ingredients: AiIngredientInput[]
  instructions: AiInstructionInput[]
}): string {
  const ingredientsText = recipe.ingredients
    .map((i) => `- ${i.amount ?? ''} ${i.unit ?? ''} ${i.name}${i.notes ? ` (${i.notes})` : ''}`.trim())
    .join('\n')
  const instructionsText = recipe.instructions
    .map((s, idx) => `${s.stepNumber ?? idx + 1}. ${s.instruction}`)
    .join('\n')

  return `TITEL: ${recipe.title || 'Foreløbig opskrift'}
${recipe.description ? `BESKRIVELSE: ${recipe.description}\n` : ''}
BRUGERENS INGREDIENSER:
${ingredientsText || '(ingen)'}

BRUGERENS FREMGANGSMÅDE:
${instructionsText || '(ingen)'}

Skriv opskriften rent nu — samme ret, samme trin, kun renere.`
}

function parseCleanupJson(content: string): {
  ingredients: AiIngredientInput[]
  instructions: AiInstructionInput[]
} {
  const match = content.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('Intet JSON i AI-svar')
  const raw = JSON.parse(match[0]) as Record<string, unknown>
  return {
    ingredients: sanitizeIngredients(raw.ingredients),
    instructions: sanitizeInstructions(raw.instructions),
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin(request)
    if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await request.json().catch(() => ({}))
    const recipe = (body?.recipe ?? {}) as {
      title?: string
      description?: string
      servings?: number
      dietaryCategories?: string[]
      ingredients?: unknown
      instructions?: unknown
    }

    const ingredientsIn = sanitizeIngredients(recipe.ingredients)
    const instructionsIn = sanitizeInstructions(recipe.instructions)

    if (ingredientsIn.length === 0 && instructionsIn.length === 0) {
      return NextResponse.json({ error: 'Opskriften har hverken ingredienser eller fremgangsmåde' }, { status: 400 })
    }

    const apiKey = resolveOpenAIApiKey()

    let cleanedIngredients: AiIngredientInput[] = ingredientsIn
    let cleanedInstructions: AiInstructionInput[] = instructionsIn
    let aiSource: 'openai' | 'fallback' = 'fallback'
    let aiError: string | null = null

    if (apiKey) {
      try {
        const openai = new OpenAI({ apiKey })
        const completion = await openai.chat.completions.create({
          model: 'gpt-4o',
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            {
              role: 'user',
              content: buildUserPrompt({
                title: recipe.title || '',
                description: recipe.description,
                ingredients: ingredientsIn,
                instructions: instructionsIn,
              }),
            },
          ],
          max_tokens: 1800,
          temperature: 0.1,
        })
        const content = completion.choices[0]?.message?.content?.trim() || ''
        const parsed = parseCleanupJson(content)
        // Beskyt mod at AI'en sletter alt: brug kun resultatet hvis det ikke er tomt.
        if (parsed.ingredients.length > 0 || ingredientsIn.length === 0) {
          cleanedIngredients = parsed.ingredients.length > 0 ? parsed.ingredients : ingredientsIn
        }
        if (parsed.instructions.length > 0 || instructionsIn.length === 0) {
          cleanedInstructions = parsed.instructions.length > 0 ? parsed.instructions : instructionsIn
        }
        aiSource = 'openai'
      } catch (err) {
        console.error('provisional ai-cleanup openai', err)
        aiError = err instanceof Error ? err.message : 'AI-fejl'
      }
    } else {
      aiError = 'Ingen OpenAI-nøgle — kun mekanisk normalisering anvendt'
    }

    // Deterministisk normalisering ovenpå (enheder, æg→stk, salt/peber→tsk, °C-rensning).
    const ingredients = normalizeAiRecipeIngredients(cleanedIngredients).map((ing) => ({
      name: ing.name,
      amount: ing.amount,
      unit: ing.unit,
      notes: ing.notes,
    }))
    const instructions = normalizeAiRecipeInstructions(cleanedInstructions).map((ins, i) => ({
      stepNumber: ins.stepNumber ?? i + 1,
      instruction: ins.instruction,
    }))

    let midjourneyPrompt = ''
    let midjourneySource: string | null = null
    try {
      const meta = await generateMidjourneyPromptWithMeta({
        title: recipe.title,
        description: recipe.description,
        ingredients,
        instructions,
      })
      midjourneyPrompt = meta.prompt
      midjourneySource = meta.source
    } catch (err) {
      console.warn('provisional ai-cleanup midjourney', err)
    }

    return NextResponse.json({
      success: true,
      ingredients,
      instructions,
      midjourneyPrompt,
      midjourneySource,
      aiSource,
      aiError,
    })
  } catch (e) {
    console.error('provisional ai-cleanup POST', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
