import { NextRequest, NextResponse } from 'next/server'
import { importGomaProducts } from '@/lib/goma-import'
import { cleanupExpiredOffers } from '@/lib/dagligvarer-offer-cleanup'
import { GOMA_SUNSET_MESSAGE, isGomaImportEnabled } from '@/lib/goma-sunset'
import { filterGomaStoresForImport, type GomaStoreName } from '@/lib/goma-import-stores'
import { GOMA_SYNC_DEFAULTS } from '@/grocery/adapters/goma/sync'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const maxDuration = 300

type GomaStoreId = GomaStoreName

function getStoresForToday(): { dayIndex: number; stores: GomaStoreId[] } {
  const now = new Date()
  const danishTime = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Copenhagen' }))
  const dayIndex = danishTime.getDay()

  let stores: GomaStoreId[] = []

  switch (dayIndex) {
    case 1:
      stores = []
      break
    case 2:
      stores = ['ABC Lavpris']
      break
    case 3:
      stores = ['365discount']
      break
    case 4:
      stores = ['MENY', 'Spar', 'Min Købmand', 'Kvickly', 'superbrugsen', 'Løvbjerg']
      break
    case 5:
      stores = ['Brugsen']
      break
    case 6:
      stores = ['Lidl']
      break
    case 0:
      stores = ['Nemlig']
      break
    default:
      stores = []
  }

  return { dayIndex, stores }
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

    const { dayIndex, stores: scheduledStores } = getStoresForToday()
    const { allowed: stores, skipped: skippedStores } = filterGomaStoresForImport(scheduledStores)

    let imported: number | null = null
    let importError: string | null = null

    if (stores.length > 0) {
      try {
        const result = await importGomaProducts({
          stores,
          limit: GOMA_SYNC_DEFAULTS.limit,
          pages: GOMA_SYNC_DEFAULTS.pages,
        })
        imported = result?.totalImported ?? 0
      } catch (err) {
        const anyErr = err as { name?: string; message?: string; cause?: { message?: string }; errors?: unknown[] }
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
        importError =
          parts.length > 0
            ? parts.join(' — ')
            : (() => {
                try {
                  return JSON.stringify(err)
                } catch {
                  return String(err)
                }
              })() || 'Ukendt importfejl'
        console.error('❌ Goma import fejlede i scheduled-sync:', err)
      }
    }

    let cleanupResult: Awaited<ReturnType<typeof cleanupExpiredOffers>> | null = null
    let cleanupError: string | null = null
    try {
      cleanupResult = await cleanupExpiredOffers()
    } catch (err) {
      cleanupError = err instanceof Error ? err.message : 'Ukendt cleanup-fejl'
      console.error('❌ Expired-offer cleanup fejlede:', err)
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
        stores,
        skippedStores,
        imported,
        importError,
        cleanup: cleanupResult
          ? {
              cleaned: cleanupResult.cleaned,
              byStore: cleanupResult.byStore,
              durationMs: cleanupResult.durationMs,
            }
          : null,
        cleanupError,
      },
      { status: 200 },
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
