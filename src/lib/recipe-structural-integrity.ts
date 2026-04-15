/**
 * Deterministisk kvalitetstjek: stemmer velkendte retnavne i titlen
 * med de ingredienser, de fleste læsere forventer (fx lasagne → plader).
 * Bruges af admin-validering; udvid regler her efter behov.
 */

export type RecipeStructuralInput = {
  title: string
  ingredients?: Array<{ name?: string | null } | string>
  ingredientGroups?: Array<{
    name?: string | null
    ingredients?: Array<{ name?: string | null } | string>
  }>
}

function foldDa(s: string): string {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
}

function ingredientBlob(recipe: RecipeStructuralInput): string {
  const parts: string[] = []
  const push = (ing: { name?: string | null } | string | undefined) => {
    const n = typeof ing === 'string' ? ing : ing?.name
    if (n && String(n).trim()) parts.push(foldDa(String(n)))
  }
  for (const ing of recipe.ingredients || []) push(ing)
  for (const g of recipe.ingredientGroups || []) {
    for (const ing of g.ingredients || []) push(ing)
  }
  return parts.join(' | ')
}

export function getRecipeStructuralIntegrityIssues(recipe: RecipeStructuralInput): string[] {
  const title = foldDa(recipe.title || '')
  const ing = ingredientBlob(recipe)
  const issues: string[] = []

  // --- Lasagne ---
  if (/\blasagne\b/.test(title)) {
    const explicitAlt = /(kartoffel|grontsags|zucchini|squash|aubergine|uden pasta|pastafri|lavkul|keto|lowcarb)/.test(
      title
    )
    if (!explicitAlt) {
      const hasPastaLayers =
        /lasagneplad|lasagne plad|pastaplad|torre lasagne|friske lasagne|lasagne sheets|no-?boil|lasagne pasta/.test(
          ing
        ) || /\b(pasta|lasagne)\b/.test(ing)
      if (!hasPastaLayers) {
        issues.push(
          'Struktur: Titlen er lasagne, men ingredienserne mangler lasagneplader/pasta til lag (eller titlen skal sige kartoffel-/grøntsagslasagne).'
        )
      }
    }
  }

  // --- Carbonara ---
  if (/carbonara/.test(title)) {
    if (!/(spaghetti|penne|pasta|tagliatelle|fettuccine|rigatoni|linguine|fusilli|macaroni)/.test(ing)) {
      issues.push('Struktur: Carbonara kræver pasta i ingredienslisten med tydeligt navn og mængde.')
    }
  }

  // --- Pizza (undtag supper og ren "pizzaost") ---
  if (/\bpizza\b/.test(title) && !/(pizzasuppe|pizza suppe|dip|snackbolle)/.test(title)) {
    const hasBase =
      /pizzadej|tipo.?00|hvedemel|fuldkornsmel|gaer|mel.*gaer|gaer.*mel|tortilla|pitabrod|pita|polenta|blomkal|kartoffel.*bund/.test(
        ing
      )
    if (!hasBase) {
      issues.push(
        'Struktur: Pizza skal have en tydelig bund (dej, tortilla, pita, polenta/kartoffelbund …) i ingredienserne.'
      )
    }
  }

  // --- Burger ---
  if (/\bburger\b/.test(title)) {
    const hasBun =
      /(bolle|brioche|sesam|burgerbolle|sandwichbolle|rundstykke|flute|ciabatta|wrap som bolle)/.test(ing)
    const hasPatty =
      /(bof|patty|hakket|fars|kyllingeburger|vegetarburger|bonneburger|portobello|halloumi)/.test(ing)
    if (!hasBun || !hasPatty) {
      issues.push(
        'Struktur: Burger skal have både bolle/brød og patty/bøf (eller tydeligt vegetar-alternativ) med mængder.'
      )
    }
  }

  // --- Taco (simpelt: skal eller tortilla) ---
  if (/\btaco\b/.test(title) && !/tacosuppe|taco suppe/.test(title)) {
    if (!/(tortilla|tacoskal|majseskal|hard shell|soft shell)/.test(ing)) {
      issues.push('Struktur: Taco skal have tortilla eller taco-skal i ingredienserne.')
    }
  }

  // --- Risotto ---
  if (/\brisotto\b/.test(title)) {
    if (!/(arborio|carnaroli|risottoris|groris|paelleris)/.test(ing)) {
      issues.push('Struktur: Risotto skal have ris (fx arborio/carnaroli) angivet i ingredienserne.')
    }
  }

  return issues
}

export function validateRecipeStructuralIntegrity(recipe: RecipeStructuralInput): {
  isValid: boolean
  issues: string[]
} {
  const issues = getRecipeStructuralIntegrityIssues(recipe)
  return { isValid: issues.length === 0, issues }
}
