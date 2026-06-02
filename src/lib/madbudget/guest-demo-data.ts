import { ActivityLevel, WeightGoal } from '@/lib/dietary-system'

/**
 * Dummy/demo data til Madbudget når brugeren ikke er logget ind.
 * Bruges udelukkende på klientsiden til at illustrere konceptet —
 * INTET af det her gemmes i databasen.
 *
 * Mængder er angivet for en "standard"-familie (BASE_PE = 3.5) og skaleres
 * til den valgte familie:
 *  - Voksen          = 1.0
 *  - Barn 0–9 år     = 0.5
 *  - Barn 10+ år     = 1.0
 */

export type DemoBasisvare = {
  id: number
  ingredient_name: string
  /** Mængde pr. uge for BASE_PE — skaleres til familien i UI. */
  quantity: number
  unit: string
  notes?: string
  /** Hvis brugeren vælger et specifikt produkt (mærke), vises dette */
  product?: string
  created_at: string
}

export type DemoShoppingListItem = {
  name: string
  /** Pr. PE — skaleres med familiestørrelse. */
  amount: number
  unit: string
  ingredientId?: number
  isBasis?: boolean
  notes?: string
}

export type DemoShoppingListCategory = {
  name: string
  items: DemoShoppingListItem[]
}

export type DemoShoppingList = {
  categories: DemoShoppingListCategory[]
}

/**
 * Keto demo-madplan fra FF-kataloget (man–søn).
 * Morgenmad: spinat-omelet ×3, græsk yoghurt ×2, æggelatte, æggetoast.
 * Frokost: simple salater med kød/fisk. Aftensmad: udvalgte keto hovedretter.
 */
export const GUEST_DEMO_BREAKFAST_SLUGS: string[] = [
  'nem-spinat-omelet-med-hytteost',
  'nem-spinat-omelet-med-hytteost',
  'nem-spinat-omelet-med-hytteost',
  'graesk-yoghurt-10-med-baer-kerner-og-moerk-chokolade',
  'graesk-yoghurt-10-med-baer-kerner-og-moerk-chokolade',
  'aeggelatte',
  'aeggetoast',
]

export const GUEST_DEMO_LUNCH_SLUGS: string[] = [
  'groen-frokostsalat-med-kylling-og-asparges',
  'groen-frokostsalat-med-kylling-og-asparges',
  'hurtig-keto-broccolisalat-med-cherrytomater-og-bacon',
  'groen-frokostsalat-med-kylling-og-asparges',
  'fransk-frokostsalat-med-tun-og-avocado',
  'groen-frokostsalat-med-kylling-og-asparges',
  'hurtig-keto-broccolisalat-med-cherrytomater-og-bacon',
]

/** Aftensmad man–søn. */
export const GUEST_DEMO_DINNER_SLUGS: string[] = [
  'kyllingeburger-af-oopsies',
  'mexikansk-okseret-med-lynstegte-blomkaalsris',
  'hurtig-og-laekker-tacosalat-med-hakket-oksekoed',
  'frikadeller-med-frisk-kernesalat',
  'sproed-keto-pizza-bedre-end-fathead',
  'perfekte-spareribs-med-simpel-coleslaw',
  'thaisuppe-med-kokosmaelk-og-kylling',
]

/** @deprecated Brug GUEST_DEMO_DINNER_SLUGS — beholdt for bagudkompatibilitet. */
export const GUEST_DEMO_RECIPE_SLUGS = GUEST_DEMO_DINNER_SLUGS

/** Alle unikke slugs der hentes via /api/recipes/[slug] ved guest-load. */
export const GUEST_DEMO_ALL_RECIPE_SLUGS = [
  ...new Set([
    ...GUEST_DEMO_BREAKFAST_SLUGS,
    ...GUEST_DEMO_LUNCH_SLUGS,
    ...GUEST_DEMO_DINNER_SLUGS,
  ]),
]

/** Fallback-titler og billeder hvis recipe-API'et fejler — så grid'et ikke står tomt. */
export const GUEST_DEMO_RECIPE_FALLBACKS: Record<
  string,
  { title: string; image?: string }
