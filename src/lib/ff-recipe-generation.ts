import { NextResponse } from 'next/server'
import {
  normalizeAiRecipeIngredients,
  normalizeAiRecipeInstructions,
} from '@/lib/ai-recipe-ingredient-normalize'
import { generateRecipeTips } from '@/lib/ff-recipe-tips'
import { resolveRecipeCall, type ExistingTitleRecipe } from '@/lib/ff-recipe-prompt'
import { generateMidjourneyPromptWithMeta } from '@/lib/midjourney-generator'
import { nutritionForProvisionalMeal } from '@/lib/provisional-nutrition'
import { getDietaryCategories } from '@/lib/recipe-tag-mapper'
import { inferSenseIngredientGroupsFromFlat } from '@/lib/sense-spisekasse'
import { getRecipeStructuralIntegrityIssues } from '@/lib/recipe-structural-integrity'
import { normalizeDanishRecipeTitle } from '@/lib/recipe-title-format'
import type { FfRecipeNiche } from '@/lib/recipe-dish-family'
import { NICHE_PROMPT_NAME } from '@/lib/recipe-dish-family'
import { getOpenAIConfig } from '@/lib/openai-config'
import type { SourceRecipePayload } from '@/lib/recipe-source-adaptation'

type IngredientLine = {
  name: string
  amount: number
  unit: string
  notes?: string | null
}

type InstructionLine = {
  stepNumber: number
  instruction: string
  time?: number | null
  tips?: string | null
}

export type GeneratedNicheRecipe = {
  title: string
  description: string
  ingredients: IngredientLine[]
  ingredientGroups?: Array<{
    name: string
    ingredients: IngredientLine[]
  }>
  instructions: InstructionLine[]
  servings: number
  prepTime: number
  cookTime: number
  difficulty: string
  dietaryCategories: string[]
  nutritionalInfo: {
    calories: number
    protein: number
    carbs: number
    fat: number
    fiber: number
  }
}

export type GenerateFfNicheInput = {
  niche: FfRecipeNiche
  existingRecipes?: ExistingTitleRecipe[]
  sourceRecipe?: SourceRecipePayload | null
  wish?: string | null
  mealType?: string | null
  constraints?: string[]
}

const EMPTY_NUTRITION = { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }

function stripHtml(text: string): string {
  return text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

function parseAmount(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) return value
  if (typeof value !== 'string') return 1
  const n = parseFloat(value.trim().replace(',', '.'))
  return Number.isFinite(n) && n > 0 ? n : 1
}

function ketoProteinIssue(ingredients: IngredientLine[]): string | null {
  const names = ingredients.map((ing) => ing.name.toLowerCase())
  const hasLamb = names.some((name) => name.includes('lam'))
  const hasFishOrShell = names.some((name) =>
    /laks|torsk|tun|makrel|sild|fisk|reje|musling|krabbe|skaldyr|hummer/.test(name),
  )
  if (hasLamb && hasFishOrShell) {
    return 'Lammekød er kombineret med fisk eller skaldyr. Vælg én proteinbase.'
  }
  return null
}

function readRecipeJson(content: string): {
  title: string
  description: string
  ingredients: IngredientLine[]
  instructions: InstructionLine[]
  prepTime: number
  cookTime: number
  difficulty: string
} {
  const jsonMatch = content.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('No JSON found in generated content')
  const recipe = JSON.parse(jsonMatch[0]) as Record<string, unknown>
  const rawIngredients = Array.isArray(recipe.ingredients) ? recipe.ingredients : []
  const rawInstructions = Array.isArray(recipe.instructions) ? recipe.instructions : []

  const ingredients = rawIngredients
    .filter((item) => item && typeof item === 'object')
    .map((item) => {
      const ing = item as { name?: string; amount?: unknown; unit?: string; notes?: string }
      return {
        name: String(ing.name || '').trim(),
        amount: parseAmount(ing.amount),
        unit: String(ing.unit || 'stk').trim() || 'stk',
        notes: ing.notes?.trim() || undefined,
      }
    })
    .filter((ing) => ing.name.length > 0)

  const instructions = rawInstructions
    .map((item, index) => {
      if (typeof item === 'string') {
        return { stepNumber: index + 1, instruction: stripHtml(item), time: 0, tips: '' }
      }
      if (!item || typeof item !== 'object') return null
      const step = item as { stepNumber?: number; instruction?: string; text?: string; time?: number; tips?: string }
      const instruction = stripHtml(String(step.instruction || step.text || ''))
      if (!instruction) return null
      return {
        stepNumber: step.stepNumber || index + 1,
        instruction,
        time: step.time || 0,
        tips: step.tips || '',
      }
    })
    .filter((step) => step !== null) as InstructionLine[]

  const title = String(recipe.title || '').trim()
  if (!title) throw new Error('Missing required recipe fields')
  if (!ingredients.length) throw new Error('AI returnerede ingen ingredienser')
  if (!instructions.length) throw new Error('AI returnerede ingen instruktioner')

  return {
    title,
    description: stripHtml(String(recipe.description || '')),
    ingredients,
    instructions,
    prepTime: Number(recipe.prepTime) || 15,
    cookTime: Number(recipe.cookTime) || 30,
    difficulty: String(recipe.difficulty || 'Medium'),
  }
}

