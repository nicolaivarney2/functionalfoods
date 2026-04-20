import { NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const revalidate = 0

function mapStoreIdToDisplayName(storeId: string | null): string {
  if (!storeId) return 'Ukendt butik'
  const id = storeId.toLowerCase()
  switch (id) {
    case 'netto':
      return 'Netto'
    case 'rema-1000':
    case 'rema':
      return 'REMA 1000'
    case '365discount':
    case '365-discount':
      return '365 Discount'
    case 'lidl':
      return 'Lidl'
    case 'bilka':
      return 'Bilka'
    case 'nemlig':
      return 'Nemlig'
    case 'menu':
    case 'meny':
      return 'MENY'
    case 'spar':
      return 'Spar'
    case 'kvickly':
      return 'Kvickly'
    case 'superbrugsen':
    case 'super-brugsen':
      return 'Super Brugsen'
    case 'brugsen':
      return 'Brugsen'
    case 'løvbjerg':
      return 'Løvbjerg'
    case 'abc-lavpris':
      return 'ABC Lavpris'
    default:
      return storeId
  }
}

export async function GET() {
  try {
    const supabase = createSupabaseServiceClient()

    const { data: queueRows, error: qErr } = await supabase
      .from('product_ingredient_match_queue')
      .select(
        `
        id,
        product_id,
        store_product_id,
        store_id,
        product_name_snapshot,
        queued_at,
        products:product_id (
          name_generic,
          brand,
          category
        )
      `,
      )
      .eq('status', 'pending')
      .order('queued_at', { ascending: true })

    if (qErr) {
      if (qErr.code === '42P01' || qErr.message?.includes('does not exist')) {
        return NextResponse.json({
          success: true,
          message: 'Queue table not installed',
          data: { items: [], queueTableMissing: true },
        })
      }
      throw qErr
    }

    const rows = queueRows || []
    const extIds = [...new Set(rows.map((r: { store_product_id: string }) => r.store_product_id))]
    const offerByExt = new Map<
      string,
      { current_price: number | null; normal_price: number | null; name_store: string | null }
    >()

    for (let i = 0; i < extIds.length; i += 150) {
      const chunk = extIds.slice(i, i + 150)
      const { data: offers } = await supabase
        .from('product_offers')
        .select('store_product_id, current_price, normal_price, name_store')
        .in('store_product_id', chunk)
      offers?.forEach((o: any) => {
        if (o.store_product_id && !offerByExt.has(o.store_product_id)) {
          offerByExt.set(o.store_product_id, {
            current_price: o.current_price,
            normal_price: o.normal_price,
            name_store: o.name_store,
          })
        }
      })
    }

    const items = rows.map((r: any) => {
      const p = Array.isArray(r.products) ? r.products[0] : r.products
      const offer = offerByExt.get(r.store_product_id)
      return {
        id: r.id,
        product_id: r.product_id,
        store_product_id: r.store_product_id,
        store_id: r.store_id,
        store_label: mapStoreIdToDisplayName(r.store_id),
        product_name_snapshot: r.product_name_snapshot,
        name_generic: p?.name_generic ?? r.product_name_snapshot,
        brand: p?.brand ?? null,
        category: p?.category ?? null,
        queued_at: r.queued_at,
        current_price: offer?.current_price ?? null,
        normal_price: offer?.normal_price ?? null,
        name_store: offer?.name_store ?? null,
      }
    })

    return NextResponse.json({
      success: true,
      data: { items, count: items.length, queueTableMissing: false },
    })
  } catch (error) {
    console.error('❌ product-match-queue GET:', error)
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
