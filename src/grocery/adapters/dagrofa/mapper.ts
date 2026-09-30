import type { ProductInsert, ProductOfferInsert } from '../../types'
import { copenhagenMidnightIso } from '../lidl/mapper'
import type {
  DagrofaAvis,
  DagrofaAvisItem,
  DagrofaEnrichmentProduct,
  DagrofaNativeCategory,
  DagrofaPageNote,
} from './types'

/** Holder avis-varer adskilt fra de eksisterende Goma-rækker for kæden. */
export const DAGROFA_AVIS_SOURCE_ID_PREFIX = 'avis-'

function parseDanishNumber(raw: string): number | null {
  const s = raw.includes(',') ? raw.replace(/\./g, '').replace(',', '.') : raw
  const n = Number.parseFloat(s)
  return Number.isFinite(n) ? n : null
}

const formatKr = (cents: number) => `${(cents / 100).toFixed(2).replace('.', ',')} kr`

const normalize = (s: string) => s.replace(/\s+/g, ' ').trim()

/** "Innocent Æblejuice (Innocent Juice, Shot eller Smoothie)" → "Innocent Æblejuice". */
export function dagrofaProductName(product: Pick<DagrofaEnrichmentProduct, 'name' | 'alttext'>): string {
  let name = normalize(product.name).replace(/^\*+/, '')
  const group = normalize(product.alttext ?? '')
  if (group && name.endsWith(`(${group})`)) name = name.slice(0, -group.length - 2).trim()
  return name || normalize(product.name)
}

const DESC_UNIT: Record<string, string> = {
  g: 'g',
  kg: 'kg',
  ml: 'ml',
  cl: 'cl',
  dl: 'dl',
  l: 'L',
  ltr: 'L',
  stk: 'stk',
}

export interface DagrofaUnitPrice {
  cents: number
  unit: 'kg' | 'L' | 'stk'
  /** "v/2 bægere" — prisen gælder for flere stk. */
  multibuyQty: number | null
}

export interface DagrofaDesc {
  amount: number | null
  unit: string | null
  unitPrice: DagrofaUnitPrice | null
  unitPriceText: string | null
}

const DESC_RE =
  /\.\s+(?:ca\.\s*)?(\d+(?:[.,]\d+)?)(?:\s*-\s*\d+(?:[.,]\d+)?)?\s*(g|kg|ml|cl|dl|l|ltr|stk)\.?\s*(?:\(([^)]*)\))?\s*$/i
const UNIT_PRICE_RE =
  /(?:max\.?\s*)?(kg|liter|stk)\.?\s*pris\s*(?:v\/(\d+)\s*[a-zæøå]+\.?\s*)?(\d[\d.]*,\d{2})/i

/** "Merrild 400 G. 400 g (Max. kg pris 299,75)" → 400 g · 299,75 kr/kg. */
export function parseDagrofaDesc(desc: string | null | undefined): DagrofaDesc {
  const m = normalize(desc ?? '').match(DESC_RE)
  if (!m) return { amount: null, unit: null, unitPrice: null, unitPriceText: null }
  const unitPriceText = m[3]?.trim() || null
  let unitPrice: DagrofaUnitPrice | null = null
  const up = unitPriceText?.match(UNIT_PRICE_RE)
  if (up) {
    const value = parseDanishNumber(up[3])
    const unit = up[1].toLowerCase() === 'liter' ? 'L' : (up[1].toLowerCase() as 'kg' | 'stk')
    const qty = up[2] ? Number(up[2]) : null
    if (value != null) {
      unitPrice = { cents: Math.round(value * 100), unit, multibuyQty: qty && qty > 1 ? qty : null }
    }
  }
  return {
    amount: parseDanishNumber(m[1]),
    unit: DESC_UNIT[m[2].toLowerCase()] ?? null,
    unitPrice,
    unitPriceText,
  }
}

