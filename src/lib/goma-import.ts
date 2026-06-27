/**
 * Goma import entrypoint (cron + admin).
 *
 * Writes to **fooddata** (grocery Supabase) via `syncGoma`. FF main DB and Planomo
 * pick up data through the nightly fooddata→FF import (`scripts/import-fooddata-to-ff.ts`).
 */

import { assertGomaImportEnabled } from '@/lib/goma-sunset'
import { syncGoma, type GomaSyncOptions, type GomaSyncResult } from '@/grocery/adapters/goma'

export type ImportOptions = GomaSyncOptions

export type ImportResult = GomaSyncResult & {
  /** @deprecated use totalImported */
  totalImported: number
}

export async function importGomaProducts(options: ImportOptions): Promise<ImportResult> {
  assertGomaImportEnabled()

  const result = await syncGoma(options)
  return result
}

export { syncGoma }
