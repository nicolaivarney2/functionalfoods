type IngredientLike = {
  name: string
}

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  protein: [
    'kylling',
    'kalkun',
    'okse',
    'svin',
    'lam',
    'fisk',
    'laks',
    'tun',
    'rejer',
    'æg',
    'aeg',
    'skyr',
    'hytteost',
    'cottage',
    'tofu',
    'tempeh',
  ],
  groent: [
    'broccoli',
    'blomkål',
    'blomkaal',
    'spinat',
    'grønkål',
    'groenkaal',
    'peberfrugt',
    'squash',
    'zucchini',
    'kål',
    'kaal',
    'salat',
    'tomat',
    'agurk',
    'løg',
    'loeg',
    'gulerod',
  ],
  balg: ['linser', 'kikærter', 'kikaerter', 'bønner', 'boenner', 'ærter', 'aerter'],
  korn: ['fuldkorn', 'havre', 'ris', 'quinoa', 'bulgur', 'lasagneplader', 'wraps', 'pasta'],
  fedt: ['olivenolie', 'olie', 'smør', 'smoer', 'avocado', 'kokosolie', 'ghee'],
  krydderi: ['salt', 'peber', 'paprika', 'kurkuma', 'chili', 'kanel', 'spidskommen', 'hvidløg', 'hvidløgsfed'],
  urter: ['persille', 'basilikum', 'timian', 'mynte', 'dild', 'oregano', 'rosmarin'],
  nodder: ['mandler', 'valnødder', 'valnoedder', 'cashew', 'hasselnød', 'hasselnoed', 'nød', 'noed', 'chia', 'hørfrø', 'hoerfro'],
  frugt: ['citron', 'lime', 'æble', 'aeble', 'banan', 'bær', 'baer', 'jordbær', 'jordbaer', 'blåbær', 'blaabaer'],
}

function inferIngredientCategory(name: string): string {
  const lower = name.toLowerCase()
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((keyword) => lower.includes(keyword))) {
      return category
    }
  }
  return 'andre'
}

function normalizeIngredientName(name: string): string {
  return String(name || '')
    .trim()
    .replace(/\s+/g, ' ')
}

export async function syncIngredientsToRegistry(
  supabase: any,
  ingredients: IngredientLike[]
): Promise<void> {
  const uniqueNames = Array.from(
    new Set(
      (ingredients || [])
        .map((ingredient) => normalizeIngredientName(ingredient.name))
        .filter(Boolean)
    )
  )

  if (uniqueNames.length === 0) return

  const existingNames = new Set<string>()

  await Promise.all(
    uniqueNames.map(async (name) => {
      const { data, error } = await supabase
        .from('ingredients')
        .select('id, name')
        .ilike('name', name)
        .limit(1)

      if (!error && Array.isArray(data) && data.length > 0) {
        existingNames.add(name.toLowerCase())
      }
    })
  )

  const missing = uniqueNames.filter((name) => !existingNames.has(name.toLowerCase()))
  if (missing.length === 0) return

  const rows = missing.map((name) => ({
    id: crypto.randomUUID(),
    name,
    category: inferIngredientCategory(name),
  }))

  const { error: insertError } = await supabase
    .from('ingredients')
    .insert(rows)

  if (insertError) {
    throw new Error(`Failed to sync ingredients to registry: ${insertError.message}`)
  }
}

