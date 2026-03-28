import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseClient } from '@/lib/supabase'
import { databaseService } from '@/lib/database-service'

const PRODUCT_DETAILS_CACHE_CONTROL = 'public, s-maxage=1800, stale-while-revalidate=86400'
const PRODUCT_DETAILS_MEMORY_TTL_MS = 5 * 60 * 1000
const PRODUCT_DETAILS_MEMORY_MAX_ITEMS = 500

type ProductDetailsResponse = {
  success: true
  product: any
  similarProducts: any[]
  otherSizeProducts: any[]
}

const productDetailsCache = new Map<
  string,
  { expiresAt: number; payload: ProductDetailsResponse }
>()

function pruneProductDetailsCache() {
  if (productDetailsCache.size <= PRODUCT_DETAILS_MEMORY_MAX_ITEMS) return
  const now = Date.now()
  for (const [key, entry] of productDetailsCache.entries()) {
    if (entry.expiresAt <= now) {
      productDetailsCache.delete(key)
    }
  }
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const supabase = createSupabaseClient()
    const offerId = Number(id)

    if (!offerId || Number.isNaN(offerId)) {
      return NextResponse.json(
        { success: false, message: 'Invalid product id' },
        { status: 400 }
      )
    }

    const cacheKey = String(offerId)
    const cached = productDetailsCache.get(cacheKey)
    if (cached && cached.expiresAt > Date.now()) {
      return NextResponse.json(cached.payload, {
        headers: {
          'Cache-Control': PRODUCT_DETAILS_CACHE_CONTROL,
        },
      })
    }

    // Hent primær offer + tilhørende produkt
    const { data: offer, error } = await supabase
      .from('product_offers')
      .select(
        `
        id,
        product_id,
        store_id,
        store_product_id,
        name_store,
        product_url,
        current_price,
        normal_price,
        currency,
        is_on_sale,
        is_offer_active,
        discount_percentage,
        price_per_unit,
        price_per_kilogram,
        is_available,
        sale_valid_from,
        sale_valid_to,
        updated_at,
        last_seen_at,
        products:product_id (
          id,
          name_generic,
          brand,
          category,
          subcategory,
          department,
          unit,
          amount,
          image_url
        )
      `
      )
      .eq('id', offerId)
      .single()

    if (error || !offer) {
      console.error('Error fetching product offer:', error)
      return NextResponse.json(
        { success: false, message: 'Produkt ikke fundet' },
        { status: 404 }
      )
    }

    // Handle products as array (Supabase foreign table joins return arrays, not single objects)
    const productsArray = Array.isArray(offer.products) ? offer.products : (offer.products ? [offer.products] : [])
    const p: {
      id?: string
      name_generic?: string
      brand?: string
      category?: string
      subcategory?: string
      department?: string
      unit?: string
      amount?: number
      image_url?: string
    } = productsArray[0] || {}

    const price = offer.current_price || 0
    const originalPrice = offer.normal_price || offer.current_price || 0
    const isOnSaleByFlag = !!offer.is_on_sale
    const isOnSaleByPrice = originalPrice > price && originalPrice > 0
    const isOfferDateValid = !offer.sale_valid_to || new Date(offer.sale_valid_to) >= new Date()
    const isOfferActive = offer.is_offer_active === true
      ? true
      : (isOfferDateValid && (isOnSaleByFlag || isOnSaleByPrice))
    const priceDiff = originalPrice - price
    const discountPct =
      isOnSaleByPrice && originalPrice > 0 && priceDiff > 0.01
        ? Math.round((priceDiff / originalPrice) * 100)
        : null

    const storeDisplay = databaseService['mapStoreIdToDisplayName']
      ? // @ts-ignore internal helper
        databaseService['mapStoreIdToDisplayName'](offer.store_id)
      : offer.store_id

    const mainProduct = {
      id: offer.id.toString(),
      external_id: offer.store_product_id,
      name: offer.name_store || p.name_generic,
      description: null,
      category: p.department || p.category || null,
      subcategory: p.subcategory || null,
      price,
      original_price: originalPrice,
      unit: p.unit || 'stk',
      amount: p.amount || null,
      quantity: null,
      unit_price: offer.price_per_unit || offer.price_per_kilogram || null,
      is_on_sale: isOfferActive,
      is_offer_active: isOfferActive,
      sale_end_date: offer.sale_valid_to,
      currency: offer.currency || 'DKK',
      store: storeDisplay,
      store_url: offer.product_url,
      image_url: p.image_url,
      available: offer.is_available,
      temperature_zone: null,
      nutrition_info: null,
      labels: [] as string[],
      last_updated: offer.updated_at || offer.last_seen_at || new Date().toISOString(),
      metadata: {
        product_id: offer.product_id,
        store_id: offer.store_id,
      },
      discount_percentage: discountPct || undefined,
    }

    // Hent andre butikker med samme product_id
    const { data: otherOffersRaw, error: otherError } = await supabase
      .from('product_offers')
      .select(
        `
        id,
        product_id,
        store_id,
        store_product_id,
        name_store,
        product_url,
        current_price,
        normal_price,
        currency,
        is_on_sale,
        is_offer_active,
        discount_percentage,
        price_per_unit,
        price_per_kilogram,
        amount,
        unit,
        is_available,
        sale_valid_from,
        sale_valid_to
      `
      )
      .eq('product_id', offer.product_id)
      .neq('id', offer.id)
      .eq('is_available', true)
      .order('current_price', { ascending: true })

    if (otherError) {
      console.error('Error fetching other offers:', otherError)
    }

    // Del op i samme størrelse vs. andre størrelser
    const sameSizeBestPerStore = new Map<string, any>()
    const otherSizeBestPerStore = new Map<string, any>()

    const normalizeName = (name: string | null | undefined) =>
      (name || '').toLowerCase().replace(/\s+/g, ' ').trim()
    const mainName = normalizeName(mainProduct.name)

    for (const o of otherOffersRaw || []) {
      const key = o.store_id || 'unknown'
      const isSameSize =
        (o.unit || null) === (p.unit || null) &&
        (o.amount || null) === (p.amount || null) &&
        normalizeName(o.name_store) === mainName

      const targetMap = isSameSize ? sameSizeBestPerStore : otherSizeBestPerStore
      const existing = targetMap.get(key)
      if (!existing || (o.current_price || Infinity) < (existing.current_price || Infinity)) {
        targetMap.set(key, o)
      }
    }

    const sameSizeOffers = Array.from(sameSizeBestPerStore.values())
    const otherSizeOffers = Array.from(otherSizeBestPerStore.values())

    const mapOfferToProduct = (o: any): any => {
        const priceO = o.current_price || 0
        const originalO = o.normal_price || o.current_price || 0
        const isOnSaleByFlag = !!o.is_on_sale
        const isOnSaleByPrice = originalO > priceO && originalO > 0
        const isOfferDateValid = !o.sale_valid_to || new Date(o.sale_valid_to) >= new Date()
        const isOfferActive = o.is_offer_active === true
          ? true
          : (isOfferDateValid && (isOnSaleByFlag || isOnSaleByPrice))
        const diffO = originalO - priceO
        const discountO =
          isOnSaleByPrice && originalO > 0 && diffO > 0.01
            ? Math.round((diffO / originalO) * 100)
            : null

        const storeName = databaseService['mapStoreIdToDisplayName']
          ? // @ts-ignore
            databaseService['mapStoreIdToDisplayName'](o.store_id)
          : o.store_id

        return {
          id: o.id.toString(),
          external_id: o.store_product_id,
          name: o.name_store || mainProduct.name,
          description: null,
          category: mainProduct.category,
          subcategory: mainProduct.subcategory,
          price: priceO,
          original_price: originalO,
          unit: mainProduct.unit,
          amount: mainProduct.amount,
          quantity: null,
          unit_price: o.price_per_unit || o.price_per_kilogram || null,
          is_on_sale: isOfferActive,
          is_offer_active: isOfferActive,
          sale_end_date: o.sale_valid_to,
          currency: o.currency || 'DKK',
          store: storeName,
          store_url: o.product_url,
          image_url: mainProduct.image_url,
          available: o.is_available,
          temperature_zone: null,
          nutrition_info: null,
          labels: [] as string[],
          last_updated: mainProduct.last_updated,
          metadata: {
            product_id: o.product_id,
            store_id: o.store_id,
          },
          discount_percentage: discountO || undefined,
        }
      }

    const similarProducts = sameSizeOffers.map(mapOfferToProduct)
    const otherSizeProducts = otherSizeOffers.map(mapOfferToProduct)

    const payload: ProductDetailsResponse = {
      success: true,
      product: mainProduct,
      similarProducts,
      otherSizeProducts,
    }

    pruneProductDetailsCache()
    productDetailsCache.set(cacheKey, {
      payload,
      expiresAt: Date.now() + PRODUCT_DETAILS_MEMORY_TTL_MS,
    })

    return NextResponse.json(payload, {
      headers: {
        'Cache-Control': PRODUCT_DETAILS_CACHE_CONTROL,
      },
    })
  } catch (error) {
    console.error('❌ Error in /api/supermarket/product/[id]:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}


