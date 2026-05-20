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

function cleanSection(text: string): string {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !/^(pin|print opskriften|bedøm denne ret|alle opskrifter)$/i.test(line))
    .join('\n')
    .trim()
}

function looksLikeIngredientList(section: string): boolean {
  const lines = section
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  const ingredientLines = lines.filter(
    (line) =>
      /^\d+[,.]?\d*\s+(stk|gram|g|tsk|spsk|ml|dl|kg)\b/i.test(line) ||
      /^Topping\b/i.test(line)
  )

  return ingredientLines.length >= 2
}

function trimToIngredientLines(section: string): string {
  const lines = section
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  const startIdx = lines.findIndex(
    (line) =>
      /^\d+[,.]?\d*\s+(stk|gram|g|tsk|spsk|ml|dl|kg)\b/i.test(line) ||
      /^Topping\b/i.test(line)
  )

  if (startIdx === -1) {
    return section
  }

  return lines.slice(startIdx).join('\n')
}

function extractIngredientsSection(readable: string): string {
  const blocks = [...readable.matchAll(/Ingredienser([\s\S]*?)(?=Fremgangsmåde|Instructions|Sådan gør du)/gi)]

  for (let i = blocks.length - 1; i >= 0; i--) {
    const section = cleanSection(blocks[i][1] || '')
    if (looksLikeIngredientList(section)) {
      return trimToIngredientLines(section)
    }
  }

  const directMatch = readable.match(
    /Ingredienser\s*\n+\s*(\d+\s+(?:stk|gram|g|tsk|spsk)[\s\S]*?)(?=Fremgangsmåde|Instructions|Sådan gør du)/i
  )
  if (directMatch?.[1]) {
    return cleanSection(directMatch[1])
  }

  return trimToIngredientLines(cleanSection(blocks.at(-1)?.[1] || ''))
}

function extractTitleFromHtml(html: string, readable: string): string | undefined {
  const ogTitle = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)
  if (ogTitle?.[1]) {
    return decodeHtmlEntities(ogTitle[1].replace(/\s*-\s*Ketoliv.*$/i, '').trim())
  }

  const pageTitle = html.match(/<title>([\s\S]*?)<\/title>/i)?.[1]
  if (pageTitle) {
    return decodeHtmlEntities(pageTitle.replace(/\s*-\s*Ketoliv.*$/i, '').trim())
  }

  const h1 = readable.match(/\n([^\n]{8,120})\n[\s\S]{0,200}?Ingredienser/i)
  return h1?.[1]?.trim()
}

export function extractStructuredRecipeFromHtml(html: string, url: string) {
  const readable = htmlToReadableText(html)
  const title = extractTitleFromHtml(html, readable)

  const ingredientsText = extractIngredientsSection(readable)
  const instructionsMatch = readable.match(
    /Fremgangsmåde([\s\S]*?)(?:Vejledning|Forstår du ikke|Alle opskrifter|Andre opskrifter|Tilmeld dig|©|$)/i
  )
  const instructionsText = cleanSection(instructionsMatch?.[1] || '')

  const summaryMatch = readable.match(
    /Endelig vurdering af retten\s+([\s\S]{20,400}?)(?:Chaffel|Ingredienser|##)/i
  )
  const summary = summaryMatch?.[1]?.trim()

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
    formattedSource: formattedSource || readable.slice(0, 4000),
    rawText: readable.slice(0, 12_000),
  }
}