/**
 * Kun rigtige GS1-numre som gtin. 20–29-prefix er butikkens egne numre
 * (vejevarer) og må ikke matche andre kæders varer.
 */
export function validDagrofaGtin(raw: string): string | null {
  const digits = raw.trim()
  if (!/^\d+$/.test(digits) || ![8, 12, 13, 14].includes(digits.length)) return null
  if (digits.length === 13 && digits.startsWith('2')) return null
  const body = digits.slice(0, -1)
  let sum = 0
  for (let i = 0; i < body.length; i++) {
    const d = Number(body[body.length - 1 - i])
    sum += i % 2 === 0 ? d * 3 : d
  }
  return (10 - (sum % 10)) % 10 === Number(digits.at(-1)) ? digits : null
}

// ── Madvare-filter ─────────────────────────────────────────────────────────

/** Hele ord — `\b` kender ikke æ/ø/å. */
function wordsRe(words: string[]): RegExp {
  return new RegExp(String.raw`(?<![\p{L}\d])(?:${words.join('|')})(?![\p{L}\d])`, 'iu')
}

const ALCOHOL_RE = wordsRe([
  'vin', 'rødvin', 'hvidvin', 'rosévin', 'rosevin', 'prosecco', 'cava', 'champagne', 'crémant',
  'portvin', 'chardonnay', 'chard', 'sauvignon', 'sauv', 'riesling', 'pinot', 'shiraz', 'syrah',
  'cabernet', 'cab', 'merlot', 'malbec', 'tempranillo', 'rioja', 'crianza', 'ripasso', 'amarone',
  'appassimento', 'barbera', 'nebbiolo', 'montalcino', 'brunello', 'primitivo', 'chianti',
  String.raw`c[oô]tes?\s+du`, String.raw`rh[oô]ne`, String.raw`gr[uü]ner`, 'vermentino',
  'vermintino', 'cannonau', 'bordeaux', 'bourgogne', 'zinfandel', 'moscato', 'lambrusco', 'sherry',
  'øl', 'pilsner', 'lager', 'ipa', 'stout', 'porter', 'tuborg', 'carlsberg', 'heineken', 'cider',
  'somersby', 'whisky', 'whiskey', 'vodka', 'gin', 'rum', 'cognac', 'tequila', 'snaps', 'akvavit',
  'likør', 'jägermeister', 'jagermeister', 'campari', 'aperol', 'baileys', 'tanqueray', 'bacardi',
  'smirnoff', 'calvados', 'brandy', 'limoncello',
])
const SOFT_DRINK_RE =
  /juice|saft|most(?![\p{L}])|lemonade|limonade|sodavand|brus|smoothie|vand(?![\p{L}])|kondi|cola|pepsi|fanta|sprite|iste|ice tea|drik|shot|kombucha|mælk|olie|eddike|sirup|sauce/iu
/** 75 cl / 3 l uden sodavandsord er vin (flaske/bag-in-box). */
const WINE_VOLUMES_CL = new Set([37.5, 75, 300])

export function isDagrofaAlcohol(product: Pick<DagrofaEnrichmentProduct, 'name' | 'alttext' | 'desc'>): boolean {
  const name = product.name
  const group = product.alttext ?? ''
  const text = `${name} ${group}`
  // "Coca Cola 24-Pak" i gruppen "Coca-Cola, Fanta eller Carlsberg" er ikke øl.
  if (SOFT_DRINK_RE.test(name)) return false
  const { amount, unit } = parseDagrofaDesc(product.desc)
  // "A.B. Marcipanbrød Baileys. 150 g" — drikke sælges ikke i gram.
  if (unit === 'g' || unit === 'kg') return false
  if (ALCOHOL_RE.test(name)) return true
  if (ALCOHOL_RE.test(group) && !SOFT_DRINK_RE.test(group)) return true
  const volumeCl = unit === 'cl' ? amount : unit === 'L' && amount != null ? amount * 100 : null
  if (volumeCl == null || SOFT_DRINK_RE.test(text)) return false
  // "Tuborg Classic 4,6%" · "Light House 0,5%" — procent på en drik er alkohol.
  if (/\d+(?:[.,]\d+)?\s*%/.test(product.name)) return true
  return WINE_VOLUMES_CL.has(volumeCl)
}

