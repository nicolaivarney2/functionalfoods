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
    const ingredientId = body?.ingredient_id as string | undefined

    if (!queueId || !ingredientId) {
      return NextResponse.json(
        { success: false, message: 'queue_id og ingredient_id kræves' },
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

    if (existingForProduct && existingForProduct.length > 0) {
      const sameIngredient = existingForProduct.some((m) => m.ingredient_id === ingredientId)
      if (sameIngredient) {
        await supabase
          .from('product_ingredient_match_queue')
          .update({ status: 'matched', resolved_at: new Date().toISOString() })
          .eq('id', queueId)
          .eq('status', 'pending')
        return NextResponse.json({
          success: true,
          message: 'Match fandtes allerede — kø ryddet',
          data: { alreadyHadMatch: true },
        })
      }
      return NextResponse.json(
        { success: false, message: 'Dette produkt er allerede matchet til en anden ingrediens' },
        { status: 409 },
      )
    }

    const { data: ingredient, error: ingErr } = await supabase
      .from('ingredients')
      .select('id, name')
      .eq('id', ingredientId)
      .maybeSingle()

    if (ingErr || !ingredient) {
      return NextResponse.json({ success: false, message: 'Ingrediens ikke fundet' }, { status: 404 })
    }

    const snapshot = await resolveProductMatchSnapshot(supabase, product_external_id, {
      name: row.product_name_snapshot ?? undefined,
      store: mapStoreIdToDisplayName(row.store_id),
    })

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

    const now = new Date().toISOString()
    await supabase
      .from('product_ingredient_match_queue')
      .update({ status: 'matched', resolved_at: now })
      .eq('id', queueId)
      .eq('status', 'pending')

    const fooddataSync = await runFooddataPublish('queue-match', async (client) => {
      await upsertMatchInFooddata(client, {
        ingredient_id: ingredientId,
        product_external_id,
        confidence: matchRow.confidence,
        match_type: matchRow.match_type,
        is_manual: matchRow.is_manual,
        product_name_snapshot: matchRow.product_name_snapshot,
        product_store_snapshot: matchRow.product_store_snapshot,
        last_known_price: matchRow.last_known_price,
        created_at: matchRow.created_at,
        updated_at: matchRow.updated_at,
      })
      await upsertQueueRowInFooddata(client, {
        product_id: row.product_id,
        store_product_id: row.store_product_id,
        store_id: row.store_id,
        product_name_snapshot: row.product_name_snapshot,
        status: 'matched',
        resolved_at: now,
      })
    })

    return NextResponse.json({
      success: true,
      message: 'Match oprettet',
      data: { match: matchRow },
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
