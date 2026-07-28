function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&ndash;/gi, '–')
    .replace(/&mdash;/gi, '—')
    .replace(/&8211;/gi, '–')
}

export function htmlToReadableText(html: string): string {
  return decodeHtmlEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
      .replace(/<\/(h1|h2|h3|p|li|tr|div|section|article)>/gi, '\n')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  )
}

/** Ketoliv: "Ingredienser". SenseMyDiet: "Det skal du bruge". */
const INGREDIENT_SECTION_START =
  /(?:Ingredienser|Det skal du bruge|Sådan skal du bruge)/gi

/** Ketoliv: "Fremgangsmåde". SenseMyDiet: "Sådan gør du". */
const INSTRUCTION_SECTION_START = /(?:Fremgangsmåde|Sådan gør du|Instructions)/i

const INSTRUCTION_SECTION_END =
  /(?:Tips og gode råd|Sådan fordeler du|Vejledning|Forstår du ikke|Alle opskrifter|Andre opskrifter|Mere "?Aftensmad"?|Tilmeld dig|©|$)/i

function cleanSection(text: string): string {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !/^(pin|print opskriften|bedøm denne ret|alle opskrifter|indkøbsliste pdf\/?print)$/i.test(line))
    .join('\n')
    .trim()
}

/** Matcher både "10 g olie" og Sense-linjer som "2 kyllingebryst" / "½ chili". */
function looksLikeIngredientLine(line: string): boolean {
  const t = line.trim()
  if (!t || t.length > 120) return false
  if (/^(Topping|Tilbehør|Kylling|Dressing|Sauce|Sovs)\b/i.test(t)) return true
  if (/^[½¼¾]\s+\S+/u.test(t)) return true
  if (/^\d+[,.]?\d*\s*(-\s*\d+[,.]?\d*)?\s*(stk\.?|st\.?|stykker?|gram|g|tsk\.?|spsk\.?|ml|dl|l|kg|bundt|fed|terning)\b/i.test(t)) {
    return true
  }
  // Sense: "2 kyllingebryst", "1 løg", "1 peberfrugt" (antal uden eksplicit enhed)
  if (/^\d+[,.]?\d*\s+[a-zæøåA-ZÆØÅ]/.test(t) && !/^(Tid i alt|Arbejdstid|Antal|Udgivet)\b/i.test(t)) {
    return true
  }
  if (/^salt\b/i.test(t) || /^peber\b/i.test(t)) return true
  return false
}

function looksLikeIngredientList(section: string): boolean {
  const lines = section
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  const ingredientLines = lines.filter(looksLikeIngredientLine)
  return ingredientLines.length >= 2
}

function trimToIngredientLines(section: string): string {
  const lines = section
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  const startIdx = lines.findIndex(looksLikeIngredientLine)
  if (startIdx === -1) {
    return section
  }

  // Stop før marketing / tags der ofte følger Sense-listen
  const endMarkers = /^(Madlavningstilstand|Familie|Få mere ud af|Bemærk:|Som medlem)/i
  let endIdx = lines.length
  for (let i = startIdx + 1; i < lines.length; i++) {
    if (endMarkers.test(lines[i]) && !looksLikeIngredientLine(lines[i])) {
      endIdx = i
      break
    }
  }

  return lines.slice(startIdx, endIdx).join('\n')
}

function extractIngredientsSection(readable: string): string {
  const blocks = [
    ...readable.matchAll(
      new RegExp(
        `${INGREDIENT_SECTION_START.source}([\\s\\S]*?)(?=${INSTRUCTION_SECTION_START.source}|Tips og gode råd|$)`,
        'gi'
      )
    ),
  ]

  for (let i = blocks.length - 1; i >= 0; i--) {
    const section = cleanSection(blocks[i][1] || '')
    if (looksLikeIngredientList(section)) {
      return trimToIngredientLines(section)
    }
  }

  const directMatch = readable.match(
    /(?:Ingredienser|Det skal du bruge)\s*\n+\s*((?:\d+|½|¼|¾)[\s\S]*?)(?=Fremgangsmåde|Sådan gør du|Instructions|Tips og gode råd)/i
  )
  if (directMatch?.[1]) {
    return trimToIngredientLines(cleanSection(directMatch[1]))
  }

  return trimToIngredientLines(cleanSection(blocks.at(-1)?.[1] || ''))
}

function extractInstructionsSection(readable: string): string {
  const match = readable.match(
    new RegExp(`${INSTRUCTION_SECTION_START.source}([\\s\\S]*?)${INSTRUCTION_SECTION_END.source}`, 'i')
  )
  return cleanSection(match?.[1] || '')
}

function extractTitleFromHtml(html: string, readable: string): string | undefined {
  const ogTitle = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)
  if (ogTitle?.[1]) {
    return decodeHtmlEntities(
      ogTitle[1]
        .replace(/\s*-\s*Ketoliv.*$/i, '')
        .replace(/\s*-\s*Sense opskrift.*$/i, '')
        .trim()
    )
  }

  const pageTitle = html.match(/<title>([\s\S]*?)<\/title>/i)?.[1]
  if (pageTitle) {
    return decodeHtmlEntities(
      pageTitle
        .replace(/\s*-\s*Ketoliv.*$/i, '')
        .replace(/\s*-\s*Sense opskrift.*$/i, '')
        .trim()
    )
  }

  const h1 = readable.match(
    /\n([^\n]{8,120})\n[\s\S]{0,200}?(?:Ingredienser|Det skal du bruge)/i
  )
  return h1?.[1]?.trim()
}

export function extractStructuredRecipeFromHtml(html: string, url: string) {
  const readable = htmlToReadableText(html)
  const title = extractTitleFromHtml(html, readable)

  const ingredientsText = extractIngredientsSection(readable)
  const instructionsText = extractInstructionsSection(readable)

  const summaryMatch = readable.match(
    /Endelig vurdering af retten\s+([\s\S]{20,400}?)(?:Chaffel|Ingredienser|##)/i
  )
  // Sense: kort blurb under H1 før tid/antal
  const senseSummaryMatch =
    !summaryMatch &&
    readable.match(
      new RegExp(
        `${title ? title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : '[^\\n]{8,120}'}\\s*\\n+([\\s\\S]{40,500}?)(?:Tid i alt|Arbejdstid|Antal|Det skal du bruge)`,
        'i'
      )
    )
  const summary = (summaryMatch?.[1] || senseSummaryMatch?.[1] || '').trim() || undefined

  const formattedSource = [
    title ? `Titel: ${title}` : '',
    summary ? `Beskrivelse: ${summary}` : '',
    ingredientsText ? `Ingredienser:\n${ingredientsText}` : '',
    instructionsText ? `Fremgangsmåde:\n${instructionsText}` : '',
  ]
    .filter(Boolean)
    .join('\n\n')

  return {
    url,
    title,
    summary,
    ingredientsText,
    instructionsText,
    // Kun brug raw-fallback når vi faktisk har opskriftsindhold — ellers bliver
    // title-only fejlagtigt godkendt som kildeopskrift i AI-generatoren.
    formattedSource:
      formattedSource ||
      (ingredientsText || instructionsText ? readable.slice(0, 4000) : ''),
    rawText: readable.slice(0, 12_000),
  }
}