const NON_FOOD_NAME_RE = wordsRe([
  'kronelys', 'fyrfadslys', 'fyrfadlys', 'lampelys', 'bloklys', 'stearinlys', 'stearin',
  'servietter', 'ajax', 'klorin', 'dun-let', 'vaskemiddel', 'vask', 'opvask', 'opvasketabs', 'tabs',
  'sæbe', 'håndsæbe', 'shampoo', 'balsam', 'shower', 'showergel', 'deo', 'deodorant', 'roll-on',
  'tandbørste', 'tandpasta', 'colgate', 'palmolive', 'sanex', 'always', 'tampax', 'bind', 'liner',
  'libero', 'pampers', 'bleer', 'ble', 'kattemad', 'hundemad', 'kattegrus', 'whiskas', 'sheba',
  'cesar', 'perfect fit', 'pedigree', 'wipes', 'vådservietter', 'toiletpapir', 'køkkenrulle',
  'batterier', 'hårkur', 'hårpleje', 'styling', 'plaster', 'affaldsposer',
  'fryseposer', 'frysepose', 'frysebøtter', 'fixa', 'toppits', 'alufolie', 'bagepapir',
  'husholdningsfilm', 'madpapir',
])

const NON_FOOD_DEPARTMENTS = new Set([
  'Personlig pleje',
  'Pleje',
  'Husholdning',
  'Husholdning & rengøring',
  'Dyremad',
  'Dyr',
  'Non-food',
  'Babypleje',
  'Bolig & køkken',
  'Tobak',
  'Kosttilskud',
])
const ALCOHOL_CATEGORY_RE = wordsRe(['spiritus', 'spiritus & likør', 'likør', 'vin', 'øl', 'cider'])

type NativeVerdict = { food: boolean; alcohol: boolean }

function nativeVerdict(native: DagrofaNativeCategory): NativeVerdict | null {
  const lvl0 = native.lvl0?.trim() ?? ''
  const lvl1 = native.lvl1?.trim() ?? ''
  if (!lvl0) return null
  if (ALCOHOL_CATEGORY_RE.test(lvl1)) return { food: false, alcohol: true }
  if (NON_FOOD_DEPARTMENTS.has(lvl0)) return { food: false, alcohol: false }
  if (/^baby/i.test(lvl0)) return /mad/i.test(lvl1) ? { food: true, alcohol: false } : { food: false, alcohol: false }
  return { food: true, alcohol: false }
}

/** Afdeling for varer uden katalog-match (kædens egne mærker, slagter, vejevarer). */
const DEPARTMENT_GUESSES: Array<[string, RegExp]> = [
  ['Nemt & hurtigt', /wrap|sandwich|smørrebrød|middagsret|nemme retter|weekendmenu|tærte|frikadeller|kødboller|karbonade|butterchicken|tikka|pad thai|asia box|panderet|boller i\b/i],
  ['Slik og snacks', /chips|flødeboller|marcipan|lakrids|vingummi|chokolade(?!kage)|\bbarre\b/i],
  ['Brød', /brød|boller|baguette|ciabatta|pavé|croissant|tebirkes|kanelsnurre|pizzabund|rundstykke/i],
  ['Mejeri & køl', /\bost\b|skæreost|flammeost|jagtost|grana padano|parmesan|yogh|skyr|mælk|smør\b|fløde(?!stuvet)|risifrutti|hytteost/i],
  ['Drikkevarer', /juice|most\b|kondi|pepsi|cola|fanta|capri|lemonade|limonade|sodavand|brus\b|saft\b|smoothie|shots?\b/i],
  ['Kolonial', /ketchup|remoulade|dressing|mayonnaise|pasta|fusilli|penne|spaghetti|tagliat|olivenolie|olie\b|eddike|krydderi|paprika|masala|karry|müsli|grød|sauce|\bris\b|sukker|kaffe|\bte\b/i],
  ['Kød & fisk', /gris|svin|okse|kalv|kvie|kylling|kyll\b|kyll\.|\band\b|\blam\b|bøf|steg|kotelet|entrecote|culotte|gullasch|fars\b|skink|jambon|bacon|salami|salame|mortadella|bresaola|serrano|charcuteri|laks|rejer|fisk|torsk|hotwings|filet|mørbrad|medister|pølse|flæsk|nakke/i],
  ['Frugt & grønt', /æble|pære|kål|tomat|porre|selleri|kartofl|avocado|græskar|hokkaido|gulerød|løg|spinat|ærter|bønner|broccoli|blomkål|karotte|haric|grøntsag|citron|banan/i],
]

