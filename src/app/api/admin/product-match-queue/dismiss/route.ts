import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@/lib/supabase'
import { runFooddataPublish, upsertQueueRowInFooddata } from '@/lib/fooddata-publish'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const queueId = body?.queue_id as string | undefined
    if (!queueId) {
      return NextResponse.json({ success: false, message: 'queue_id required' }, { status: 400 })
    }

    const supabase = createSupabaseServiceClient()
    const now = new Date().toISOString()

    const { data, error } = await supabase
      .from('product_ingredient_match_queue')
      .update({ status: 'dismissed', resolved_at: now })
      .eq('id', queueId)
      .eq('status', 'pending')
      .select('product_id, store_product_id, store_id, product_name_snapshot, queued_at')
      .maybeSingle()

    if (error) throw error
    if (!data) {
      return NextResponse.json(
        { success: false, message: 'Kø-element ikke fundet eller allerede behandlet' },
        { status: 404 },
      )
    }

    const fooddataSync = await runFooddataPublish('queue-dismiss', (client) =>
      upsertQueueRowInFooddata(client, {
        product_id: data.product_id,
        store_product_id: data.store_product_id,
        store_id: data.store_id,
        product_name_snapshot: data.product_name_snapshot,
        status: 'dismissed',
        queued_at: data.queued_at,
        resolved_at: now,
      })
    )

    return NextResponse.json({ success: true, message: 'Afviset', fooddataSync })
  } catch (error) {
    console.error('❌ product-match-queue dismiss:', error)
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    )
  }
}
