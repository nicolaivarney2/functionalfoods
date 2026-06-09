/**
 * Goma er sunset — production bruger kun fooddata (legacy Goma matches/priser ignoreres).
 * Eksisterende Goma-rækker i DB bevares read-only; slettes ikke.
 *
 * Env:
 * - GOMA_IMPORT_ENABLED=true      — nød-genaktivering af import/sync
 * - GOMA_SIMULATE_GONE=true       — dev: ignorer legacy Goma product IDs (som production)
 * - GOMA_LEGACY_DATA_ENABLED=true — nød: genaktiver legacy Goma på production
 *
 * Production: simulateGone=true som standard (ingen env nødvendig på Vercel).
 */

export const GOMA_SUNSET_MESSAGE =
  'Goma-import er sunset. Eksisterende data bevares uændret indtil fooddata cutover på production.'

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
  if (process.env.GOMA_SIMULATE_GONE === 'true') return true
  if (process.env.GOMA_SIMULATE_GONE === 'false') return false
  // Live: fooddata cutover — legacy Goma bruges ikke til priser/matches/dagligvarer.
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
    message = 'Goma-import er midlertidigt genaktiveret (GOMA_IMPORT_ENABLED=true).'
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