function finishRecipe(niche: FfRecipeNiche, parsed: ReturnType<typeof readRecipeJson>): GeneratedNicheRecipe {
  const ingredients = normalizeAiRecipeIngredients(parsed.ingredients)
  const instructions = normalizeAiRecipeInstructions(parsed.instructions, ingredients)
  const title = normalizeDanishRecipeTitle(parsed.title)

  const structural = getRecipeStructuralIntegrityIssues({ title, ingredients })
  if (structural.length) {
    throw new Error(structural.join(' '))
  }
  if (niche === 'keto') {
    const proteinIssue = ketoProteinIssue(ingredients)
    if (proteinIssue) throw new Error(proteinIssue)
  }

  const recipe: GeneratedNicheRecipe = {
    title,
    description: parsed.description,
    ingredients: ingredients.map((ing) => ({
      name: ing.name,
      amount: ing.amount,
      unit: ing.unit,
      notes: ing.notes,
    })),
    instructions: instructions.map((step, index) => ({
      stepNumber: step.stepNumber || index + 1,
      instruction: step.instruction,
      time: step.time ?? null,
      tips: step.tips ?? null,
    })),
    servings: 2,
    prepTime: parsed.prepTime,
    cookTime: parsed.cookTime,
    difficulty: parsed.difficulty,
    dietaryCategories: getDietaryCategories(niche),
    nutritionalInfo: EMPTY_NUTRITION,
  }

  if (niche === 'sense') {
    const groups = inferSenseIngredientGroupsFromFlat(ingredients)
    if (groups?.length) {
      recipe.ingredientGroups = groups.map((group) => ({
        name: group.name,
        ingredients: group.ingredients.map((ing) => ({
          name: ing.name,
          amount: Number(ing.amount) || 0,
          unit: ing.unit || 'stk',
          notes: ing.notes,
        })),
      }))
      recipe.ingredients = recipe.ingredientGroups.flatMap((group) => group.ingredients)
    }
  }

  return recipe
}

async function attachIngredientNutrition(recipe: GeneratedNicheRecipe): Promise<void> {
  try {
    const frida = await nutritionForProvisionalMeal(recipe.ingredients, recipe.servings, null)
    if (frida.source === 'frida') {
      recipe.nutritionalInfo = {
        calories: Number(frida.nutrition.calories) || 0,
        protein: Number(frida.nutrition.protein) || 0,
        carbs: Number(frida.nutrition.carbs) || 0,
        fat: Number(frida.nutrition.fat) || 0,
        fiber: Number(frida.nutrition.fiber) || 0,
      }
    }
  } catch (error) {
    console.warn('Frida-ernæring under generering fejlede:', error)
  }
}

function openAiUserMessage(status: number, payload: Record<string, unknown>): { status: number; error: string; details: string } {
  const err = (payload.error as { message?: string; type?: string; code?: string } | undefined) || {}
  const msg = typeof err.message === 'string' && err.message.trim() ? err.message.trim() : 'Ukendt fejl fra OpenAI'
  const code = typeof err.code === 'string' ? err.code : ''
  const type = typeof err.type === 'string' ? err.type : ''
  const lower = msg.toLowerCase()
  const isQuota =
    code === 'insufficient_quota' ||
    type === 'insufficient_quota' ||
    lower.includes('exceeded your current quota') ||
    lower.includes('check your plan and billing')
  return {
    status: isQuota ? 503 : status >= 400 && status < 600 ? status : 502,
    error: isQuota
      ? `OpenAI: Forbrugsgrænse eller fakturering — tjek betalingsmetode og billing på platform.openai.com. Teknisk: ${msg}`
      : `OpenAI: ${msg}`,
    details: msg,
  }
}

