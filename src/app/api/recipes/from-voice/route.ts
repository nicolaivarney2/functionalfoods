import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import OpenAI, { toFile } from 'openai'
import { getSupabaseRouteUser } from '@/lib/supabase-api-user'
import {
  PROVISIONAL_SELECT,
  VOICE_SYSTEM_PROMPT,
  parseVisionRecipe,
} from '@/lib/provisional-recipes'
import { nutritionForProvisionalMeal } from '@/lib/provisional-nutrition'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null

// Whisper-understøttede formater → vi mapper mime/endelse til et filnavn med gyldig endelse.
const EXT_BY_MIME: Record<string, string> = {
  'audio/webm': 'webm',
  'audio/ogg': 'ogg',
  'audio/mp4': 'm4a',
  'audio/m4a': 'm4a',
  'audio/x-m4a': 'm4a',
  'audio/mpeg': 'mp3',
  'audio/mp3': 'mp3',
  'audio/wav': 'wav',
  'audio/x-wav': 'wav',
  'audio/aac': 'm4a',
}

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

/** Tager "data:audio/...;base64,XXXX" eller rå base64 og returnerer en Buffer + udledt mime. */
function decodeBase64Audio(input: string): { buffer: Buffer; mime: string | null } | null {
  try {
    let mime: string | null = null
    let b64 = input
    if (input.startsWith('data:')) {
      const commaIdx = input.indexOf(',')
      if (commaIdx === -1) return null
      const header = input.slice(5, commaIdx) // fx "audio/webm;base64"
      mime = header.split(';')[0] || null
      b64 = input.slice(commaIdx + 1)
    }
    const buffer = Buffer.from(b64, 'base64')
    return buffer.length > 0 ? { buffer, mime } : null
  } catch {
    return null
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getServiceClient()
    if (!supabase) return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })

    const user = await getSupabaseRouteUser(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    if (!openai) {
      return NextResponse.json(
        { error: 'AI er ikke konfigureret', details: 'OPENAI_API_KEY mangler' },
        { status: 503 }
      )
    }

    const body = await request.json().catch(() => ({}))
    const audioBase64 = typeof body.audioBase64 === 'string' ? body.audioBase64 : ''
    if (!audioBase64) return NextResponse.json({ error: 'Mangler lydoptagelse' }, { status: 400 })

    const decoded = decodeBase64Audio(audioBase64)
    if (!decoded) return NextResponse.json({ error: 'Ugyldig lydoptagelse' }, { status: 400 })
    if (decoded.buffer.length > 25 * 1024 * 1024) {
      return NextResponse.json({ error: 'Optagelsen er for stor (max 25MB)' }, { status: 400 })
    }

    const mime = (typeof body.mimeType === 'string' && body.mimeType) || decoded.mime
    const ext = (mime && EXT_BY_MIME[mime]) || 'm4a'

    // 1) Transskribér tale → tekst (Whisper). Dansk er sat eksplicit for bedre kvalitet.
    let transcript: string
    try {
      const file = await toFile(decoded.buffer, `voice.${ext}`, mime ? { type: mime } : undefined)
      const transcription = await openai.audio.transcriptions.create({
        file,
        model: 'whisper-1',
        language: 'da',
      })
      transcript = (transcription.text || '').trim()
      if (!transcript) throw new Error('Tom transskription')
    } catch (sttErr) {
      console.error('from-voice transcribe', sttErr)
      return NextResponse.json(
        { error: 'Kunne ikke genkende tale', details: sttErr instanceof Error ? sttErr.message : 'ukendt' },
        { status: 502 }
      )
    }

    // 2) Strukturér transskriptionen → opskrift/måltid (samme JSON-format som ai-photo).
    let parsed
    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: VOICE_SYSTEM_PROMPT },
          {
            role: 'user',
            content: `Brugeren fortalte følgende om sit måltid. Lav en opskrift/et måltid ud fra det. Returnér kun JSON.\n\n"${transcript}"`,
          },
        ],
        temperature: 0.4,
        max_tokens: 1500,
      })
      const content = completion.choices[0]?.message?.content
      if (!content) throw new Error('Tomt AI-svar')
      parsed = parseVisionRecipe(content)
    } catch (aiErr) {
      console.error('from-voice structure', aiErr)
      return NextResponse.json(
        {
          error: 'AI kunne ikke tolke det du sagde',
          details: aiErr instanceof Error ? aiErr.message : 'ukendt',
          transcript,
        },
        { status: 502 }
      )
    }

    const fridaNutrition = await nutritionForProvisionalMeal(
      parsed.ingredients,
      parsed.servings,
      parsed.nutrition
    )

    // 3) Opret foreløbig opskrift (draft). Transskriptionen gemmes i ai_notes til reference.
    const { data, error } = await supabase
      .from('provisional_recipes')
      .insert({
        user_id: user.id,
        status: 'draft',
        source: 'ai-voice',
        title: parsed.title,
        description: parsed.description || null,
        image_url: null,
        servings: parsed.servings,
        prep_time: parsed.prepTime,
        cook_time: parsed.cookTime,
        difficulty: parsed.difficulty,
        ingredients: parsed.ingredients,
        instructions: parsed.instructions,
        nutrition: fridaNutrition.nutrition,
        dietary_categories: parsed.dietaryCategories,
        clarifying_questions: parsed.clarifyingQuestions,
        ai_notes: `Genereret fra indtaling. Ernæring: ${fridaNutrition.source} (${fridaNutrition.matchedIngredients}/${fridaNutrition.totalIngredients}).\nTransskription: "${transcript}"`,
      })
      .select(PROVISIONAL_SELECT)
      .single()

    if (error) {
      console.error('from-voice insert', error)
      return NextResponse.json({ error: 'Kunne ikke gemme', details: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, transcript, data })
  } catch (e) {
    console.error('recipes/from-voice POST', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
