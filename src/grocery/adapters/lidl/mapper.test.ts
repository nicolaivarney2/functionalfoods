import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { shouldImportFooddataOfferSource } from '@/lib/goma-import-stores'
import { parseFlyerRefs, parseLidlProductPage } from './client'
import {
  copenhagenMidnightIso,
  isLidlFoodProduct,
  lidlOfferWindow,
  mapLidlAvisOffer,
  mapLidlAvisProduct,
  parseLidlBasePrice,
  parseLidlPackaging,
} from './mapper'
import { isFlyerActiveOn, pickActiveAvisItems } from './sync'
import type { LidlAvisItem, LidlFlyer, LidlFlyerProduct, LidlProductDetails } from './types'

const SYNCED = '2026-09-30T02:00:00.000Z'

function flyerProduct(overrides: Partial<LidlFlyerProduct> = {}): LidlFlyerProduct {
  return {
    productId: '11029947',
    title: 'Pærer',
    price: '20',
    wonCategoryPrimary: 'Verdener i nød/Mad og mad i nærheden/Frugt og grøntsager/Frugt',
    wonCategoryPrimaryPath: '0/17/1710/171010',
    canonicalUrl: '/p/paerer/p11029947',
    url: 'https://www.lidl.dk/p/p11029947',
    description: 'Klasse 1.',
    ...overrides,
  }
}

function details(overrides: Partial<LidlProductDetails> = {}): LidlProductDetails {
  return {
    eans: ['20546052'],
    alcoholic: false,
    brand: null,
    price: 20,
    lidlPlusPrice: null,
    requiresLidlPlus: false,
    packaging: '1,5 kg',
    basePrice: 'Pr. kg 13,33',
    deletedPrice: null,
    discountText: null,
    percentageDiscount: null,
    startDate: '2026-09-23T17:49:08.017Z',
    endDateExclusive: '2026-10-03T22:00Z',
    ...overrides,
  }
}

function item(
  product: Partial<LidlFlyerProduct> = {},
  productDetails: LidlProductDetails | null = details(),
): LidlAvisItem {
  return {
    flyer: {
      id: 'flyer-1',
      name: 'Fra søndag 27.9 til 03.10.',
      title: 'Lidl avis',
      offerStartDate: '2026-09-27',
      offerEndDate: '2026-10-03',
      slug: 'd-27-03-okt',
      url: 'https://www.lidl.dk/l/da/tilbudsavis/d-27-03-okt/ar/0',
    },
    product: flyerProduct(product),
    details: productDetails,
  }
}

describe('parseLidlPackaging', () => {
  it('parses weights, multipacks, pieces and ranges', () => {
    assert.deepEqual(parseLidlPackaging('1,5 kg'), { amount: 1.5, unit: 'kg' })
    assert.deepEqual(parseLidlPackaging('12 x 100 g'), { amount: 1200, unit: 'g' })
    assert.deepEqual(parseLidlPackaging('3 stk.'), { amount: 3, unit: 'stk' })
    assert.deepEqual(parseLidlPackaging('Stk.'), { amount: 1, unit: 'stk' })
    assert.deepEqual(parseLidlPackaging('1,5 l'), { amount: 1.5, unit: 'L' })
    assert.deepEqual(parseLidlPackaging('340-438 g'), { amount: 340, unit: 'g' })
    assert.deepEqual(parseLidlPackaging(null), { amount: null, unit: null })
    assert.deepEqual(parseLidlPackaging('Pr. pakke'), { amount: null, unit: null })
  })
})

describe('parseLidlBasePrice', () => {
  it('parses Lidl unit prices', () => {
    assert.deepEqual(parseLidlBasePrice('Pr. kg 13,33'), { cents: 1333, unit: 'kg' })
    assert.deepEqual(parseLidlBasePrice('Pr. stk. 4,00'), { cents: 400, unit: 'stk' })
    assert.deepEqual(parseLidlBasePrice('Pr. l 10,00'), { cents: 1000, unit: 'L' })
    assert.deepEqual(parseLidlBasePrice(undefined), { cents: null, unit: null })
  })
})

