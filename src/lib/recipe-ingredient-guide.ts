/**
 * Offentlig ingrediensliste til opskriftsbotten.
 * Samme form som Planomos opskrift-ingredienser.md: navn, enhed, typisk mængde.
 * Listen er et pejlemærke, ikke et lukket katalog.
 */

export type GuideAmount = {
  unit: string
  amounts: number[]
}

export type GuideIngredient = {
  name: string
  category: string
  basis: boolean
  recipeIds: string[]
  units: GuideAmount[]
}

const CATALOG_HEADING = '## Ingredienser'

export function formatGuideAmount(value: number): string {
  if (!Number.isFinite(value)) return '0'
  const rounded = Math.round(value * 10) / 10
  return Number.isInteger(rounded) ? String(rounded) : String(rounded)
}

export function medianAmount(values: number[]): number {
  const sorted = values.filter((value) => Number.isFinite(value) && value > 0).sort((a, b) => a - b)
  if (!sorted.length) return 0
  const mid = Math.floor(sorted.length / 2)
  if (sorted.length % 2) return sorted[mid]
  return (sorted[mid - 1] + sorted[mid]) / 2
}

function unitPhrase(unit: GuideAmount): string {
  const amounts = unit.amounts.filter((value) => value > 0)
  const typical = medianAmount(amounts)
  const min = Math.min(...amounts)
  const max = Math.max(...amounts)
  const range =
    amounts.length > 1 && min !== max
      ? ` (${formatGuideAmount(min)}–${formatGuideAmount(max)})`
      : ''
  return `${unit.unit}, typisk ${formatGuideAmount(typical)}${range}`
}

export function formatGuideIngredient(ingredient: GuideIngredient): string {
  const units = [...ingredient.units]
    .filter((unit) => unit.unit && unit.amounts.some((amount) => amount > 0))
    .sort((a, b) => b.amounts.length - a.amounts.length || a.unit.localeCompare(b.unit, 'da'))
  const [first, ...rest] = units
  const unitText = first
    ? [unitPhrase(first), ...rest.map((unit) => `også ${unitPhrase(unit)}`)].join('; ')
    : 'stk'
  const recipes = new Set(ingredient.recipeIds).size
  const recipeLabel = recipes === 1 ? '1 opskrift' : `${recipes} opskrifter`
  const basis = ingredient.basis ? ' Basisvare.' : ''
  return `- ${ingredient.name} — ${unitText}. ${recipeLabel}.${basis}`
}

export function renderRecipeIngredientGuide(input: {
  recipeCount: number
  ingredients: GuideIngredient[]
}): string {
  const byCategory = new Map<string, GuideIngredient[]>()
  for (const ingredient of input.ingredients) {
    const category = ingredient.category.trim() || 'Uden kategori'
    const list = byCategory.get(category) ?? []
    list.push(ingredient)
    byCategory.set(category, list)
  }

  const sections = [...byCategory.entries()]
    .sort(([a], [b]) => a.localeCompare(b, 'da'))
    .map(([category, items]) => {
      const lines = [...items]
        .sort((a, b) => a.name.localeCompare(b.name, 'da'))
        .map(formatGuideIngredient)
      return `## ${category}\n\n${lines.join('\n')}`
    })

  return `${GUIDE_INTRO}

${input.ingredients.length} ingredienser fra ${input.recipeCount} publicerede opskrifter.

${CATALOG_HEADING}

${sections.join('\n\n')}
`
}

export const GUIDE_INTRO = `# Ingredienser og enheder i opskrifter

Til opskriftsbotten og Grok. Prøv at bruge navnet som det står, når maden er den samme vare. Vælg en af enhederne ved ingrediensen. Mængderne gælder hele opskriften, typisk 2 portioner.

Listen er ikke lukket. Retten må gerne bruge en råvare, der ikke står her, hvis den hører til. Opfind ikke et nyt navn for noget, der allerede står her: flødeost er flødeost, ikke «laktosefri flødeost naturel». Radiser er radiser. Skinkeschnitzel er skinkeschnitzel.

## Sådan skrives opskriften

- Ingredienslisten er det, man køber. Skriv \`500 g kartofler\`, ikke \`kartofler — i kvarte\`. Tilberedningen hører i fremgangsmåden.
- Gør tilberedningen til et trin, gerne det første. Eksempel: «Skær kartoflerne i kvarte.» Det samme gælder hakke, rive, snitte, skære i skiver og skrælle.
- Brug rå og almindelige butiksvarer. Ingen fortilberedt hovedingrediens: ikke grillet, stegt, kogt, marineret eller paneret kød, kylling eller fisk. Kylling er \`kyllingebryst\`, og fremgangsmåden steger eller griller den. Frosne grøntsager, pasta, ris, dåsebønner og krydderier er fine.
- Hver ret skal have et lille ekstra, der samler smagen, uden at indkøbslisten vokser. En simpel sovs, dressing eller dryp af 1–3 ting, der allerede er i listen, eller af salt, peber, olivenolie, smør, citron, hvidløg, sennep eller honning. Køb ikke en færdig sovs, og tilføj ikke en ny hovedingrediens for det.

## Keto

Lav-kulhydrat, høj fedt. Højst ca. 20 g netto kulhydrat pr. portion. Ingen brød, pasta, ris, kartofler, sukker eller frugt ud over lidt bær. Aftensmad har et tilbehør ved siden af retten.

## Sense

Moderat kulhydrat og almindelig hverdagsmad. Masser af grønt, en håndfuld protein, højst én stivelse.

## GLP-1

Mættende og en mindre tallerken. Protein og grønt. Kun en lille mængde komplekst kulhydrat til aften.

## Proteinrig

Almindelig mad med lidt mere protein, ca. 30–40 g pr. person fra kød, fisk, rejer eller æg. Kartofler, ris, pasta og brød er fine. Ingen shakes eller proteinpulver. Fremgangsmåden gør retten færdig.

## Antiinflammatorisk

Almindelig mad tæt på middelhavskost: meget grønt, olivenolie, fisk, kylling eller æg oftere end rødt kød. Stivelsen er et lille tilbehør. Ikke keto, og ingen løfter om at helbrede.

## Fleksitarisk

Mest planter. Kød eller fisk er en del af retten, ikke hele retten. En salat er kun hovedret, når der er æg, ost, bønner eller brød nok.`

/** Kun kataloget, til systemprompten. Kostreglerne ligger allerede et andet sted i prompten. */
export function catalogSection(markdown: string): string {
  const index = markdown.indexOf(CATALOG_HEADING)
  const body = index >= 0 ? markdown.slice(index) : markdown
  return `FORETRUKNE INGREDIENSNANVE
Prøv at ramme et navn herunder, når maden er den samme vare, og brug en af enhederne. Listen er ikke lukket: brug en anden råvare, hvis retten kræver det. Opfind ikke et nyt navn for en vare, der allerede står her.

${body.trim()}`
}
