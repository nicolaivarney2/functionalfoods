/**
 * Fase 5 — foreløbige opskrifter (AI-fra-billede + byg-selv).
 * Delte typer og hjælpere for /api/recipes/from-photo, /api/recipes/provisional
 * og admin-godkendelse. Holder format på linje med save-ai-draft (FF/Frida).
 */

export type ProvisionalStatus = 'draft' | 'pending' | 'approved' | 'rejected'
export type ProvisionalSource = 'ai-photo' | 'manual'

export interface ProvisionalIngredient {
  name: string
  amount: number
  unit: string
  notes?: string | null
}

export interface ProvisionalInstruction {
  stepNumber: number
  instruction: string
  time?: number | null
  tips?: string | null
}

export interface ProvisionalNutrition {
  calories?: number
  protein?: number
  carbs?: number
  fat?: number
  fiber?: number
}

export interface ClarifyingQuestion {
  question: string
  answer?: string | null
}

/** Rå række fra provisional_recipes (snake_case — returneres som-is fra API'et). */
export interface ProvisionalRecipeRow {
  id: string
  user_id: string
  status: ProvisionalStatus
  source: ProvisionalSource
  title: string
  description: string | null
  image_url: string | null
  servings: number
  prep_time: number | null
  cook_time: number | null
  difficulty: string | null
  ingredients: ProvisionalIngredient[]
  instructions: ProvisionalInstruction[]
  nutrition: ProvisionalNutrition
  dietary_categories: string[]
  clarifying_questions: ClarifyingQuestion[]
  ai_notes: string | null
  promoted_recipe_id: string | null
  review_notes: string | null
  reviewed_by: string | null
  reviewed_at: string | null
  created_at: string
  updated_at: string
}

export const PROVISIONAL_SELECT =
  'id, user_id, status, source, title, description, image_url, servings, prep_time, cook_time, difficulty, ingredients, instructions, nutrition, dietary_categories, clarifying_questions, ai_notes, promoted_recipe_id, review_notes, reviewed_by, reviewed_at, created_at, updated_at'

