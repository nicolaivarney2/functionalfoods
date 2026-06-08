/**
 * Goma er sunset — eksisterende produkt/tilbuds-data i FF main DB bevares read-only
 * indtil production skifter til fooddata. Ingen nye imports eller cleanup.
 *
 * Nød-genaktivering (kun dev/debug): GOMA_IMPORT_ENABLED=true
 */

export const GOMA_SUNSET_MESSAGE =
  'Goma-import er sunset. Eksisterende data bevares uændret indtil fooddata cutover på production.'

export function isGomaImportEnabled(): boolean {
  return process.env.GOMA_IMPORT_ENABLED === 'true'
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
