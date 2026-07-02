/**
 * Goma som primær tilbudskilde for kæder uden native scrape.
 *
 * Native (fooddata direkte): Netto, Bilka, Føtex, REMA 1000.
 * Goma (via fooddata): Lidl, Coop-kæder, MENY, Spar, Nemlig, Min Købmand, …
 * Tjek: udfaset — kun nød-fallback når GOMA_IMPORT_ENABLED=false.
 *
 * Env:
 * - GOMA_IMPORT_ENABLED=true      — påkrævet på Vercel + GitHub Actions import
 * - GOMA_SIMULATE_GONE=true       — dev: simuler manglende Goma (som gammel prod)
 * - GOMA_LEGACY_DATA_ENABLED=true — nød: genaktiver legacy Goma product IDs i prissøgning
 * - GROCERY_TJEK_DISABLED=true    — stop Tjek-scrape i fooddata (anbefalet med Goma)
 */

export const GOMA_SUNSET_MESSAGE =
  'Goma-import er slået fra. Sæt GOMA_IMPORT_ENABLED=true for tilbud på kæder uden fuldt fooddata-katalog.'

export const GOMA_SIMULATE_GONE_MESSAGE =
  'Simulerer at Goma-data er væk — kun fooddata-produktnøgler bruges til priser og matches.'

export type GomaSunsetStatus = {
  importEnabled: boolean
  simulateGone: boolean
  legacyDataAvailable: boolean
  message: string
}

export function isGomaSimulateGone(): boolean {
  if (process.env.GOMA_LEGACY_DATA_ENABLED === 'true') return false
  // Aktiv Goma-import: brug synkede tilbud i prissøgning og dagligvarer.
  if (isGomaImportEnabled()) return false
  if (process.env.GOMA_SIMULATE_GONE === 'true') return true
  if (process.env.GOMA_SIMULATE_GONE === 'false') return false
  // Uden GOMA_IMPORT_ENABLED: legacy cutover — Goma product IDs bruges ikke til priser.
  return process.env.NODE_ENV === 'production'
}

/** Legacy Goma product IDs (ikke `bilka-123` fooddata-nøgler) må bruges til prissøgning. */
export function isGomaLegacyDataEnabled(): boolean {
  return !isGomaSimulateGone()
}

export function isGomaImportEnabled(): boolean {
  return process.env.GOMA_IMPORT_ENABLED === 'true'
}

export function getGomaSunsetStatus(): GomaSunsetStatus {
  const simulateGone = isGomaSimulateGone()
  const importEnabled = isGomaImportEnabled()

  let message = GOMA_SUNSET_MESSAGE
  if (simulateGone) {
    message = GOMA_SIMULATE_GONE_MESSAGE
  } else if (importEnabled) {
    message =
      'Goma-import aktiv for offers-only kæder (Lidl, Coop, MENY, …). Salling/REMA kommer fra fooddata.'
  }

  return {
    importEnabled,
    simulateGone,
    legacyDataAvailable: !simulateGone,
    message,
  }
}

export class GomaSunsetError extends Error {
  readonly code = 'GOMA_SUNSET' as const

  constructor(message = GOMA_SUNSET_MESSAGE) {
    super(message)
    this.name = 'GomaSunsetError'
  }
}

export function assertGomaImportEnabled(): void {
  if (!isGomaImportEnabled()) {
    throw new GomaSunsetError()
  }
}
