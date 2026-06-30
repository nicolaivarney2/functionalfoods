import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'
import sharp from 'sharp'
import { createHash } from 'crypto'
import { getSupabaseRouteUser } from '@/lib/supabase-api-user'
import {
  PROVISIONAL_SELECT,
  VISION_SYSTEM_PROMPT,
  parseVisionRecipe,
} from '@/lib/provisional-recipes'
import { nutritionForProvisionalMeal } from '@/lib/provisional-nutrition'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

/** Tager "data:...;base64,XXXX" eller rå base64 og returnerer en Buffer. */
function decodeBase64Image(input: string): Buffer | null {
  try {
    const commaIdx = input.indexOf(',')
    const b64 = input.startsWith('data:') && commaIdx !== -1 ? input.slice(commaIdx + 1) : input
    const buf = Buffer.from(b64, 'base64')
    return buf.length > 0 ? buf : null
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
    const imageBase64 = typeof body.imageBase64 === 'string' ? body.imageBase64 : ''
    if (!imageBase64) return NextResponse.json({ error: 'Mangler billede' }, { status: 400 })

    const buffer = decodeBase64Image(imageBase64)
    if (!buffer) return NextResponse.json({ error: 'Ugyldigt billede' }, { status: 400 })
    if (buffer.length > 8 * 1024 * 1024) {
      return NextResponse.json({ error: 'Billedet er for stort (max 8MB)' }, { status: 400 })
    }

    // Normalisér til en kompakt JPEG som data-URL til vision-kaldet (mindre tokens).
    let analysisBuffer: Buffer
    try {
      analysisBuffer = await sharp(buffer)
        .rotate()
        .resize(1024, 1024, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 80 })
        .toBuffer()
    } catch {
      analysisBuffer = buffer
    }
    const dataUrl = `data:image/jpeg;base64,${analysisBuffer.toString('base64')}`

    // 1) Vision-analyse
    let parsed
    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: VISION_SYSTEM_PROMPT },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Analysér denne ret og lav en opskrift. Returnér kun JSON.' },
              { type: 'image_url', image_url: { url: dataUrl, detail: 'low' } },
            ],
          },
        ],
        temperature: 0.4,
        max_tokens: 1500,
      })
      const content = completion.choices[0]?.message?.content
      if (!content) throw new Error('Tomt AI-svar')
      parsed = parseVisionRecipe(content)
    } catch (aiErr) {
      console.error('from-photo AI', aiErr)
      return NextResponse.json(
        { error: 'AI kunne ikke analysere billedet', details: aiErr instanceof Error ? aiErr.message : 'ukendt' },
        { status: 502 }
      )
    }

    // 2) Gem brugerens foto (så admin kan se originalen) — best effort.
    let imageUrl: string | null = null
    try {
      const webp = await sharp(buffer)
        .rotate()
        .resize(800, 600, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 80 })
        .toBuffer()
      const hash = createHash('md5').update(`${user.id}-${Date.now()}`).digest('hex').slice(0, 10)
      const filePath = `provisional/${user.id}/${hash}.webp`
      const { error: upErr } = await supabase.storage
        .from('recipe-images')
        .upload(filePath, webp, { contentType: 'image/webp', cacheControl: '3600', upsert: false })
      if (!upErr) {
        imageUrl = supabase.storage.from('recipe-images').getPublicUrl(filePath).data.publicUrl
      } else {
        console.warn('from-photo upload', upErr.message)
      }
    } catch (imgErr) {
      console.warn('from-photo image optimize', imgErr)
    }

    // 3) Frida-ernæring ud fra ingrediensliste (præcisere end AI-gæt).
    const fridaNutrition = await nutritionForProvisionalMeal(
      parsed.ingredients,
      parsed.servings,
      parsed.nutrition
    )

    // 4) Opret foreløbig opskrift (draft)
    const { data, error } = await supabase
      .from('provisional_recipes')
      .insert({
        user_id: user.id,
        status: 'draft',
        source: 'ai-photo',
        title: parsed.title,
        description: parsed.description || null,
        image_url: imageUrl,
        servings: parsed.servings,
        prep_time: parsed.prepTime,
        cook_time: parsed.cookTime,
        difficulty: parsed.difficulty,
        ingredients: parsed.ingredients,
        instructions: parsed.instructions,
        nutrition: fridaNutrition.nutrition,
        dietary_categories: parsed.dietaryCategories,
        clarifying_questions: parsed.clarifyingQuestions,
        ai_notes: `Genereret fra billede med GPT-4o. Ernæring: ${fridaNutrition.source} (${fridaNutrition.matchedIngredients}/${fridaNutrition.totalIngredients} ingredienser matchet).`,
      })
      .select(PROVISIONAL_SELECT)
      .single()

    if (error) {
      console.error('from-photo insert', error)
      return NextResponse.json({ error: 'Kunne ikke gemme', details: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (e) {
    console.error('recipes/from-photo POST', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