> = {
  'nem-spinat-omelet-med-hytteost': {
    title: 'Nem spinat omelet med hytteost',
    image:
      'https://najaxycfjgultwdwffhv.supabase.co/storage/v1/object/public/recipe-images/nem-spinat-omelet-med-hytteost-44674963.webp',
  },
  'graesk-yoghurt-10-med-baer-kerner-og-moerk-chokolade': {
    title: 'Græsk yoghurt 10% med bær, kerner og mørk chokolade',
    image:
      'https://najaxycfjgultwdwffhv.supabase.co/storage/v1/object/public/recipe-images/graesk-yoghurt-10-med-baer-kerner-og-moerk-chokolade-a06f697a.webp',
  },
  'aeggelatte': {
    title: 'Æggelatte',
    image:
      'https://najaxycfjgultwdwffhv.supabase.co/storage/v1/object/public/recipe-images/aeggelatte-579136af.webp',
  },
  'aeggetoast': {
    title: 'Æggetoast',
    image:
      'https://najaxycfjgultwdwffhv.supabase.co/storage/v1/object/public/recipe-images/aeggetoast-8e1107b1.webp',
  },
  'groen-frokostsalat-med-kylling-og-asparges': {
    title: 'Grøn frokostsalat med kylling og asparges',
    image:
      'https://najaxycfjgultwdwffhv.supabase.co/storage/v1/object/public/recipe-images/groen-frokostsalat-med-kylling-og-asparges-789fdd4b.webp',
  },
  'hurtig-keto-broccolisalat-med-cherrytomater-og-bacon': {
    title: 'Hurtig Keto broccolisalat med cherrytomater og bacon',
    image:
      'https://najaxycfjgultwdwffhv.supabase.co/storage/v1/object/public/recipe-images/hurtig-keto-broccolisalat-med-cherrytomater-og-bacon-06c66505.webp',
  },
  'fransk-frokostsalat-med-tun-og-avocado': {
    title: 'Fransk frokostsalat med tun og avocado',
    image:
      'https://najaxycfjgultwdwffhv.supabase.co/storage/v1/object/public/recipe-images/fransk-frokostsalat-med-tun-og-avocado-64ccf88e.webp',
  },
  'kyllingeburger-af-oopsies': {
    title: 'Kyllingeburger af oopsies',
    image:
      'https://najaxycfjgultwdwffhv.supabase.co/storage/v1/object/public/recipe-images/kyllingeburger-af-oopsies-4d2a7ccd.webp',
  },
  'mexikansk-okseret-med-lynstegte-blomkaalsris': {
    title: 'Mexikansk okseret med lynstegte blomkålsris',
    image:
      'https://najaxycfjgultwdwffhv.supabase.co/storage/v1/object/public/recipe-images/mexikansk-okseret-med-lynstegte-blomkaalsris-3e0aece1.webp',
  },
  'hurtig-og-laekker-tacosalat-med-hakket-oksekoed': {
    title: 'Hurtig og lækker tacosalat med hakket oksekød',
    image:
      'https://najaxycfjgultwdwffhv.supabase.co/storage/v1/object/public/recipe-images/hurtig-og-laekker-tacosalat-med-hakket-oksekoed-6505726f.webp',
  },
  'frikadeller-med-frisk-kernesalat': {
    title: 'Frikadeller med frisk kernesalat',
    image:
      'https://najaxycfjgultwdwffhv.supabase.co/storage/v1/object/public/recipe-images/frikadeller-med-frisk-kernesalat-d4d58dd3.webp',
  },
  'sproed-keto-pizza-bedre-end-fathead': {
    title: 'Sprød Keto pizza: Bedre end fathead',
    image:
      'https://najaxycfjgultwdwffhv.supabase.co/storage/v1/object/public/recipe-images/sproed-keto-pizza-bedre-end-fathead-d16b840a.webp',
  },
  'perfekte-spareribs-med-simpel-coleslaw': {
    title: 'Perfekte spareribs med simpel coleslaw',
    image:
      'https://najaxycfjgultwdwffhv.supabase.co/storage/v1/object/public/recipe-images/perfekte-spareribs-med-simpel-coleslaw-5d0b162f.webp',
  },
  'thaisuppe-med-kokosmaelk-og-kylling': {
    title: 'Thaisuppe med kokosmælk og kylling',
    image:
      'https://najaxycfjgultwdwffhv.supabase.co/storage/v1/object/public/recipe-images/thaisuppe-med-kokosmaelk-og-kylling-fbedfdb6.webp',
  },
}

/** Ugedagsforkortelser til hero-preview på forsiden (man–fre). */
export const GUEST_DEMO_WEEKDAY_SHORT = ['man', 'tir', 'ons', 'tor', 'fre'] as const

