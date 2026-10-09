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

  return `OPGAVE: TILPAS KILDEOPSKRIFTEN. OPFIND IKKE EN NY RET.

Retten skal være næsten identisk i idé, ret-type, smag og struktur.
Behold hovedingredienserne, medmindre kosten kræver en lille erstatning.

KILDE-TITEL: ${title}
KILDE-INGREDIENSER:
${ingredients}
KILDE-FREMGANGSMÅDE:
${instructions}

- Behold rettypen. Lav den ikke om til en anden ret.
- Omskriv til dansk, 2 portioner, JSON-formatet og ${categoryName}-reglerne.
- Kopiér ikke teksten ordret. Titlen skal stadig ligne kildens.
- Højst 16 ingredienslinjer. 8–14 er fint.
- Drop pynt, valgfri dip og citronskiver til servering.
- Behold protein, stivelse, grønt, salt, peber, fedtstof og den sovs, retten er.
- Slå identiske dubletter sammen. Opfind ikke nye ingrediensnavne.
${extraRules ? `\n${extraRules}` : ''}`
}

export function shouldSkipVariationPrompt(sourceRecipe?: SourceRecipePayload | null): boolean {
  return hasSourceRecipe({ sourceRecipe })
}