function num(value: unknown, fallback = 0): number {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

/** Renser AI/klient-ingredienser til vores faste form (navn + mængde + enhed + note). */
export function sanitizeIngredients(input: unknown): ProvisionalIngredient[] {
  if (!Array.isArray(input)) return []
  const out: ProvisionalIngredient[] = []
  for (const raw of input) {
    if (out.length >= 60) break
    const r = (raw ?? {}) as Record<string, unknown>
    const name = typeof r.name === 'string' ? r.name.trim() : ''
    if (!name) continue
    const notes = typeof r.notes === 'string' && r.notes.trim() ? r.notes.trim() : null
    out.push({
      name: name.slice(0, 120),
      amount: Math.max(0, num(r.amount, 0)),
      unit: typeof r.unit === 'string' ? r.unit.trim().slice(0, 24) : '',
      notes,
    })
  }
  return out
}

/** Renser fremgangsmåde og nummererer trin stabilt fra 1. */
export function sanitizeInstructions(input: unknown): ProvisionalInstruction[] {
  if (!Array.isArray(input)) return []
  const out: ProvisionalInstruction[] = []
  for (const raw of input) {
    if (out.length >= 40) break
    const r = (raw ?? {}) as Record<string, unknown>
    const instruction =
      typeof raw === 'string'
        ? raw.trim()
        : typeof r.instruction === 'string'
          ? r.instruction.trim()
          : ''
    if (!instruction) continue
    const time = r.time != null && Number.isFinite(Number(r.time)) ? Number(r.time) : null
    const tips = typeof r.tips === 'string' && r.tips.trim() ? r.tips.trim() : null
    out.push({ stepNumber: out.length + 1, instruction: instruction.slice(0, 2000), time, tips })
  }
  return out
}

export function sanitizeNutrition(input: unknown): ProvisionalNutrition {
  const r = (input ?? {}) as Record<string, unknown>
  const out: ProvisionalNutrition = {}
  if (r.calories != null) out.calories = Math.round(num(r.calories))
  if (r.protein != null) out.protein = Math.round(num(r.protein) * 10) / 10
  if (r.carbs != null) out.carbs = Math.round(num(r.carbs) * 10) / 10
  if (r.fat != null) out.fat = Math.round(num(r.fat) * 10) / 10
  if (r.fiber != null) out.fiber = Math.round(num(r.fiber) * 10) / 10
  return out
}

export function sanitizeClarifyingQuestions(input: unknown): ClarifyingQuestion[] {
  if (!Array.isArray(input)) return []
  const out: ClarifyingQuestion[] = []
  for (const raw of input) {
    if (out.length >= 8) break
    if (typeof raw === 'string') {
      const q = raw.trim()
      if (q) out.push({ question: q.slice(0, 300), answer: null })
      continue
    }
    const r = (raw ?? {}) as Record<string, unknown>
    const question = typeof r.question === 'string' ? r.question.trim() : ''
    if (!question) continue
    const answer = typeof r.answer === 'string' && r.answer.trim() ? r.answer.trim() : null
    out.push({ question: question.slice(0, 300), answer })
  }
  return out
}

export const VISION_SYSTEM_PROMPT = `Du er en dansk ernærings- og madekspert. Du får et billede af en ret/måltid.
Analysér billedet og lav et kvalificeret bud på en opskrift på dansk.

VIGTIGT:
- Ingrediensnavne skal være rene basisnavne (fx "kyllingebryst", "broccoli", "olivenolie").
  Læg tilberedning/forklaring i "notes" (fx "i tern", "hakket").
- Brug realistiske mængder i gram (g), ml, stk, spsk eller tsk.
- Krydderier skal være nøgterne: brug som udgangspunkt ca. 0,5 tsk salt og 0,25 tsk
  peber pr. opskrift, medmindre retten tydeligvis kræver mere.
- Estimér ernæring PR. PORTION så godt du kan.
- Stil 2-4 korte opklarende spørgsmål om det du er usikker på (fx portionsstørrelse,
  skjulte ingredienser, tilberedning, olie/smør-mængde).

Returnér KUN gyldig JSON i præcis dette format:
{
  "title": "Kort, beskrivende titel",
  "description": "1-2 sætninger om retten",
  "servings": 2,
  "prepTime": 10,
  "cookTime": 20,
  "difficulty": "Easy|Medium|Hard",
  "dietaryCategories": ["fx proteinrig"],
  "ingredients": [{ "name": "kyllingebryst", "amount": 300, "unit": "g", "notes": "i tern" }],
  "instructions": [{ "stepNumber": 1, "instruction": "..." }],
  "nutritionalInfo": { "calories": 450, "protein": 35, "carbs": 30, "fat": 18, "fiber": 6 },
  "clarifyingQuestions": ["Hvor mange portioner var det?", "Brugte du olie eller smør?"]
}`

/** Trækker første JSON-objekt ud af et LLM-svar (tåler markdown-fences). */
export function parseVisionRecipe(content: string): {
  title: string
  description: string
  servings: number
  prepTime: number
  cookTime: number
  difficulty: string
  dietaryCategories: string[]
  ingredients: ProvisionalIngredient[]
  instructions: ProvisionalInstruction[]
  nutrition: ProvisionalNutrition
  clarifyingQuestions: ClarifyingQuestion[]
} {
  const match = content.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('Intet JSON i AI-svar')
  const raw = JSON.parse(match[0]) as Record<string, unknown>

  return {
    title: typeof raw.title === 'string' && raw.title.trim() ? raw.title.trim().slice(0, 150) : 'Foreløbig opskrift',
    description: typeof raw.description === 'string' ? raw.description.trim().slice(0, 600) : '',
    servings: Math.max(1, Math.round(num(raw.servings, 2))),
    prepTime: Math.max(0, Math.round(num(raw.prepTime, 10))),
    cookTime: Math.max(0, Math.round(num(raw.cookTime, 15))),
    difficulty: typeof raw.difficulty === 'string' ? raw.difficulty : 'Medium',
    dietaryCategories: Array.isArray(raw.dietaryCategories)
      ? raw.dietaryCategories.filter((c): c is string => typeof c === 'string').slice(0, 6)
      : [],
    ingredients: sanitizeIngredients(raw.ingredients),
    instructions: sanitizeInstructions(raw.instructions),
    nutrition: sanitizeNutrition(raw.nutritionalInfo ?? raw.nutrition),
    clarifyingQuestions: sanitizeClarifyingQuestions(raw.clarifyingQuestions),
  }
}