/** Mandag–fredag demo-aftensmad til forsiden — keto-opskrifter fra guest-demo. */
export const GUEST_DEMO_HOMEPAGE_MEALS = GUEST_DEMO_WEEKDAY_SHORT.map((day, i) => {
  const slug = GUEST_DEMO_DINNER_SLUGS[i]
  const fb = GUEST_DEMO_RECIPE_FALLBACKS[slug]
  const kcal = [520, 485, 445, 510, 490][i]
  const priceKr = [19, 17, 19, 17, 18][i]
  return {
    day,
    slug,
    name: fb?.title ?? slug,
    image: fb?.image ?? '',
    kcal,
    priceKr,
    price: `${priceKr} kr/pers`,
    tilbud: i === 1 || i === 3 || i === 4,
  }
})

/** Gennemsnit pr. portion — afledt af retterne ovenfor (≈18 kr). */
export const GUEST_DEMO_HOMEPAGE_PRICE_PER_PORTION = Math.round(
  GUEST_DEMO_HOMEPAGE_MEALS.reduce((sum, m) => sum + m.priceKr, 0) / GUEST_DEMO_HOMEPAGE_MEALS.length
)

/** Samlet indkøb for demo-ugeplanen (5 aftensmåltider til 4 personer). */
export const GUEST_DEMO_HOMEPAGE_TOTAL_KR = 498

/** Besparelse vs. fuldpris for demo-ugeplanen. */
export const GUEST_DEMO_HOMEPAGE_SAVINGS_KR = 335

/**
 * En typisk dansk familie: 2 voksne + 2 børn (et lille + et stort).
 * = 1.0 + 1.0 + 0.5 + 1.0 = 3.5 PE
 */
export const GUEST_DEMO_BASE_PE = 3.5

export {
  ageBandToPersonEquivalent,
  computeChildPersonEquivalent,
  computeFamilyPersonEquivalent,
} from './person-equivalent'

/** Skaler et tal til familie-PE, og rund pænt af. */
export function scaleAmount(baseAmountPerBase: number, targetPe: number): number {
  if (!Number.isFinite(baseAmountPerBase) || baseAmountPerBase <= 0) return 0
  const factor = targetPe / GUEST_DEMO_BASE_PE
  const scaled = baseAmountPerBase * factor
  const rounded = Math.round(scaled * 10) / 10
  return rounded
}

// ---------------------------------------------------------------------------
// Basisvarer — angivet for BASE_PE = 3.5
// ---------------------------------------------------------------------------
const BASE_TS = '2026-01-01T08:00:00.000Z'

export const GUEST_DEMO_BASISVARER: DemoBasisvare[] = [
  { id: 90001, ingredient_name: 'Mælk',                quantity: 3,   unit: 'L',   created_at: BASE_TS },
  { id: 90002, ingredient_name: 'Vaniljeskyr',         quantity: 1,   unit: 'kg',  product: 'Cheasy Vanilje Skyr', notes: 'Produkt: Cheasy Vanilje Skyr', created_at: BASE_TS },
  { id: 90003, ingredient_name: 'Æg',                  quantity: 20,  unit: 'stk', created_at: BASE_TS },
  { id: 90004, ingredient_name: 'Rugbrød',             quantity: 1,   unit: 'stk', created_at: BASE_TS },
  { id: 90005, ingredient_name: 'Boller',              quantity: 6,   unit: 'stk', created_at: BASE_TS },
  { id: 90006, ingredient_name: 'Leverpostej',         quantity: 1,   unit: 'pk',  created_at: BASE_TS },
  { id: 90007, ingredient_name: 'Agurk',               quantity: 3,   unit: 'stk', created_at: BASE_TS },
  { id: 90008, ingredient_name: 'Tomater',             quantity: 500, unit: 'g',   created_at: BASE_TS },
  { id: 90009, ingredient_name: 'Gulerødder',          quantity: 1,   unit: 'kg',  created_at: BASE_TS },
  { id: 90010, ingredient_name: 'Frugt til madpakken', quantity: 8,   unit: 'stk', notes: 'Blandet (æbler, pærer, bananer)', created_at: BASE_TS },
  { id: 90011, ingredient_name: 'Ostehapser',          quantity: 1,   unit: 'pk',  created_at: BASE_TS },
  { id: 90012, ingredient_name: 'Figenstænger',        quantity: 1,   unit: 'pk',  created_at: BASE_TS },
  { id: 90013, ingredient_name: 'Drikkeyoghurt',       quantity: 4,   unit: 'stk', created_at: BASE_TS },
]

