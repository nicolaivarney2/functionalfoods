import type { ShoppingItem, ShoppingList } from './types'

const TIL_BORN_LABEL = 'Til børn'

/** Varer der fjernes helt fra keto-indkøbslisten */
const KETO_REMOVE_PATTERNS: RegExp[] = [
  /\bkartoffel/i,
  /\bpizzadej\b/i,
  /\bpizza\s*dej\b/i,
  /\bpommes\s*frites\b/i,
  /\bpomfrit/i,
  /\bburgerbolle/i,
  /\bburger\s*boller/i,
]

export function isKetoDietaryApproach(id: string | undefined | null): boolean {
  if (!id) return false
  const n = String(id).toLowerCase().trim().replace(/_/g, '-')
  return n === 'keto'
}

function normalizeName(name: string): string {
  return String(name || '').toLowerCase().trim()
}

function shouldRemoveOnKeto(name: string): boolean {
  const n = normalizeName(name)
  return KETO_REMOVE_PATTERNS.some((re) => re.test(n))
}

function isPastaIngredient(name: string): boolean {
  const n = normalizeName(name)
  if (/karrypasta|tomatpur|pesto/.test(n)) return false
  return /\bpasta\b|spaghetti|penne|fusilli|tagliatelle|lasagne|macaroni|linguine|fettuccine/i.test(n)
}

function isRisIngredient(name: string): boolean {
  const n = normalizeName(name)
  if (/blomkålsris|blomkaalsris|cauliflower\s*rice/i.test(n)) return false
  if (/risotto|risengryd|risalamande|risvin|ris\s*papir/i.test(n)) return false
  return /\bris\b|basmatiris|jasminris|vildris|parboiled/i.test(n)
}

function mergeStarchLines(items: ShoppingItem[], match: (name: string) => boolean, displayName: string): ShoppingItem | null {
  const matched = items.filter((it) => match(it.name))
  if (matched.length === 0) return null

  const byUnit = new Map<string, number>()
  let ingredientId: string | undefined
  for (const it of matched) {
    const unit = String(it.unit || 'stk').toLowerCase()
    byUnit.set(unit, (byUnit.get(unit) || 0) + (Number(it.amount) || 0))
    if (!ingredientId && it.ingredientId) ingredientId = it.ingredientId
  }

  const [unit, amount] = [...byUnit.entries()].sort((a, b) => b[1] - a[1])[0] || ['stk', 0]
  const template = matched[0]

  return {
    ...template,
    name: matched.length === 1 ? template.name : displayName,
    amount,
    unit,
    ingredientId,
    notes: TIL_BORN_LABEL,
    isSupplement: false,
    supplementReason: undefined,
  }
}

/**
 * Keto-indkøbsliste: fjern høj-kulhydrat tilbehør, behold max. én pasta og én ris med "Til børn".
 */
export function applyKetoShoppingListRules(list: ShoppingList): ShoppingList {
  const collected: ShoppingItem[] = []
  const categories = (list.categories || []).map((cat) => {
    const kept: ShoppingItem[] = []
    for (const item of cat.items || []) {
      const name = item.name || ''
      if (shouldRemoveOnKeto(name)) continue
      if (isPastaIngredient(name) || isRisIngredient(name)) {
        collected.push(item)
        continue
      }
      kept.push(item)
    }
    return { ...cat, items: kept }
  })

  const pastaLine = mergeStarchLines(collected, isPastaIngredient, 'Pasta')
  const risLine = mergeStarchLines(collected, isRisIngredient, 'Ris')

  const extras = [pastaLine, risLine].filter(Boolean) as ShoppingItem[]
  if (extras.length === 0) {
    return { ...list, categories: categories.filter((c) => (c.items?.length ?? 0) > 0) }
  }

  const kolonialName = 'Kolonial & Diverse'
  let placed = false
  const withExtras = categories.map((cat) => {
    if (cat.name === kolonialName) {
      placed = true
      return { ...cat, items: [...(cat.items || []), ...extras] }
    }
    return cat
  })

  if (!placed) {
    withExtras.push({ name: kolonialName, items: extras })
  }

  return {
    ...list,
    categories: withExtras.filter((c) => (c.items?.length ?? 0) > 0),
  }
}
