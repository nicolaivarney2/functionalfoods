import { NextRequest, NextResponse } from 'next/server'
import { importGomaProducts } from '@/lib/goma-import'

export const dynamic = 'force-dynamic'
export const revalidate = 0

type GomaStoreId =
  | 'Netto'
  | 'REMA 1000'
  | '365discount'
  | 'Lidl'
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
      // Føtex er ikke tilgængelig via Goma, så vi udelader den
      stores = ['MENY', 'Spar', 'Kvickly', 'superbrugsen', 'Løvbjerg']
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

    if (stores.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No Goma stores scheduled for sync today',
        dayIndex,
        stores
      })
    }

    // Hent alle produkter for de planlagte butikker.
    // Vi bruger moderat limit og høj pages-værdi – importGomaProducts stopper selv,
    // når en side returnerer 0 produkter, så vi ender reelt med "alle produkter pr. butik".
    // Bemærk: Hvis en butik har meget store kataloger, kan dette nærme sig Vercels timeoutgrænse.
    const result = await importGomaProducts({
      stores,
      limit: 150,
      pages: 40 // 40 * 150 = 6000+ potentielle produkter pr. butik
    })

    return NextResponse.json({
      success: true,
      message: 'Scheduled Goma sync completed',
      dayIndex,
      stores,
      imported: result?.totalImported ?? null
    })
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