// ---------------------------------------------------------------------------
// Indkøbsliste (pr. PE — skaleres i UI). Dækker ingredienserne fra de 6 retter.
// ---------------------------------------------------------------------------
/**
 * Kategorinavnene matcher det rigtige generator-output (`generator.ts`
 * `categoryOrder`: Protein, Grøntsager, Frugt, Mejeri, Kolonial & Diverse).
 * Det er VIGTIGT at de er ens — ellers kan madpakke-rækkerne ikke flettes ind
 * i de eksisterende kategorier og ender i stedet som deres egne grupper.
 */
export const GUEST_DEMO_SHOPPING_LIST: DemoShoppingList = {
  categories: [
    {
      name: 'Protein',
      items: [
        { name: 'Kyllingefilet',         amount: 0.45, unit: 'kg' },
        { name: 'Hakket oksekød',        amount: 0.14, unit: 'kg' },
        { name: 'Panerede fiskefileter', amount: 2.3,  unit: 'stk' },
        { name: 'Bacon',                 amount: 0.3,  unit: 'pk' },
      ],
    },
    {
      name: 'Grøntsager',
      items: [
        { name: 'Squash',        amount: 0.6, unit: 'stk' },
        { name: 'Peberfrugt',    amount: 0.6, unit: 'stk' },
        { name: 'Cherrytomater', amount: 70,  unit: 'g'   },
        { name: 'Tomat',         amount: 0.6, unit: 'stk' },
        { name: 'Rødløg',        amount: 0.3, unit: 'stk' },
        { name: 'Løg',           amount: 0.3, unit: 'stk' },
        { name: 'Hvidløg',       amount: 1.4, unit: 'fed' },
        { name: 'Gulerødder',    amount: 0.6, unit: 'stk' },
        { name: 'Forårsløg',     amount: 0.3, unit: 'bdt' },
        { name: 'Persille',      amount: 0.3, unit: 'bdt' },
        { name: 'Basilikum',     amount: 0.3, unit: 'pot' },
        { name: 'Citron',        amount: 0.3, unit: 'stk' },
        { name: 'Salatblade',    amount: 0.6, unit: 'ps'  },
      ],
    },
    {
      name: 'Frugt',
      items: [
        { name: 'Æbler',   amount: 1.7, unit: 'stk' },
        { name: 'Bananer', amount: 1.4, unit: 'stk' },
      ],
    },
    {
      name: 'Mejeri',
      items: [
        { name: 'Revet mozzarella', amount: 110, unit: 'g'      },
        { name: 'Mozzarella',       amount: 55,  unit: 'g'      },
        { name: 'Cheddar',          amount: 1.1, unit: 'skiver' },
        { name: 'Parmesan',         amount: 14,  unit: 'g'      },
        { name: 'Fløde',            amount: 70,  unit: 'ml'     },
        { name: 'Kokosmælk',        amount: 115, unit: 'ml'     },
        { name: 'Smør',             amount: 14,  unit: 'g'      },
      ],
    },
    {
      name: 'Kolonial & Diverse',
      items: [
        { name: 'Pasta (penne)',   amount: 115, unit: 'g'    },
        { name: 'Pasta (fusilli)', amount: 115, unit: 'g'    },
        { name: 'Basmati ris',     amount: 85,  unit: 'g'    },
        { name: 'Rasp',            amount: 45,  unit: 'g'    },
        { name: 'Karrypasta',      amount: 0.6, unit: 'spsk' },
        { name: 'Hakkede tomater', amount: 115, unit: 'g'    },
        { name: 'Tomatsauce',      amount: 60,  unit: 'g'    },
        { name: 'Hønsebouillon',   amount: 1.4, unit: 'dl'   },
        { name: 'Kebabkrydderi',   amount: 0.6, unit: 'tsk'  },
        { name: 'Krydderurter',    amount: 0.3, unit: 'tsk'  },
        { name: 'Sød chutney',     amount: 0.3, unit: 'glas' },
        { name: 'Remoulade',       amount: 0.3, unit: 'glas' },
        { name: 'Pizzadej',        amount: 1.1, unit: 'stk' },
        { name: 'Burgerboller',    amount: 1.1, unit: 'stk' },
        { name: 'Kartofler',       amount: 0.3, unit: 'kg'  },
        { name: 'Pommes frites',   amount: 230, unit: 'g'   },
      ],
    },
  ],
}

