import {
  familiesForNiche,
  focusLine,
  lockedBlock,
  NICHE_PROMPT_NAME,
  pickLeastUsedFamily,
  type FfRecipeNiche,
} from '@/lib/recipe-dish-family'
import { getDietaryCategories } from '@/lib/recipe-tag-mapper'
import {
  buildSourceRecipeUserPrompt,
  isSourceRecipe,
  type SourceRecipePayload,
} from '@/lib/recipe-source-adaptation'

export type ExistingTitleRecipe = {
  title?: string
  dietaryCategories?: string[]
  dietary_categories?: string[]
}

export type RecipeGenerationMode = 'free' | 'wish' | 'source'

const DESCRIPTION_RULES = `BESKRIVELSE — KRITISK:
- Skriv 2–4 sætninger der er specifikke for netop denne ret, som om du anbefaler den til en ven
- Nævn mindst 2–3 konkrete ingredienser, en smag, en tekstur eller en tilberedning
- Aldrig tomme sætninger som eneste indhold: "en skål fuld af smag", "farver og skønne råvarer", "nem og hurtig aftensmad", "denne opskrift egner sig godt til"
- Ingen diæt-slogan og ingen løfter om at helbrede, tabe sig eller booste hjernen`

const AMOUNT_RULES = `MÆNGDER TIL 2 PERSONER:
- Hakket oksekød eller svinekød: 300–400 g
- Kyllingebryst: 200–300 g
- Torskefilet eller laksefilet: 225 g
- Kartofler, kun når retten bruger dem: 300–500 g. Ikke kartofler som standard
- Ris eller pasta, tør: 150–200 g
- Broccoli: 0,5–1 stk. Aldrig gram
- Løg: 1 stk. Gulerødder: 2–3 stk. Tomater: 2–3 stk. Æg: 2–3 stk
- Fløde eller mælk: 200–300 ml. Smør eller olie: 1–2 spsk
- I tvivl: den mindre mængde`

export const FF_JSON_RECIPE_FORMAT = `OPPSKRIFT FORMAT (returner kun JSON):
{
  "title": "Opskrift titel",
  "description": "Specifik beskrivelse",
  "ingredients": [{ "name": "ingrediens navn", "amount": 100, "unit": "g" }],
  "instructions": [{ "stepNumber": 1, "instruction": "Tilsæt [[ing:ingrediens navn]] og steg …", "time": 10 }],
  "servings": 2,
  "prepTime": 15,
  "cookTime": 30,
  "difficulty": "Easy|Medium|Hard",
  "nutritionalInfo": { "calories": 400, "protein": 25, "carbs": 45, "fat": 18, "fiber": 6 }
}

INGREDIENS REGLER:
- Brug g, ml, tsk, spsk, stk. dl findes ikke: 1 dl = 100 ml
- Navne med små bogstaver. Altid 2 portioner
- name er et butiksnavn. Opfind ikke nye navne
- peber, ikke "sort peber" eller "peberkorn". salt, ikke "groft salt"
- Altid olivenolie. Aldrig olie, rapsolie eller planteolie
- Ikke "rød peberfrugt". Brug peberfrugter
- Friske krydderurter: name "frisk persille" (eller dild, basilikum, koriander, mynte, timian, rosmarin, purløg), enhed bundt, mængde 0.25, højst 0.5. Aldrig 1 bundt
- Tørrede krydderurter: 0.5 tsk, uden ordet frisk
- Agurk: 0.5 stk. Broccoli: stk, aldrig gram
- Wraps, pita og burger skal have salat, tomat eller agurk at bygge med

FREMGangsMÅDE:
- Alle mængder står kun i ingredients. Ingen gram, ml eller antal i instructions
- Når du nævner en vare, wrap den: "Steg [[ing:kyllingebryst]] med [[ing:hvidløgsfed]]."
- Tagget skal være ordret det samme som name
- Hakket, revet, i tern, i skiver, i kvarte, drænet, skrællet skal være et trin: "Skær [[ing:kartofler]] i kvarte." Skriv ikke "revet [[ing:parmesan]]" — ordet forsvinder, når mængden sættes ind
- name er råvaren. "kartofler", ikke "kartofler i kvarte". "kyllingebryst", ikke "grillet kyllingebryst"
- Ingen fortilberedt hovedingrediens. Ikke grillet, stegt, kogt, marineret eller paneret kød, kylling eller fisk. Frosne grøntsager, pasta, ris, dåsebønner og krydderier er i orden
- Hver ret skal have et lille ekstra, der samler smagen: en simpel sovs, dressing eller dryp af 1–3 ting, der allerede er i listen, eller af salt, peber, olivenolie, smør, citron, hvidløg, sennep eller honning. Køb ikke en færdig sovs, og tilføj ikke en ny hovedingrediens for det

OVERRULE:
Salt, peber og olie alene gør ikke retten færdig. Fremgangsmåden skal samle den. Ingredienserne følger retten.`