describe('isLidlFoodProduct', () => {
  it('keeps food and drops household, drogeri, alcohol and non-food', () => {
    assert.equal(isLidlFoodProduct(flyerProduct(), details()), true)
    assert.equal(
      isLidlFoodProduct(
        flyerProduct({
          wonCategoryPrimary: 'Verdener i nød/Mad og mad i nærheden/Husholdning/Toiletpapir',
          wonCategoryPrimaryPath: '0/17/1747/174710',
        }),
        null,
      ),
      false,
    )
    assert.equal(
      isLidlFoodProduct(
        flyerProduct({
          wonCategoryPrimary: 'Verdener i nød/Mad og mad i nærheden/Drogeri & pleje/Shampoo',
          wonCategoryPrimaryPath: '0/17/1745/174510',
        }),
        null,
      ),
      false,
    )
    assert.equal(
      isLidlFoodProduct(
        flyerProduct({
          wonCategoryPrimary: 'Verdener i nød/Vin, øl og spiritus/Vin',
          wonCategoryPrimaryPath: '0/10/1010',
        }),
        null,
      ),
      false,
    )
    assert.equal(isLidlFoodProduct(flyerProduct(), details({ alcoholic: true })), false)
    assert.equal(
      isLidlFoodProduct(
        flyerProduct({
          wonCategoryPrimary: 'Verdener i nød/Baby, barn og legetøj/Legetøj',
          wonCategoryPrimaryPath: '0/16/1610',
        }),
        null,
      ),
      false,
    )
  })
})

describe('offer window', () => {
  it('uses Copenhagen midnight across DST', () => {
    assert.equal(copenhagenMidnightIso('2026-09-27'), '2026-09-26T22:00:00.000Z')
    assert.equal(copenhagenMidnightIso('2026-11-01'), '2026-10-31T23:00:00.000Z')
  })

  it('runs from flyer start to the end of the last day', () => {
    assert.deepEqual(lidlOfferWindow(item()), {
      from: '2026-09-26T22:00:00.000Z',
      until: '2026-10-03T22:00:00.000Z',
    })
    assert.deepEqual(lidlOfferWindow(item({}, null)), {
      from: '2026-09-26T22:00:00.000Z',
      until: '2026-10-03T22:00:00.000Z',
    })
  })
})

describe('mapLidlAvisProduct', () => {
  it('maps to an FF food department and keeps Goma rows separate', () => {
    const row = mapLidlAvisProduct(item(), SYNCED)
    assert.equal(row.source_chain, 'lidl')
    assert.equal(row.source_id, 'avis-11029947')
    assert.equal(row.gtin, '20546052')
    assert.equal(row.category_lvl0, 'Frugt & grønt')
    assert.equal(row.category_lvl1, 'Frugt og grøntsager')
    assert.equal(row.category_lvl2, 'Frugt')
    assert.equal(row.amount, 1.5)
    assert.equal(row.unit, 'kg')
    assert.equal(row.last_seen_at, SYNCED)
  })
})

describe('mapLidlAvisOffer', () => {
  it('maps a plain avis offer', () => {
    const offer = mapLidlAvisOffer(item(), 'uuid-1', SYNCED)!
    assert.equal(offer.store_id, 'lidl')
    assert.equal(offer.source, 'lidl-avis')
    assert.equal(offer.price_cents, 2000)
    assert.equal(offer.before_price_cents, null)
    assert.equal(offer.unit_price_cents, 1333)
    assert.equal(offer.unit_price_unit, 'kg')
    assert.equal(offer.is_on_sale, true)
    assert.equal(offer.in_stock, true)
    assert.equal(offer.offer_from, '2026-09-26T22:00:00.000Z')
    assert.equal(offer.offer_until, '2026-10-03T22:00:00.000Z')
    assert.equal(offer.offer_description, null)
  })

  it('keeps a proven before price and discount', () => {
    const offer = mapLidlAvisOffer(
      item(
        { price: '59.95' },
        details({ price: 59.95, deletedPrice: 78.95, percentageDiscount: 24, discountText: '-24 %' }),
      ),
      'uuid',
      SYNCED,
    )!
    assert.equal(offer.price_cents, 5995)
    assert.equal(offer.before_price_cents, 7895)
    assert.equal(offer.discount_percentage, 24)
    assert.equal(offer.offer_description, null)
  })

  it('uses the price everyone pays and notes the Lidl Plus price', () => {
    const offer = mapLidlAvisOffer(
      item({ price: '29' }, details({ price: 35, lidlPlusPrice: 29, discountText: '0' })),
      'uuid',
      SYNCED,
    )!
    assert.equal(offer.price_cents, 3500)
    assert.equal(offer.offer_description, 'Lidl Plus: 29,00 kr')
  })

  it('flags Lidl Plus-only prices', () => {
    const offer = mapLidlAvisOffer(
      item(
        { price: '39' },
        details({ price: 39, requiresLidlPlus: true, deletedPrice: 49.95, discountText: 'Kuponpris' }),
      ),
      'uuid',
      SYNCED,
    )!
    assert.equal(offer.price_cents, 3900)
    assert.equal(offer.before_price_cents, 4995)
    assert.equal(offer.offer_description, 'Kræver Lidl Plus')
  })

  it('formats multibuy', () => {
    const offer = mapLidlAvisOffer(
      item({ price: '10' }, details({ price: 10, discountText: "Ta' 5 for" })),
      'uuid',
      SYNCED,
    )!
    assert.equal(offer.multibuy, "Ta' 5 for 10,00 kr")
    const backtick = mapLidlAvisOffer(
      item({ price: '20' }, details({ price: 20, discountText: 'Ta`3 for' })),
      'uuid',
      SYNCED,
    )!
    assert.equal(backtick.multibuy, "Ta'3 for 20,00 kr")
  })

  it('falls back to the flyer price and skips items without a price', () => {
    assert.equal(mapLidlAvisOffer(item({ price: '12' }, null), 'uuid', SYNCED)?.price_cents, 1200)
    assert.equal(
      mapLidlAvisOffer(item({ price: undefined }, details({ price: null })), 'uuid', SYNCED),
      null,
    )
  })
})