// ---------------------------------------------------------------------------
// "Fundet i butik" — dummy store prices for Netto/Rema/Bilka/Føtex.
// Hver vare har en realistisk total-pris pr. uge for familien (BASE_PE = 3.5),
// med små variationer pr. butik. Et par enkelte varer mangles bevidst i hver
// butik, så coverage-beregningen lander på 95–98 % i stedet for 100 %.
// ---------------------------------------------------------------------------
type DemoStoreProduct = {
  name: string
  price: number
  isOnSale: boolean
  totalPrice?: number
  totalNormalPrice?: number
  quantityNeeded?: number
}

const DEMO_STORE_KEYS = ['rema-1000', 'netto', 'føtex', 'bilka'] as const

/** Total-pris pr. vare for en standard-familie (3.5 PE) for ugens madplan. */
const WEEKLY_PRICE_BY_NAME: Record<string, number> = {
  'kyllingefilet': 79,
  'hakket oksekød': 45,
  'panerede fiskefileter': 35,
  'bacon': 24,
  'squash': 9,
  'peberfrugt': 12,
  'cherrytomater': 22,
  'tomat': 8,
  'rødløg': 4,
  'løg': 3,
  'hvidløg': 5,
  'gulerødder': 10,
  'forårsløg': 8,
  'persille': 6,
  'basilikum': 14,
  'citron': 4,
  'salatblade': 14,
  'æbler': 18,
  'bananer': 12,
  'revet mozzarella': 26,
  'mozzarella': 22,
  'cheddar': 14,
  'parmesan': 19,
  'fløde': 12,
  'kokosmælk': 14,
  'smør': 14,
  'pasta (penne)': 9,
  'pasta (fusilli)': 9,
  'basmati ris': 16,
  'rasp': 8,
  'karrypasta': 18,
  'hakkede tomater': 8,
  'tomatsauce': 11,
  'hønsebouillon': 8,
  'kebabkrydderi': 14,
  'krydderurter': 9,
  'sød chutney': 22,
  'remoulade': 15,
  'pizzadej': 18,
  'burgerboller': 14,
  'kartofler': 12,
  'pommes frites': 22,
}

/** Lille deterministisk pris-variation pr. butik så priserne ikke er ens. */
function storePriceVariation(seed: string, base: number) {
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0
  }
  // -10% til +10%
  const pct = (((hash % 21) - 10) / 100)
  return Math.max(2, Math.round(base * (1 + pct) * 100) / 100)
}

/**
 * Bygger storePrices-strukturen som page.tsx forventer:
 *   Record<storeKey, Record<itemName(lower), { name, price, isOnSale, ... }>>
 * Hver butik mangler bevidst 1 vare så coverage ikke lander på 100 %.
 */
export function buildGuestDemoStorePrices(
  shoppingList: DemoShoppingList,
  familyPe: number
): Record<string, Record<string, DemoStoreProduct>> {
  const peFactor = familyPe / GUEST_DEMO_BASE_PE
  const result: Record<string, Record<string, DemoStoreProduct>> = {}

  // Saml alle items i én flad liste — vi udelader bevidst ét item på tværs af
  // alle butikker så coverage lander på 39/40 ≈ 98 % i både "alle butikker"
  // og pr. butik-fanerne (i stedet for et urealistisk 100 %).
  const flatItems = shoppingList.categories.flatMap((c) => c.items)
  const missingIdx = Math.max(0, Math.floor(flatItems.length / 2)) // ca. midten

  DEMO_STORE_KEYS.forEach((storeKey) => {
    const map: Record<string, DemoStoreProduct> = {}

    flatItems.forEach((item, i) => {
      if (i === missingIdx) return
      const lowerName = item.name.toLowerCase().trim()
      const baseWeekly = WEEKLY_PRICE_BY_NAME[lowerName] ?? 14
      const scaled = baseWeekly * peFactor
      const total = storePriceVariation(`${storeKey}:${lowerName}`, scaled)
      const isOnSale =
        (lowerName.charCodeAt(0) + storeKey.charCodeAt(0)) % 5 === 0
      const totalNormalPrice = isOnSale
        ? Math.round(total * 1.25 * 100) / 100
        : undefined
      map[lowerName] = {
        name: item.name,
        price: total,
        isOnSale,
        totalPrice: total,
        totalNormalPrice,
      }
    })
    result[storeKey] = map
  })
  return result
}