export async function generateFfNicheRecipe(input: GenerateFfNicheInput): Promise<
  | {
      ok: true
      recipe: GeneratedNicheRecipe
      aiTips: string
      midjourneyPrompt: string
      midjourneyPromptSource: 'openai' | 'heuristic'
      midjourneyPromptError: string | null
      dishFamily: string | null
    }
  | { ok: false; status: number; error: string; details?: string }
> {
  const openaiConfig = getOpenAIConfig()
  if (!openaiConfig?.apiKey) {
    return {
      ok: false,
      status: 500,
      error: 'OpenAI API key not configured',
      details: 'Please configure OpenAI API key in admin settings',
    }
  }

  const call = resolveRecipeCall(input)
  let lastError = ''

  for (let attempt = 0; attempt < 2; attempt++) {
    const correction =
      attempt === 0 || !lastError
        ? ''
        : `\n\nFORRIGE FORSØG BLEV AFVIST: ${lastError}\nRet det. Behold kosten og rettypen. Returner kun JSON.`

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openaiConfig.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: call.systemPrompt },
          { role: 'user', content: `${call.userPrompt}${correction}` },
        ],
        temperature: call.temperature,
        max_tokens: 2000,
      }),
    })

    if (!response.ok) {
      let payload: Record<string, unknown> = {}
      try {
        payload = (await response.json()) as Record<string, unknown>
      } catch {
        payload = {}
      }
      const failure = openAiUserMessage(response.status, payload)
      return { ok: false, ...failure }
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content
    if (!content) {
      lastError = 'Modellen returnerede ingen tekst.'
      continue
    }

    try {
      const recipe = finishRecipe(input.niche, readRecipeJson(String(content)))
      await attachIngredientNutrition(recipe)
      const aiTips = await generateRecipeTips({
        title: recipe.title,
        description: recipe.description,
        nicheLabel: recipe.dietaryCategories[0] || NICHE_PROMPT_NAME[input.niche],
        ingredients: recipe.ingredients.map((ing) => {
          const notes = ing.notes ? ` (${ing.notes})` : ''
          return `${ing.name}${notes}`
        }),
        instructions: recipe.instructions.map((step) => step.instruction).slice(0, 10),
      })

      let midjourneyPrompt = ''
      let midjourneyPromptSource: 'openai' | 'heuristic' = 'heuristic'
      let midjourneyPromptError: string | null = null
      try {
        const mj = await generateMidjourneyPromptWithMeta(recipe)
        midjourneyPrompt = mj.prompt || ''
        midjourneyPromptSource = mj.source
        midjourneyPromptError = mj.error || null
      } catch (mjErr) {
        midjourneyPromptError = mjErr instanceof Error ? mjErr.message : 'Ukendt fejl ved Midjourney-prompt'
      }

      return {
        ok: true,
        recipe,
        aiTips,
        midjourneyPrompt,
        midjourneyPromptSource,
        midjourneyPromptError,
        dishFamily: call.familyLabel,
      }
    } catch (error) {
      lastError = error instanceof Error ? error.message : 'Kunne ikke læse opskriften'
    }
  }

  return {
    ok: false,
    status: 422,
    error: `Kunne ikke generere en gyldig opskrift. ${lastError}`.trim(),
    details: lastError,
  }
}

export function nicheGenerationResponse(result: Awaited<ReturnType<typeof generateFfNicheRecipe>>) {
  if (!result.ok) {
    return NextResponse.json(
      { success: false, error: result.error, details: result.details },
      { status: result.status },
    )
  }
  return NextResponse.json({
    success: true,
    recipe: result.recipe,
    aiTips: result.aiTips,
    midjourneyPrompt: result.midjourneyPrompt,
    midjourneyPromptSource: result.midjourneyPromptSource,
    midjourneyPromptError: result.midjourneyPromptError,
  })
}