describe('flyer selection', () => {
  const flyer = (id: string, start: string, end: string, products: LidlFlyerProduct[]): LidlFlyer => ({
    id,
    name: id,
    title: 'Lidl avis',
    offerStartDate: start,
    offerEndDate: end,
    products: Object.fromEntries(products.map((p) => [p.productId, p])),
  })
  const ref = (slug: string) => ({ slug, regionId: '0', url: `https://www.lidl.dk/l/da/tilbudsavis/${slug}/ar/0` })

  it('only takes flyers active today, newest wins per product', () => {
    assert.equal(isFlyerActiveOn({ offerStartDate: '2026-09-27', offerEndDate: '2026-10-03' }, '2026-10-03'), true)
    assert.equal(isFlyerActiveOn({ offerStartDate: '2026-10-04', offerEndDate: '2026-10-10' }, '2026-10-03'), false)

    const items = pickActiveAvisItems(
      [
        { ref: ref('fast'), flyer: flyer('fast', '2026-05-03', '2026-12-31', [flyerProduct({ productId: '1', price: '30' })]) },
        { ref: ref('uge'), flyer: flyer('uge', '2026-09-27', '2026-10-03', [flyerProduct({ productId: '1', price: '20' }), flyerProduct({ productId: '2' })]) },
        { ref: ref('naeste'), flyer: flyer('naeste', '2026-10-04', '2026-10-10', [flyerProduct({ productId: '3' })]) },
      ],
      '2026-09-30',
    )
    assert.deepEqual(items.map((i) => i.product.productId).sort(), ['1', '2'])
    assert.equal(items.find((i) => i.product.productId === '1')?.product.price, '20')
  })

  it('parses avis links from the overview page', () => {
    const html =
      '<a href="https://www.lidl.dk/l/da/tilbudsavis/d-27-03-okt/ar/0?lf=HHZ">x</a>' +
      '<a href="https://www.lidl.dk/l/da/tilbudsavis/nonfood-kw40/ar/0">y</a>' +
      '<a href="https://www.lidl.dk/l/da/tilbudsavis/d-27-03-okt/ar/0">dup</a>'
    assert.deepEqual(
      parseFlyerRefs(html).map((r) => r.slug),
      ['d-27-03-okt', 'nonfood-kw40'],
    )
  })
})

describe('parseLidlProductPage', () => {
  it('reads regular and Lidl Plus prices from the Nuxt payload', () => {
    const payload = [
      { product: 1 },
      { erpNumber: 2, productId: 3, eans: 4, alcoholic: 6, regionsPrices: 7, price: 18 },
      '11029947',
      11029947,
      [5],
      '20546052',
      false,
      { '1': 8 },
      { currentPrice: 9, currentLidlPlusPrice: 15 },
      ['Reactive', 10],
      { price: 11, packaging: 12, basePrice: 13, endDateExclusive: 14 },
      35,
      { text: 16 },
      { text: 17 },
      '2026-10-03T22:00Z',
      { price: 19 },
      '500 g',
      'Pr. kg 70,00',
      {},
      { price: 20 },
      29,
    ]
    const html = `<script type="application/json" id="__NUXT_DATA__" data-ssr="true">${JSON.stringify(payload)}</script>`
    const parsed = parseLidlProductPage(html, '11029947')!
    assert.deepEqual(parsed.eans, ['20546052'])
    assert.equal(parsed.alcoholic, false)
    assert.equal(parsed.price, 35)
    assert.equal(parsed.lidlPlusPrice, 29)
    assert.equal(parsed.requiresLidlPlus, false)
    assert.equal(parsed.packaging, '500 g')
    assert.equal(parsed.basePrice, 'Pr. kg 70,00')
    assert.equal(parsed.endDateExclusive, '2026-10-03T22:00Z')
  })
})

describe('fooddata → FF import', () => {
  it('imports Lidl avis offers with Goma off, but still not Goma', () => {
    assert.equal(shouldImportFooddataOfferSource('lidl', 'lidl-avis', false), true)
    assert.equal(shouldImportFooddataOfferSource('lidl', 'lidl-avis', true), true)
    assert.equal(shouldImportFooddataOfferSource('lidl', 'goma', false), false)
  })
})
