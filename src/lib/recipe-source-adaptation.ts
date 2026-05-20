export type SourceRecipePayload = {
  url: string
  title?: string
  summary?: string
  ingredientsText?: string
  instructionsText?: string
  formattedSource?: string
}

export function isSourceRecipe(source?: SourceRecipePayload | null): source is SourceRecipePayload {
  return Boolean(
    source?.url &&
      (source.ingredientsText?.trim() ||
        source.instructionsText?.trim() ||
        source.formattedSource?.trim())
  )
}

export function hasSourceRecipe(
  input: { sourceRecipe?: SourceRecipePayload | null } | null | undefined
): input is { sourceRecipe: SourceRecipePayload } {
  return isSourceRecipe(input?.sourceRecipe)
}

export function buildSourceRecipeUserPrompt(
  source: SourceRecipePayload,
  categoryName: string,
  extraRules = ''
): string {
  const title = source.title?.trim() || 'Kildeopskrift'
  const ingredients = source.ingredientsText?.trim() || '(ikke fundet)'
  const instructions = source.instructionsText?.trim() || '(ikke fundet)'
  const summary = source.summary?.trim()

  return `OPGAVE: ADAPTÉR KILDEOPSKRIFT — IKKE OPFIND EN NY RET.

Du skal lave en Functional Foods-version af opskriften fra linket nedenfor.
Retten skal være **næsten identisk** i idé, ret-type, smag, struktur og genkendelighed.
Behold det samme koncept og de samme hovedingredienser medmindre kostkategoriens regler kræver en lille erstatning.

KILDE-LINK: ${source.url}
KILDE-TITEL: ${title}
${summary ? `KILDE-BESKRIVELSE: ${summary}\n` : ''}
KILDE-INGREDIENSER:
${ingredients}

KILDE-FREMGANGSMÅDE:
${instructions}

OBLIGATORISKE REGLER:
- Behold rettypen fra kilden (fx chaffle, burger, lasagne, suppe osv.) — lav den **ikke** om til en helt anden ret.
- Behold hovedingredienserne fra kilden så vidt muligt.
- Omskriv til dansk Functional Foods-format: 2 portioner, vores JSON-struktur, gram/enhedsregler og ${categoryName}-krav.
- Du må justere mængder, formatering og små detaljer — men resultatet skal tydeligt føles som samme opskrift.
- Kopiér ikke tekst ordret fra kilden.
- Titlen skal stadig ligne kildens titel (samme ret, evt. let omskrevet).
- Hvis kilden er keto og du genererer keto: behold lavkulhydrat-profilen.
${extraRules ? `\n${extraRules}` : ''}

Returnér kun valid JSON i det format, du allerede er instrueret i.`
}

export function shouldSkipVariationPrompt(sourceRecipe?: SourceRecipePayload | null): boolean {
  return hasSourceRecipe({ sourceRecipe })
}