export function guessDagrofaDepartment(name: string, group: string | null): string | null {
  for (const text of [name, group ?? '']) {
    if (!text) continue
    for (const [department, re] of DEPARTMENT_GUESSES) if (re.test(text)) return department
  }
  return null
}

// ── Medlemspris / mængdebegrænsning fra avisens tekst ──────────────────────

const PRICE_TOKEN = String.raw`(\d+)(?:[.,]-|\s(\d{2})\b)`
const REGULAR_PRICE_RE = new RegExp(String.raw`PR\.\s*[A-ZÆØÅ]+\.?\s*(?:\+\s*pant\s*)?${PRICE_TOKEN}`)
const MEMBER_PRICE_RE = new RegExp(String.raw`MEDLEMSPRIS\*?\s*PR\.\s*[A-ZÆØÅ]+\.?\s*${PRICE_TOKEN}`)
const LIMIT_RE = /Max\.\s*(\d+)\s*([a-zæøå]+)\.?\s*pr\.\s*kunde(\s*pr\.\s*dag)?/i
const NOTE_WINDOW = 400

const tokenCents = (kr: string, ore?: string) => Number(kr) * 100 + (ore ? Number(ore) : 0)

export interface DagrofaGroupNote extends DagrofaPageNote {
  regularPriceCents: number | null
}

/**
 * Avisens tekst for hver gruppe ("KAROLINES KØKKEN SAUCE … PR. STK. 16.-
 * MEDLEMSPRIS* PR. STK. 12.- … Max. 4 Stk. pr. kunde"). Teksten stopper ved
 * næste gruppes navn, så priser ikke smitter over på nabovaren.
 */
export function parseDagrofaGroupNotes(pageTexts: string[], groups: string[]): Map<string, DagrofaGroupNote> {
  const text = normalize(pageTexts.join(' '))
  const upper = text.toUpperCase()
  const names = [...new Set(groups.map((g) => normalize(g)).filter((g) => g.length >= 4))]
  const positions: Array<{ group: string; at: number; end: number }> = []
  for (const group of names) {
    const needle = group.toUpperCase()
    for (let at = upper.indexOf(needle); at >= 0; at = upper.indexOf(needle, at + 1)) {
      positions.push({ group, at, end: at + needle.length })
    }
  }
  positions.sort((a, b) => a.at - b.at)

  const notes = new Map<string, DagrofaGroupNote>()
  for (const pos of positions) {
    if (notes.has(pos.group)) continue
    const next = positions.find((p) => p.group !== pos.group && p.at >= pos.end)
    const segment = text.slice(pos.end, Math.min(next?.at ?? Infinity, pos.end + NOTE_WINDOW))
    const regular = segment.match(REGULAR_PRICE_RE)
    const member = segment.match(MEMBER_PRICE_RE)
    const limit = segment.match(LIMIT_RE)
    if (!regular && !member && !limit) continue
    notes.set(pos.group, {
      regularPriceCents: regular ? tokenCents(regular[1], regular[2]) : null,
      memberPriceCents: member ? tokenCents(member[1], member[2]) : null,
      limitText: limit
        ? `Max. ${limit[1]} ${limit[2].toLowerCase()} pr. kunde${limit[3] ? ' pr. dag' : ''}`
        : null,
    })
  }
  return notes
}