export const FF_TIPS_SYSTEM_PROMPT = `Du skriver tips til en FunctionalFoods-opskrift. Skriv på dansk.
Skriv 3–4 tips som om du har lavet præcis denne ret mange gange.
Hvert tip skal nævne en ingrediens, et trin eller en tekstur fra opskriften.
Generiske råd der kunne sidde på en hvilken som helst ret er forbudt.
Højst ét tip om rester. Resten er madlavning: timing, tekstur, hvad der går galt.
Ingen løfter om vægttab, helbredelse eller "boost".
Format: bindestreg foran hvert tip. Ingen overskrift. Ingen nummerering.`

export const FF_TIPS_FALLBACK = `- Smag sovsen til sidst. Salt og syre løfter den mere end endnu en urt.`

export function recipeGenerationTemperature(mode: RecipeGenerationMode): number {
  if (mode === 'source') return 0.35
  if (mode === 'wish') return 0.45
  return 0.85
}

export function titlesForNiche(recipes: ExistingTitleRecipe[] | undefined, niche: FfRecipeNiche): string[] {
  const tags = getDietaryCategories(niche).map((tag) => tag.toLowerCase())
  const list = Array.isArray(recipes) ? recipes : []
  const matched = list.filter((recipe) => {
    const cats = (recipe.dietaryCategories || recipe.dietary_categories || [])
      .map((cat) => String(cat || '').toLowerCase())
    return cats.some(
      (cat) =>
        cat.length >= 3 &&
        tags.some((tag) => cat === tag || cat.includes(tag) || tag.includes(cat)),
    )
  })
  return matched
    .map((recipe) => String(recipe.title || '').trim())
    .filter(Boolean)
    .slice(0, 40)
}

export function formatExistingTitles(titles: string[]): string {
  if (!titles.length) return '(ingen endnu)'
  return titles.map((title) => `- ${title}`).join('\n')
}

export function denneGangLine(label: string | null): string {
  if (!label) return ''
  return `DENNE GANG: ${label}. Retten bestemmer sovs, grønt og tilbehør.`
}

export function buildFfRecipeSystemPrompt(input: {
  niche: FfRecipeNiche
  titles: string[]
  familyLabel: string | null
}): string {
  return `Du er FunctionalFoods' opskriftsassistent. Skriv altid på dansk. Brug almindelige danske butiksvarer. Tone og fokus følger den aktive kost. Nævn ikke Planomo.

${focusLine(input.niche)}

${DESCRIPTION_RULES}

${lockedBlock(input.niche)}

${denneGangLine(input.familyLabel)}

EKSISTERENDE OPSKRIFTER (lav en anden slags ret):
${formatExistingTitles(input.titles)}

${AMOUNT_RULES}

${FF_JSON_RECIPE_FORMAT}`.replace(/\n{3,}/g, '\n\n')
}

export function buildFreeTextWishBlock(wish: string, niche: FfRecipeNiche): string {
  const nicheName = NICHE_PROMPT_NAME[niche]
  return `FRITEKST-ØNSKE (høj prioritet):
Brugeren vil have en opskrift på: "${wish.trim()}".
Lav netop den ret — samme idé, hovedingredienser, tilberedning og smagsretning.
Tilpas kun det, ${nicheName} kræver. Opfind ikke en anden ret. Titlen skal afspejle ønsket.`
}

export function buildFreeRecipeUserPrompt(input: {
  niche: FfRecipeNiche
  familyLabel: string
  constraints?: string[]
}): string {
  const nicheName = NICHE_PROMPT_NAME[input.niche]
  const base = `Generer én ${nicheName}-opskrift til 2. Det skal være ${input.familyLabel}. Fremgangsmåden skal gøre den færdig.`
  const extra = (input.constraints || []).map((line) => line.trim()).filter(Boolean)
  return extra.length ? `${base}\n\n${extra.join('\n')}` : base
}

