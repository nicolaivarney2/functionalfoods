import { NextRequest, NextResponse } from 'next/server'
import { getGroceryServiceClient } from '@/grocery/db/client'
import { getCopenhagenWeekday } from '@/lib/grocery/sync-schedule'
import { runWeeklyCuration } from '@/lib/fooddata-curation/weekly-run'
import { CURATION_WEEKDAY_LABEL } from '@/lib/fooddata-curation/rules'
import { createSupabaseServiceClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

/** 3 = onsdag i Europe/Copenhagen (matcher CURATION_WEEKDAY.ff). */
const FF_CURATION_WEEKDAY = 3

function isAuthorized(req: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET
  const provided = req.headers.get('x-cron-secret')
  return Boolean(cronSecret && provided === cronSecret)
}

export async function POST(req: NextRequest) {
  try {
    if (!isAuthorized(req)) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized cron call' },
        { status: 401 },
      )
    }

    const force = req.nextUrl.searchParams.get('force') === 'true'
    const dryRun = req.nextUrl.searchParams.get('dryRun') === 'true'
    const weekday = getCopenhagenWeekday()

    if (!force && weekday !== FF_CURATION_WEEKDAY) {
      return NextResponse.json({
        success: true,
        skipped: true,
        message: `Ikke kurationsdag for FF (${CURATION_WEEKDAY_LABEL.ff}) — brug ?force=true ved manuel kørsel.`,
        weekday,
        expectedWeekday: FF_CURATION_WEEKDAY,
      })
    }

    const local = createSupabaseServiceClient()
    const fooddata = getGroceryServiceClient()
    const result = await runWeeklyCuration({ local, fooddata, dryRun })

    return NextResponse.json({
      success: true,
      skipped: false,
      dryRun,
      weekday,
      label: CURATION_WEEKDAY_LABEL.ff,
      pull: result.pull,
      reconcile: result.reconcile,
      stats: result.stats,
    })
  } catch (error) {
    console.error('❌ fooddata weekly-curation failed:', error)
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error ? error.message : 'Ukendt fejl i weekly-curation',
      },
      { status: 500 },
    )
  }
}
