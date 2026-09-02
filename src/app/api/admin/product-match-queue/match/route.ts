import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@/lib/supabase'
import { resolveProductMatchSnapshot } from '@/lib/product-match-snapshots'
import { mapStoreIdToDisplayName } from '@/lib/fooddata-stores'
import {
  runFooddataPublish,
  upsertMatchInFooddata,
  upsertQueueRowInFooddata,
} from '@/lib/fooddata-publish'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const queueId = body?.queue_id as string | undefined
    const complete = body?.complete !== false
    const ingredientIds = [
      ...new Set(
        [
          body?.ingredient_id as string | undefined,
          ...((Array.isArray(body?.ingredient_ids) ? body.ingredient_ids : []) as unknown[]),
        ]
          .map((id) => String(id ?? '').trim())
          .filter(Boolean),
      ),
    ]

    if (!queueId) {
      return NextResponse.json(
        { success: false, message: 'queue_id kræves' },
        { status: 400 },
      )
    }
    if (ingredientIds.length === 0 && !complete) {
      return NextResponse.json(
        { success: false, message: 'ingredient_id eller ingredient_ids kræves' },
        { status: 400 },
      )
    }

    const supabase = createSupabaseServiceClient()

    const { data: row, error: qErr } = await supabase
      .from('product_ingredient_match_queue')
      .select('id, product_id, store_product_id, store_id, product_name_snapshot, status')
      .eq('id', queueId)
      .maybeSingle()

    if (qErr) throw qErr
    if (!row || row.status !== 'pending') {
      return NextResponse.json(
        { success: false, message: 'Kø-element ikke fundet eller allerede behandlet' },
        { status: 404 },
      )
    }

    const product_external_id = row.product_id || row.store_product_id

    const { data: existingForProduct } = await supabase
      .from('product_ingredient_matches')
      .select('id, ingredient_id')
      .eq('product_external_id', product_external_id)

    const already = new Set((existingForProduct ?? []).map((m) => String(m.ingredient_id)))
    const toInsert = ingredientIds.filter((id) => !already.has(id))

    const { data: ingredients, error: ingErr } = toInsert.length
      ? await supabase.from('ingredients').select('id, name').in('id', toInsert)
      : { data: [] as Array<{ id: string; name: string }>, error: null }

    if (ingErr) throw ingErr
    if (toInsert.length > 0 && (ingredients ?? []).length !== toInsert.length) {
      return NextResponse.json({ success: false, message: 'Ingrediens ikke fundet' }, { status: 404 })
    }

    const snapshot = await resolveProductMatchSnapshot(supabase, product_external_id, {
      name: row.product_name_snapshot ?? undefined,
      store: mapStoreIdToDisplayName(row.store_id),
    })

    const inserted: Array<Record<string, unknown>> = []
    for (const ingredientId of toInsert) {
      const { data: matchRow, error: insErr } = await supabase
        .from('product_ingredient_matches')
        .insert({
          ingredient_id: ingredientId,
          product_external_id,
          confidence: 100,
          match_type: 'manual',
          is_manual: true,
          ...snapshot,
        })
        .select()
        .single()

      if (insErr) {
        console.error('❌ match queue insert match:', insErr)
        return NextResponse.json(
          { success: false, message: insErr.message || 'Kunne ikke oprette match' },
          { status: 400 },
        )
      }
      inserted.push(matchRow)
    }

    const now = new Date().toISOString()
    if (complete) {
      await supabase
        .from('product_ingredient_match_queue')
        .update({ status: 'matched', resolved_at: now })
        .eq('id', queueId)
        .eq('status', 'pending')
    }

    const fooddataSync = await runFooddataPublish('queue-match', async (client) => {
      for (const matchRow of inserted) {
        await upsertMatchInFooddata(client, {
          ingredient_id: String(matchRow.ingredient_id),
          product_external_id,
          confidence: matchRow.confidence as number,
          match_type: String(matchRow.match_type),
          is_manual: Boolean(matchRow.is_manual),
          product_name_snapshot: matchRow.product_name_snapshot as string | null,
          product_store_snapshot: matchRow.product_store_snapshot as string | null,
          last_known_price: matchRow.last_known_price as number | null,
          created_at: matchRow.created_at as string,
          updated_at: matchRow.updated_at as string,
        })
      }
      if (complete) {
        await upsertQueueRowInFooddata(client, {
          product_id: row.product_id,
          store_product_id: row.store_product_id,
          store_id: row.store_id,
          product_name_snapshot: row.product_name_snapshot,
          status: 'matched',
          resolved_at: now,
        })
      }
    })

    return NextResponse.json({
      success: true,
      message: complete ? 'Match oprettet' : 'Ingrediens tilføjet',
      data: { matches: inserted, alreadyHadMatch: toInsert.length === 0 },
      fooddataSync,
    })
  } catch (error) {
    console.error('❌ product-match-queue match:', error)
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    )
  }
}