export function buildMealUserPrompt(input: {
  niche: FfRecipeNiche
  mealLabel: string
  constraints?: string[]
}): string {
  const nicheName = NICHE_PROMPT_NAME[input.niche]
  const base = `Generer én ${nicheName}-opskrift til 2. Det skal være ${input.mealLabel}. Fremgangsmåden skal gøre den færdig.`
  const extra = (input.constraints || []).map((line) => line.trim()).filter(Boolean)
  return extra.length ? `${base}\n\n${extra.join('\n')}` : base
}

export function buildWishUserPrompt(input: {
  niche: FfRecipeNiche
  wish: string
  constraints?: string[]
}): string {
  const extra = (input.constraints || []).map((line) => line.trim()).filter(Boolean)
  const block = buildFreeTextWishBlock(input.wish, input.niche)
  return extra.length ? `${block}\n\n${extra.join('\n')}` : block
}

export type ResolvedRecipeCall = {
  mode: RecipeGenerationMode
  temperature: number
  familyLabel: string | null
  systemPrompt: string
  userPrompt: string
}

const DINNER_MEALS = new Set(['', 'aftensmad', 'aften', 'middag'])

export function resolveRecipeCall(input: {
  niche: FfRecipeNiche
  existingRecipes?: ExistingTitleRecipe[]
  sourceRecipe?: SourceRecipePayload | null
  wish?: string | null
  mealType?: string | null
  constraints?: string[]
}): ResolvedRecipeCall {
  const titles = titlesForNiche(input.existingRecipes, input.niche)
  const wish = input.wish?.trim() || ''
  const meal = (input.mealType || '').trim().toLowerCase()
  const constraints = input.constraints || []

  if (isSourceRecipe(input.sourceRecipe)) {
    return {
      mode: 'source',
      temperature: recipeGenerationTemperature('source'),
      familyLabel: null,
      systemPrompt: buildFfRecipeSystemPrompt({ niche: input.niche, titles, familyLabel: null }),
      userPrompt: buildSourceRecipeUserPrompt(input.sourceRecipe, NICHE_PROMPT_NAME[input.niche]),
    }
  }

  if (wish) {
    return {
      mode: 'wish',
      temperature: recipeGenerationTemperature('wish'),
      familyLabel: null,
      systemPrompt: buildFfRecipeSystemPrompt({ niche: input.niche, titles, familyLabel: null }),
      userPrompt: buildWishUserPrompt({ niche: input.niche, wish, constraints }),
    }
  }

  if (meal && !DINNER_MEALS.has(meal)) {
    return {
      mode: 'free',
      temperature: recipeGenerationTemperature('free'),
      familyLabel: null,
      systemPrompt: buildFfRecipeSystemPrompt({ niche: input.niche, titles, familyLabel: null }),
      userPrompt: buildMealUserPrompt({ niche: input.niche, mealLabel: meal, constraints }),
    }
  }

  const familyLabel = pickLeastUsedFamily(titles, familiesForNiche(input.niche))
  return {
    mode: 'free',
    temperature: recipeGenerationTemperature('free'),
    familyLabel,
    systemPrompt: buildFfRecipeSystemPrompt({ niche: input.niche, titles, familyLabel }),
    userPrompt: buildFreeRecipeUserPrompt({ niche: input.niche, familyLabel, constraints }),
  }
}

export function buildTipsUserPrompt(input: {
  title: string
  description?: string
  nicheLabel?: string
  ingredients?: string[]
  instructions?: string[]
}): string {
  const ingredients = (input.ingredients || []).filter(Boolean)
  const steps = (input.instructions || []).filter(Boolean)
  return `Generer personlige tips til denne opskrift:

Opskrift: ${input.title}
Beskrivelse: ${input.description || ''}
Kategori: ${input.nicheLabel || 'Generel'}

Ingredienser:
${ingredients.length ? ingredients.map((line) => `- ${line}`).join('\n') : '(ingen)'}

Fremgangsmåde (kort):
${steps.length ? steps.map((line) => `- ${line}`).join('\n') : '(ingen)'}

Skriv 3–4 tips til præcis denne ret. Nævn konkrete ingredienser og teknikker fra listen.`
}