function noteForItem(note: DagrofaGroupNote | undefined, priceCents: number | null): DagrofaPageNote | null {
  // Kun når gruppens avispris er varens pris — ellers hører teksten til en anden vare.
  if (!note || priceCents == null || note.regularPriceCents !== priceCents) return null
  const memberPriceCents =
    note.memberPriceCents != null && note.memberPriceCents < priceCents ? note.memberPriceCents : null
  if (memberPriceCents == null && !note.limitText) return null
  return { memberPriceCents, limitText: note.limitText }
}

// ── Avis → items ───────────────────────────────────────────────────────────

export function dagrofaPriceCents(product: Pick<DagrofaEnrichmentProduct, 'price'>): number | null {
  const kr = product.price
  if (kr == null || !Number.isFinite(kr) || kr <= 0) return null
  return Math.round(kr * 100)
}

export interface DagrofaAvisSelection {
  items: DagrofaAvisItem[]
  alcoholSkipped: number
  nonFoodSkipped: number
  noPriceSkipped: number
  nativeMatched: number
}

/**
 * Madvarer fra avisen. Klassifikation i rækkefølge: samme EAN i
 * Salling-kataloget → alkohol-regler → søskende i samme avisgruppe → navne-regler.
 */
export function selectDagrofaFoodItems(
  avis: DagrofaAvis,
  nativeByEan: Map<string, DagrofaNativeCategory>,
): DagrofaAvisSelection {
  const result: DagrofaAvisSelection = {
    items: [],
    alcoholSkipped: 0,
    nonFoodSkipped: 0,
    noPriceSkipped: 0,
    nativeMatched: 0,
  }
  const groupOf = (p: DagrofaEnrichmentProduct) => normalize(p.alttext ?? '')

  const siblings = new Map<string, Array<{ verdict: NativeVerdict; native: DagrofaNativeCategory }>>()
  for (const product of avis.products) {
    const native = nativeByEan.get(String(product.productId))
    const verdict = native ? nativeVerdict(native) : null
    if (!native || !verdict) continue
    const list = siblings.get(groupOf(product)) ?? []
    list.push({ verdict, native })
    siblings.set(groupOf(product), list)
  }

  const notes = parseDagrofaGroupNotes(avis.pageTexts, [...new Set(avis.products.map(groupOf))])
  const avisRef = {
    chain: avis.chain,
    paperId: avis.paperId,
    name: avis.name,
    url: avis.url,
    validFrom: avis.validFrom,
    validTo: avis.validTo,
  }

  for (const product of avis.products) {
    const ean = String(product.productId)
    const name = dagrofaProductName(product)
    const group = groupOf(product) || null
    const native = nativeByEan.get(ean) ?? null
    const own = native ? nativeVerdict(native) : null
    if (native && own) result.nativeMatched++

    // Katalogets afdeling vinder over navne-regler ("Cdo Baileys" er is).
    if (own ? own.alcohol : isDagrofaAlcohol(product)) {
      result.alcoholSkipped++
      continue
    }

    let food: boolean
    let department: string | null = null
    let category: string | null = null
    if (own) {
      food = own.food
      department = native?.lvl0 ?? null
      category = native?.lvl1 ?? null
    } else {
      const sibs = siblings.get(group ?? '') ?? []
      const foodSibs = sibs.filter((s) => s.verdict.food)
      if (sibs.length > 0 && foodSibs.length === 0) {
        food = false
      } else if (foodSibs.length > 0) {
        food = !NON_FOOD_NAME_RE.test(name)
        department = foodSibs[0].native.lvl0
        category = foodSibs[0].native.lvl1
      } else {
        food = !NON_FOOD_NAME_RE.test(`${name} ${group ?? ''}`)
        department = food ? guessDagrofaDepartment(name, group) : null
      }
    }
    if (!food) {
      result.nonFoodSkipped++
      continue
    }

    const priceCents = dagrofaPriceCents(product)
    if (priceCents == null) {
      result.noPriceSkipped++
      continue
    }
    result.items.push({
      avis: avisRef,
      product,
      ean,
      native,
      note: noteForItem(notes.get(group ?? ''), priceCents),
      department,
      category,
    })
  }
  return result
}

