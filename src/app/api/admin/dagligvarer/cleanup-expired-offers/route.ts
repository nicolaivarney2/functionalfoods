import { NextResponse } from 'next/server'
import { cleanupExpiredOffers } from '@/lib/dagligvarer-offer-cleanup'
import { GOMA_SUNSET_MESSAGE, isGomaImportEnabled } from '@/lib/goma-sunset'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function POST() {
  if (!isGomaImportEnabled()) {
    return NextResponse.json(
      { success: false, sunset: true, error: GOMA_SUNSET_MESSAGE },
      { status: 410 },
    )
  }

  try {
    const result = await cleanupExpiredOffers()

    console.log(
      `🧹 Cleanup expired offers: deaktiverede ${result.cleaned}/${result.totalFound} udløbne tilbud i ${result.durationMs} ms`
    )

    return NextResponse.json({
      success: true,
      message:
        result.cleaned === 0
          ? 'Ingen udløbne tilbud fundet'
          : `Ryddet op i ${result.cleaned} udløbne tilbud`,
      cleaned: result.cleaned,
      totalFound: result.totalFound,
      byStore: result.byStore,
      durationMs: result.durationMs,
      sample: result.sample,
    })
  } catch (error) {
    console.error('❌ Error in cleanup expired offers:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