/** FF-demo: mad-niche for hele planen (gæster trykker bare Næste). */
export const GUEST_DEMO_PLAN_DIETARY_APPROACH = 'keto'

/** Samme nicher som Familieindstillinger — til wizard-visning. */
export const GUEST_DEMO_DIETARY_OPTIONS = [
  { id: 'keto', name: 'Keto', desc: 'Højt fedt, moderat protein, meget lavt kulhydrat' },
  { id: 'sense', name: 'Sense', desc: 'Balanceret tilgang til sund mad og vægttab' },
  { id: 'glp-1', name: 'GLP-1', desc: 'Tilpasset til GLP-1 medicin' },
  { id: 'anti-inflammatory', name: 'Anti-inflammatorisk', desc: 'Fokuserer på anti-inflammatoriske fødevarer' },
  { id: 'flexitarian', name: 'Fleksitarisk', desc: 'Primært plantebaseret med lejlighedsvis kød' },
  { id: '5-2', name: '5:2 diæt', desc: '5 dage normal spisning, 2 dage med meget lavt kalorieindtag' },
  { id: 'proteinrig-kost', name: 'Proteinrig kost', desc: 'Proteinrige opskrifter til optimal næring' },
  { id: 'familiemad', name: 'Kalorietælling', desc: 'Almindelig familiemad med planlagte kalorier' },
] as const

/** Default-familieprofil til guest-mode (kan ændres via wizard). */
export const GUEST_DEMO_DEFAULT_FAMILY = {
  adults: 2,
  children: 2,
  childrenAges: ['4-8', '8+'] as string[],
  selectedStores: [1, 2, 3, 4], // Rema 1000, Netto, Føtex, Bilka
}

/** Måltider demo-planen dækker (vægttab — ikke kun aftensmad). */
export const GUEST_DEMO_MEALS_PER_DAY = ['breakfast', 'lunch', 'dinner'] as const

const GUEST_DEMO_CATEGORY_BY_MEAL = {
  breakfast: 'Morgenmad',
  lunch: 'Frokost',
  dinner: 'Aftensmad',
} as const

/** Placeholder-måltid fra slug + fallback (før API-svar). */
export function guestDemoMealFromSlug(
  slug: string,
  mealType: 'breakfast' | 'lunch' | 'dinner'
) {
  const fb = GUEST_DEMO_RECIPE_FALLBACKS[slug]
  const image = fb?.image || ''
  return {
    id: slug,
    slug,
    title: fb?.title || slug,
    image,
    imageUrl: image,
    store: 'Tilbud · Keto',
    ingredients: [],
    servings: mealType === 'breakfast' ? 2 : 4,
    prepTime: '20 min',
    category: GUEST_DEMO_CATEGORY_BY_MEAL[mealType],
    dietaryTags: ['Keto', 'Vægttab'],
    mealType,
  }
}

/** Fuldt måltid fra /api/recipes/[slug]-svar. */
export function guestDemoMealFromRecipe(
  recipe: Record<string, unknown>,
  slug: string,
  mealType: 'breakfast' | 'lunch' | 'dinner'
) {
  const fb = GUEST_DEMO_RECIPE_FALLBACKS[slug]
  const image =
    (recipe.image as string) ||
    (recipe.imageUrl as string) ||
    (recipe.image_url as string) ||
    fb?.image ||
    ''
  const nutritionalInfo = recipe.nutritionalInfo as
    | { calories?: number; protein?: number; carbs?: number; fat?: number; fiber?: number }
    | undefined
  const totalTime = recipe.totalTime as number | undefined
  return {
    id: (recipe.id as string) || slug,
    slug: (recipe.slug as string) || slug,
    title: (recipe.title as string) || fb?.title || slug,
    image,
    imageUrl: image,
    store: 'Tilbud · Keto',
    ingredients: Array.isArray(recipe.ingredients) ? recipe.ingredients : [],
    servings: (recipe.servings as number) ?? (mealType === 'breakfast' ? 2 : 4),
    prepTime: totalTime ? `${totalTime} min` : '20 min',
    category:
      (recipe.mainCategory as string) ||
      (Array.isArray(recipe.categories) ? (recipe.categories as string[])[0] : undefined) ||
      GUEST_DEMO_CATEGORY_BY_MEAL[mealType],
    dietaryTags:
      (recipe.dietaryCategories as string[]) ||
      (recipe.dietaryApproaches as string[]) ||
      ['Keto', 'Vægttab'],
    mealType,
    calories:
      (recipe.calories as number) ?? nutritionalInfo?.calories,
    protein: (recipe.protein as number) ?? nutritionalInfo?.protein,
    carbs: (recipe.carbs as number) ?? nutritionalInfo?.carbs,
    fat: (recipe.fat as number) ?? nutritionalInfo?.fat,
    fiber: (recipe.fiber as number) ?? nutritionalInfo?.fiber,
    vitamins: recipe.vitamins,
    minerals: recipe.minerals,
  }
}

