import { NextRequest, NextResponse } from 'next/server'
import { importGomaProducts } from '@/lib/goma-import'
import { cleanupExpiredOffers } from '@/lib/dagligvarer-offer-cleanup'
import { GOMA_SUNSET_MESSAGE, isGomaImportEnabled } from '@/lib/goma-sunset'
import { filterGomaStoresForImport, getGomaStoresForDanishWeekday } from '@/lib/goma-import-stores'
import { GOMA_SYNC_DEFAULTS } from '@/grocery/adapters/goma/sync'
import { getCopenhagenWeekday } from '@/lib/grocery/sync-schedule'
import {
  mergeGomaStoreLists,
  parseGomaStoreQuery,
  resolveGomaCatchUpStores,
} from '@/lib/goma-catch-up'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const maxDuration = 300

function formatImportError(err: unknown): string {
  const anyErr = err as {
    name?: string
    message?: string
    cause?: { message?: string }
    errors?: unknown[]
  }
  const parts: string[] = []
  if (anyErr?.name) parts.push(anyErr.name)
  if (anyErr?.message) parts.push(anyErr.message)
  if (typeof err === 'string') parts.push(err)
  if (anyErr?.cause?.message) parts.push(`cause: ${anyErr.cause.message}`)
  if (Array.isArray(anyErr?.errors)) {
    parts.push(
      'errors: ' +
        anyErr.errors
          .map((e) => (e as { message?: string })?.message || String(e))
          .filter(Boolean)
          .join(' | '),
    )
  }
  if (parts.length > 0) return parts.join(' — ')
  try {
    return JSON.stringify(err)
  } catch {
    return String(err)
  }
}

export async function POST(req: NextRequest) {
  try {
    const cronSecret = process.env.CRON_SECRET
    const providedSecret = req.headers.get('x-cron-secret')

    if (cronSecret && providedSecret !== cronSecret) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized cron call' },
        { status: 401 },
      )
    }

    if (!isGomaImportEnabled()) {
      return NextResponse.json({
        success: true,
        sunset: true,
        message: GOMA_SUNSET_MESSAGE,
        stores: [],
        imported: null,
      })
    }

    const url = new URL(req.url)
    const skipCleanup = url.searchParams.get('skipCleanup') === '1'
    const explicitStores = parseGomaStoreQuery(url.searchParams.get('stores'))
    const dayIndex = getCopenhagenWeekday()
    const scheduledStores = getGomaStoresForDanishWeekday(dayIndex)

    let catchUpStores: typeof scheduledStores = []
    const wantCatchUp =
      url.searchParams.get('catchUp') === '1' ||
      (explicitStores.length === 0 && url.searchParams.get('catchUp') !== '0')
    if (wantCatchUp) {
      try {
        catchUpStores = await resolveGomaCatchUpStores()
      } catch (err) {
        console.warn(
          'Goma catch-up lookup fejlede:',
          err instanceof Error ? err.message : err,
        )
      }
    }

    const requested =
      explicitStores.length > 0
        ? mergeGomaStoreLists(explicitStores, wantCatchUp ? catchUpStores : [])
        : mergeGomaStoreLists(scheduledStores, catchUpStores)

    const { allowed: stores, skipped: skippedStores } = filterGomaStoresForImport(requested)

    let imported: number | null = null
    let importError: string | null = null
    let storeErrors: string[] = []

    if (stores.length > 0) {
      try {
        const result = await importGomaProducts({
          stores,
          limit: GOMA_SYNC_DEFAULTS.limit,
          pages: GOMA_SYNC_DEFAULTS.pages,
        })
        imported = result?.totalImported ?? 0
        storeErrors = result?.errors ?? []
        if (storeErrors.length > 0) {
          importError = storeErrors.join(' | ')
        }
      } catch (err) {
        importError = formatImportError(err) || 'Ukendt importfejl'
        console.error('❌ Goma import fejlede i scheduled-sync:', err)
      }
    }

    let cleanupResult: Awaited<ReturnType<typeof cleanupExpiredOffers>> | null = null
    let cleanupError: string | null = null
    if (!skipCleanup) {
      try {
        cleanupResult = await cleanupExpiredOffers()
      } catch (err) {
        cleanupError = err instanceof Error ? err.message : 'Ukendt cleanup-fejl'
        console.error('❌ Expired-offer cleanup fejlede:', err)
      }
    }

    const overallSuccess = !importError && !cleanupError

    return NextResponse.json(
      {
        success: overallSuccess,
        message: overallSuccess
          ? stores.length === 0
            ? 'Ingen butikker planlagt til sync i dag, men cleanup blev kørt'
            : 'Goma → fooddata sync + FF cleanup gennemført'
          : 'Scheduled Goma sync kørt med fejl (se importError / cleanupError)',
        dayIndex,
        scheduledStores,
        catchUpStores,
        stores,
        skippedStores,
        imported,
        importError,
        storeErrors,
        cleanup: cleanupResult
          ? {
              cleaned: cleanupResult.cleaned,
              byStore: cleanupResult.byStore,
              durationMs: cleanupResult.durationMs,
            }
          : null,
        cleanupError,
      },
      { status: overallSuccess ? 200 : 500 },
    )
  } catch (error) {
    console.error('❌ Error in scheduled Goma sync:', error)
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error ? error.message : 'Ukendt fejl i scheduled Goma sync',
      },
      { status: 500 },
    )
  }
}
