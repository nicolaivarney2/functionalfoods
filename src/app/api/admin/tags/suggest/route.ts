import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { getOpenAIConfig } from '@/lib/openai-config'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const MAX_RECIPES_PER_REQUEST = 20

interface SuggestRequest {
  recipeIds: string[]
  fields?: Array<'mainCategory' | 'subCategories' | 'dietaryCategories'>
  // Allowed vocabularies; if omitted server-side defaults from category config are used.
  allowedMainCategories?: string[]
  allowedSubCategories?: string[]
  allowedDietaryCategories?: string[]
  // Optional hint for the model (e.g. "Focus on keto-friendly tags").
  instructions?: string
}

interface SuggestionForRecipe {
  recipeId: string
  title: string
  mainCategory?: string | null
  subCategories?: string[]
  dietaryCategories?: string[]
  reasoning?: string
}

interface RecipeRow {
  id: string
  title: string
  description: string | null
  shortDescription: string | null
  mainCategory: string | null
  subCategories: unknown
  dietaryCategories: unknown
  ingredients: unknown
}

function safeStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
    : []
}

function extractIngredientNames(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  const names: string[] = []
  for (const entry of value) {
    if (typeof entry === 'string') {
      names.push(entry)
      continue
    }
    if (entry && typeof entry === 'object') {
      const name = (entry as { name?: unknown }).name
      if (typeof name === 'string' && name.trim().length > 0) {
        names.push(name.trim())
      }
    }
    if (names.length >= 20) break
  }
  return names
}

function buildSystemPrompt(
  fields: Array<'mainCategory' | 'subCategories' | 'dietaryCategories'>,
  allowed: {
    mainCategory: string[]
    subCategories: string[]
    dietaryCategories: string[]
  },
  instructions?: string,
): string {
  const lines: string[] = [
    'Du er en ekspert i at kategorisere danske opskrifter til et opskriftswebsite.',
    'Du modtager en liste af opskrifter og skal foreslå passende tags for hver enkelt.',
    'Returnér KUN gyldig JSON i præcis det format der bliver bedt om.',
    'Brug udelukkende tags fra de tilladte lister herunder – opfind aldrig nye tags.',
    'Hvis ingen tag passer for et felt, returnér en tom array (eller null for mainCategory).',
  ]

  if (fields.includes('mainCategory')) {
    lines.push(`Tilladte hovedkategorier: ${allowed.mainCategory.join(', ') || '(ingen tilgængelige)'}`)
  }
  if (fields.includes('subCategories')) {
    lines.push(`Tilladte subkategorier: ${allowed.subCategories.join(', ') || '(ingen tilgængelige)'}`)
  }
  if (fields.includes('dietaryCategories')) {
    lines.push(`Tilladte diætkategorier: ${allowed.dietaryCategories.join(', ') || '(ingen tilgængelige)'}`)
  }

  if (instructions && instructions.trim()) {
    lines.push(`Yderligere instruktioner fra admin: ${instructions.trim()}`)
  }

  lines.push('')
  lines.push('Returnér JSON i dette format:')
  lines.push(
    JSON.stringify(
      {
        suggestions: [
          {
            recipeId: 'string',
            mainCategory: 'string|null',
            subCategories: ['string'],
            dietaryCategories: ['string'],
            reasoning: 'kort dansk forklaring',
          },
        ],
      },
      null,
      2,
    ),
  )

  return lines.join('\n')
}

function buildUserPrompt(
  recipes: RecipeRow[],
  fields: Array<'mainCategory' | 'subCategories' | 'dietaryCategories'>,
): string {
  const lines: string[] = []
  lines.push(`Foreslå tags for følgende ${recipes.length} opskrift(er).`)
  lines.push(`Felter der ønskes forslag for: ${fields.join(', ')}`)
  lines.push('')

  for (const recipe of recipes) {
    const ingredients = extractIngredientNames(recipe.ingredients)
    const currentDiets = safeStringArray(recipe.dietaryCategories)
    const currentSubs = safeStringArray(recipe.subCategories)
    lines.push(`---`)
    lines.push(`recipeId: ${recipe.id}`)
    lines.push(`Titel: ${recipe.title}`)
    if (recipe.shortDescription) {
      lines.push(`Kort beskrivelse: ${recipe.shortDescription}`)
    } else if (recipe.description) {
      lines.push(`Beskrivelse: ${recipe.description.slice(0, 400)}`)
    }
    if (recipe.mainCategory) {
      lines.push(`Nuværende hovedkategori: ${recipe.mainCategory}`)
    }
    if (currentSubs.length > 0) {
      lines.push(`Nuværende subkategorier: ${currentSubs.join(', ')}`)
    }
    if (currentDiets.length > 0) {
      lines.push(`Nuværende diætkategorier: ${currentDiets.join(', ')}`)
    }
    if (ingredients.length > 0) {
      lines.push(`Ingredienser: ${ingredients.join(', ')}`)
    }
  }

  lines.push('')
  lines.push('Foreslå nu tags i den ønskede JSON-form. Returnér KUN JSON, intet andet.')
  return lines.join('\n')
}