export function dagrofaAvisSourceId(ean: string): string {
  return `${DAGROFA_AVIS_SOURCE_ID_PREFIX}${ean}`
}

function addDays(date: string, days: number): string {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10)
}

export function dagrofaOfferWindow(avis: Pick<DagrofaAvis, 'validFrom' | 'validTo'>): { from: string; until: string } {
  return {
    from: copenhagenMidnightIso(avis.validFrom),
    until: copenhagenMidnightIso(addDays(avis.validTo, 1)),
  }
}

export function mapDagrofaAvisProduct(item: DagrofaAvisItem, syncedAt: string): ProductInsert {
  const { product } = item
  const { amount, unit } = parseDagrofaDesc(product.desc)
  return {
    gtin: validDagrofaGtin(item.ean),
    name: dagrofaProductName(product),
    brand: null,
    manufacturer: null,
    description: product.desc ? normalize(product.desc) : null,
    amount,
    unit,
    image_url: null,
    category_path: [item.department, item.category].filter(Boolean).join(' > ') || null,
    category_lvl0: item.department,
    category_lvl1: item.category,
    category_lvl2: null,
    source_chain: item.avis.chain.chain,
    source_id: dagrofaAvisSourceId(item.ean),
    active: true,
    last_seen_at: syncedAt,
    raw_data: {
      ean: item.ean,
      avis_group: product.alttext ?? null,
      avis_paper_id: item.avis.paperId,
      avis_name: item.avis.name,
      avis_url: item.avis.url,
      avis_page_index: product.pageIndex ?? null,
      native_category: item.native,
    },
  }
}

export function mapDagrofaAvisOffer(
  item: DagrofaAvisItem,
  productUuid: string,
  syncedAt: string,
): ProductOfferInsert | null {
  const priceCents = dagrofaPriceCents(item.product)
  if (priceCents == null) return null
  const desc = parseDagrofaDesc(item.product.desc)
  const qty = desc.unitPrice?.multibuyQty ?? null
  const notes = [
    item.note?.memberPriceCents != null
      ? `Medlemspris ${formatKr(item.note.memberPriceCents)}${item.avis.chain.memberApp ? ` med ${item.avis.chain.memberApp}` : ''}`
      : null,
    item.note?.limitText ?? null,
  ].filter(Boolean)
  const { from, until } = dagrofaOfferWindow(item.avis)

  return {
    product_id: productUuid,
    store_id: item.avis.chain.chain,
    price_cents: priceCents,
    before_price_cents: null,
    unit_price_cents: desc.unitPrice?.cents ?? null,
    unit_price_unit: desc.unitPrice?.unit ?? null,
    is_on_sale: true,
    offer_from: from,
    offer_until: until,
    offer_description: notes.length > 0 ? notes.join(' · ') : null,
    multibuy: qty ? `${qty} for ${formatKr(priceCents)}` : null,
    discount_percentage: null,
    in_stock: true,
    source: item.avis.chain.source,
    source_synced_at: syncedAt,
    raw_data: {
      avis_paper_id: item.avis.paperId,
      avis_name: item.avis.name,
      avis_group: item.product.alttext ?? null,
      unit_price_text: desc.unitPriceText,
      member_price_cents: item.note?.memberPriceCents ?? null,
      limit_text: item.note?.limitText ?? null,
    },
  }
}
