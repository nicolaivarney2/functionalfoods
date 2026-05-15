import { NextRequest, NextResponse } from 'next/server'
import { importGomaProducts } from '@/lib/goma-import'
import { cleanupExpiredOffers } from '@/lib/dagligvarer-offer-cleanup'

export const dynamic = 'force-dynamic'
export const revalidate = 0
// Vercel Pro plan max. Required for fully syncing big stores like Nemlig
// (~30k products) within a single function invocation.
export const maxDuration = 300

type GomaStoreId =
  | 'Netto'
  | 'REMA 1000'
  | '365discount'
  | 'Lidl'
  | 'Føtex'
  | 'Bilka'
  | 'Nemlig'
  | 'MENY'
  | 'Spar'
  | 'Kvickly'
  | 'superbrugsen'
  | 'Brugsen'
  | 'Løvbjerg'
  | 'ABC Lavpris'

function getStoresForToday(): { dayIndex: number; stores: GomaStoreId[] } {
  // Use Danish time zone (Europe/Copenhagen) to match when stores actually update their offers
  // This ensures we sync the correct stores on the correct day regardless of UTC time
  const now = new Date()
  // Convert to Danish time zone
  const danishTime = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Copenhagen" }))
  const dayIndex = danishTime.getDay() // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

  let stores: GomaStoreId[] = []

  switch (dayIndex) {
    case 1: // Monday (Mandag) – no specific chains
      stores = []
      break
    case 2: // Tuesday (Tirsdag)
      stores = ['ABC Lavpris']
      break
    case 3: // Wednesday (Onsdag)
      stores = ['365discount']
      break
    case 4: // Thursday (Torsdag)
      stores = ['MENY', 'Spar', 'Kvickly', 'superbrugsen', 'Løvbjerg', 'Føtex']
      break
    case 5: // Friday (Fredag)
      stores = ['Netto', 'Bilka', 'Brugsen']
      break
    case 6: // Saturday (Lørdag)
      stores = ['REMA 1000', 'Lidl']
      break
    case 0: // Sunday (Søndag)
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
        {
          success: false,
          message: 'Unauthorized cron call'
        },
        { status: 401 }
      )
    }

    const { dayIndex, stores } = getStoresForToday()

    let imported: number | null = null
    let importError: string | null = null

    if (stores.length > 0) {
      try {
        const result = await importGomaProducts({
          stores,
          limit: 150,
          // 250 * 150 = 37.500 produkter pr. butik – nok til Nemlig (~30k).
          // Små butikker exit'er tidligt via fullyScannedStore-tjekket, så
          // dette koster ikke noget for REMA, Netto, etc.
          pages: 250,
        })
        imported = result?.totalImported ?? 0
      } catch (err) {
        // Vi har set tilfælde hvor `err` ikke er en Error-instans (fx
        // string-throws fra Promise.all eller AggregateError). Saml så meget
        // info som muligt så vi kan diagnosticere uden at gætte.
        const anyErr = err as any
        const parts: string[] = []
        if (anyErr?.name) parts.push(`${anyErr.name}`)
        if (anyErr?.message) parts.push(`${anyErr.message}`)
        if (typeof err === 'string') parts.push(err)
        if (anyErr?.cause?.message) parts.push(`cause: ${anyErr.cause.message}`)
        if (Array.isArray(anyErr?.errors)) {
          // AggregateError fra Promise.any/Promise.allSettled
          parts.push(
            'errors: ' +
              anyErr.errors
                .map((e: any) => e?.message || String(e))
                .filter(Boolean)
                .join(' | '),
          )
        }
        const fallback = parts.length > 0 ? parts.join(' — ') : (() => {
          try {
            return JSON.stringify(err)
          } catch {
            return String(err)
          }
        })()
        importError = fallback || 'Ukendt importfejl'
        console.error('❌ Goma import fejlede i scheduled-sync:', err)
        if (anyErr?.stack) console.error('stack:', anyErr.stack)
      }
    }

    // Always run expired-offer cleanup, even on days with no scheduled imports
    // and even if the import itself failed. This ensures udløbne tilbud
    // forsvinder hver gang cron'en kalder os.
    let cleanupResult: Awaited<ReturnType<typeof cleanupExpiredOffers>> | null = null
    let cleanupError: string | null = null
    try {
      cleanupResult = await cleanupExpiredOffers()
      console.log(
        `🧹 Expired-offer cleanup: deaktiverede ${cleanupResult.cleaned} udløbne tilbud (varighed ${cleanupResult.durationMs} ms)`
      )
    } catch (err) {
      cleanupError = err instanceof Error ? err.message : 'Ukendt cleanup-fejl'
      console.error('❌ Expired-offer cleanup fejlede:', err)
    }

    const overallSuccess = !importError && !cleanupError

    // Altid HTTP 200 når vi har kørt sync/cleanup-logikken færdig. Fejl ligger i
    // `success`, `importError` og `cleanupError` — ellers får GitHub Actions
    // `curl --fail` på 500 uden at kunne læse body, og det forveksles ofte med
    // timeout (`--max-time`). Kun uventede exceptions nedenfor giver 500.
    if (!overallSuccess) {
      console.warn('⚠️ scheduled-sync afsluttet med fejl:', { importError, cleanupError, stores })
    }

    return NextResponse.json(
      {
        success: overallSuccess,
        message: overallSuccess
          ? stores.length === 0
            ? 'Ingen butikker planlagt til sync i dag, men cleanup blev kørt'
            : 'Scheduled Goma sync + cleanup gennemført'
          : 'Scheduled Goma sync kørt med fejl (se importError / cleanupError)',
        dayIndex,
        stores,
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
      { status: 200 }
    )
  } catch (error) {
    console.error('❌ Error in scheduled Goma sync:', error)
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error ? error.message : 'Ukendt fejl i scheduled Goma sync'
      },
      { status: 500 }
    )
  }
}