/** Demo vægttabsprofiler så ernæringsboksen kan vises for gæster. */
export const GUEST_DEMO_ADULT_PROFILES = [
  {
    id: 'guest-adult-1',
    gender: 'female' as const,
    age: 38,
    height: 168,
    weight: 82,
    activityLevel: ActivityLevel.ModeratelyActive,
    dietaryApproach: GUEST_DEMO_PLAN_DIETARY_APPROACH,
    mealsPerDay: [...GUEST_DEMO_MEALS_PER_DAY],
    weightGoal: WeightGoal.WeightLoss,
    isComplete: true,
  },
  {
    id: 'guest-adult-2',
    gender: 'male' as const,
    age: 40,
    height: 182,
    weight: 92,
    activityLevel: ActivityLevel.ModeratelyActive,
    dietaryApproach: GUEST_DEMO_PLAN_DIETARY_APPROACH,
    mealsPerDay: [...GUEST_DEMO_MEALS_PER_DAY],
    weightGoal: WeightGoal.WeightLoss,
    isComplete: true,
  },
]

export type GuestMealPlanInsights = { intro: string; bullets: string[] }

/** Tekst til "Om din madplan" — matcher demo-slugs, ikke fuzzy titel-match. */
export function buildGuestMealPlanInsights(weekAvg: {
  calories: number
  protein: number
  fiber?: number
}): GuestMealPlanInsights {
  const countIf = (slugs: string[], test: (slug: string) => boolean) =>
    slugs.filter(test).length

  const frokostKylling = countIf(GUEST_DEMO_LUNCH_SLUGS, (s) => s.includes('kylling'))
  const aftensKylling = countIf(GUEST_DEMO_DINNER_SLUGS, (s) => s.includes('kylling'))
  const okseKoedAftensmad = countIf(
    GUEST_DEMO_DINNER_SLUGS,
    (s) =>
      (s.includes('okse') || s.includes('frikadelle') || s.includes('sparerib')) &&
      !s.includes('kylling')
  )
  const salatFrokost = countIf(GUEST_DEMO_LUNCH_SLUGS, (s) => s.includes('salat'))

  const intro =
    'I er 2 voksne og 2 børn med Keto og fokus på vægttab. Planen har morgenmad, frokost og aftensmad alle ugens dage.'

  const bullets: string[] = [
    'Keto-opskrifter med gentagne, nemme morgenmadsvalg (spinat-omelet 3 dage, græsk yoghurt 2 dage)',
    'Frokost: salater med kylling, tun eller bacon — hurtige og mættende',
    `${frokostKylling} frokostsalater med kylling og ${aftensKylling} aftensmad med kylling; ${okseKoedAftensmad} aftensretter med okse eller svinekød`,
    'Varieret aftensmad: oopsie-burger, taco-salat, frikadeller, keto-pizza, spareribs og thaisuppe',
  ]

  if (salatFrokost >= 3) {
    bullets.push('Grøntsagsrige salater til frokost de fleste dage')
  }

  if (weekAvg.protein >= 60) {
    bullets.push(`God proteinbalance (ca. ${Math.round(weekAvg.protein)} g om dagen pr. voksen)`)
  }
  if (weekAvg.calories > 0 && weekAvg.calories < 2500) {
    bullets.push(
      `Kalorier fra planens opskrifter (ca. ${Math.round(weekAvg.calories)} kcal/dag pr. voksen) — tilpasset vægttab`
    )
  }

  bullets.push('Retter der kan laves til hele familien — voksne følger Keto-planen')

  return { intro, bullets }
}