async function fetchAllowedFromConfig(
  supabase: ReturnType<typeof createServerClient>,
  configTable: string,
): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from(configTable)
      .select('categories')
      .order('updated_at', { ascending: false })
      .limit(1)
      .single()
    if (error || !data) return []
    const cats = (data as { categories?: unknown }).categories
    return safeStringArray(cats)
  } catch {
    return []
  }
}

function parseJsonFromModel(raw: string): unknown {
  // The model sometimes wraps JSON in ```json fences.
  let trimmed = raw.trim()
  if (trimmed.startsWith('```')) {
    trimmed = trimmed.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim()
  }
  // Find the outer-most braces if extra prose sneaks in.
  const first = trimmed.indexOf('{')
  const last = trimmed.lastIndexOf('}')
  if (first !== -1 && last !== -1 && last > first) {
    trimmed = trimmed.slice(first, last + 1)
  }
  return JSON.parse(trimmed)
}

export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const supabase = createServerClient(supabaseUrl, serviceRoleKey, {
      cookies: {
        get() {
          return undefined
        },
        set() {},
        remove() {},
      },
    })

    const body = (await request.json()) as SuggestRequest

    const recipeIds = Array.from(
      new Set((body?.recipeIds ?? []).filter((id): id is string => typeof id === 'string' && id.length > 0)),
    )

    if (recipeIds.length === 0) {
      return NextResponse.json({ error: 'recipeIds is required' }, { status: 400 })
    }

    if (recipeIds.length > MAX_RECIPES_PER_REQUEST) {
      return NextResponse.json(
        { error: `Maksimum ${MAX_RECIPES_PER_REQUEST} opskrifter pr. forespørgsel` },
        { status: 400 },
      )
    }

    const fields =
      Array.isArray(body?.fields) && body.fields.length > 0
        ? body.fields.filter((f): f is 'mainCategory' | 'subCategories' | 'dietaryCategories' =>
            f === 'mainCategory' || f === 'subCategories' || f === 'dietaryCategories',
          )
        : (['mainCategory', 'subCategories', 'dietaryCategories'] as const).slice()

    // Allowed vocabularies: caller can override, otherwise fall back to config tables.
    const allowedMain =
      Array.isArray(body?.allowedMainCategories) && body.allowedMainCategories.length > 0
        ? safeStringArray(body.allowedMainCategories)
        : await fetchAllowedFromConfig(supabase, 'recipe_categories_config')

    const allowedDiet =
      Array.isArray(body?.allowedDietaryCategories) && body.allowedDietaryCategories.length > 0
        ? safeStringArray(body.allowedDietaryCategories)
        : await fetchAllowedFromConfig(supabase, 'dietary_categories_config')

    // No config table for subCategories – use the explicit allowedSubCategories if given,
    // otherwise derive from existing recipes so the AI can re-use established tags.
    let allowedSub = safeStringArray(body?.allowedSubCategories ?? [])
    if (allowedSub.length === 0) {
      const { data: subRows } = await supabase
        .from('recipes')
        .select('subCategories')
        .limit(2000)
      const seen = new Set<string>()
      for (const row of subRows ?? []) {
        for (const value of safeStringArray((row as any)?.subCategories)) {
          if (!seen.has(value.toLowerCase())) {
            seen.add(value.toLowerCase())
            allowedSub.push(value)
          }
        }
      }
      allowedSub = allowedSub.sort((a, b) => a.localeCompare(b, 'da'))
    }

    const { data: recipeRowsRaw, error: fetchError } = await supabase
      .from('recipes')
      .select('id, title, description, shortDescription, mainCategory, subCategories, dietaryCategories, ingredients')
      .in('id', recipeIds)

    if (fetchError) {
      console.error('❌ Error fetching recipes for AI suggest:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch recipes' }, { status: 500 })
    }

    const recipeRows: RecipeRow[] = (recipeRowsRaw ?? []).map((row: any) => ({
      id: String(row.id),
      title: typeof row.title === 'string' ? row.title : '',
      description: typeof row.description === 'string' ? row.description : null,
      shortDescription: typeof row.shortDescription === 'string' ? row.shortDescription : null,
      mainCategory: typeof row.mainCategory === 'string' ? row.mainCategory : null,
      subCategories: row.subCategories,
      dietaryCategories: row.dietaryCategories,
      ingredients: row.ingredients,
    }))

    if (recipeRows.length === 0) {
      return NextResponse.json({ error: 'No recipes found for given ids' }, { status: 404 })
    }

    const openaiConfig = getOpenAIConfig()
    if (!openaiConfig?.apiKey) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured', details: 'Configure it under /admin/settings' },
        { status: 500 },
      )
    }

    const systemPrompt = buildSystemPrompt(fields, {
      mainCategory: allowedMain,
      subCategories: allowedSub,
      dietaryCategories: allowedDiet,
    }, body?.instructions)

    const userPrompt = buildUserPrompt(recipeRows, fields)

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openaiConfig.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.2,
        response_format: { type: 'json_object' },
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => null)
      const message = errorData?.error?.message || `OpenAI API error (${response.status})`
      console.error('❌ OpenAI tag suggest error:', message)
      return NextResponse.json({ error: message }, { status: 502 })
    }

    const completion = await response.json()
    const content = completion?.choices?.[0]?.message?.content
    if (typeof content !== 'string' || content.length === 0) {
      return NextResponse.json({ error: 'Empty response from OpenAI' }, { status: 502 })
    }

    let parsed: unknown
    try {
      parsed = parseJsonFromModel(content)
    } catch (err) {
      console.error('❌ Failed to parse OpenAI response as JSON:', err, content)
      return NextResponse.json({ error: 'Could not parse AI response', raw: content }, { status: 502 })
    }

    const rawSuggestions = Array.isArray((parsed as any)?.suggestions)
      ? ((parsed as any).suggestions as unknown[])
      : []

    const allowedMainSet = new Set(allowedMain.map((v) => v.toLowerCase()))
    const allowedSubSet = new Set(allowedSub.map((v) => v.toLowerCase()))
    const allowedDietSet = new Set(allowedDiet.map((v) => v.toLowerCase()))
    const titleById = new Map(recipeRows.map((r) => [r.id, r.title]))

    // Filter values to allowed vocab and deduplicate.
    function filterValues(values: unknown, allowed: Set<string>, canonical: string[]): string[] {
      const list = safeStringArray(values)
      const out: string[] = []
      const seen = new Set<string>()
      for (const value of list) {
        const lower = value.toLowerCase()
        if (!allowed.has(lower)) continue
        // Use the canonical capitalisation from the allowed list when present.
        const canonicalMatch = canonical.find((c) => c.toLowerCase() === lower) || value
        const key = canonicalMatch.toLowerCase()
        if (seen.has(key)) continue
        seen.add(key)
        out.push(canonicalMatch)
      }
      return out
    }

    const suggestions: SuggestionForRecipe[] = rawSuggestions
      .map((s): SuggestionForRecipe | null => {
        if (!s || typeof s !== 'object') return null
        const recipeId = typeof (s as any).recipeId === 'string' ? (s as any).recipeId : null
        if (!recipeId || !titleById.has(recipeId)) return null

        const result: SuggestionForRecipe = {
          recipeId,
          title: titleById.get(recipeId) || '',
          reasoning: typeof (s as any).reasoning === 'string' ? (s as any).reasoning : undefined,
        }

        if (fields.includes('mainCategory')) {
          const value = (s as any).mainCategory
          if (typeof value === 'string' && allowedMainSet.has(value.toLowerCase())) {
            const canonical = allowedMain.find((c) => c.toLowerCase() === value.toLowerCase()) || value
            result.mainCategory = canonical
          } else {
            result.mainCategory = null
          }
        }
        if (fields.includes('subCategories')) {
          result.subCategories = filterValues((s as any).subCategories, allowedSubSet, allowedSub)
        }
        if (fields.includes('dietaryCategories')) {
          result.dietaryCategories = filterValues((s as any).dietaryCategories, allowedDietSet, allowedDiet)
        }

        return result
      })
      .filter((s): s is SuggestionForRecipe => s !== null)

    return NextResponse.json({
      success: true,
      suggestions,
      allowed: {
        mainCategory: allowedMain,
        subCategories: allowedSub,
        dietaryCategories: allowedDiet,
      },
    })
  } catch (error) {
    console.error('❌ Error in /api/admin/tags/suggest:', error)
    return NextResponse.json({ error: 'Failed to generate suggestions' }, { status: 500 })
  }
}
