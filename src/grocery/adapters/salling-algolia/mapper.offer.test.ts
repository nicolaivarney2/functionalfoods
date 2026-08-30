import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { mapHitToChainOffer } from './mapper'
import type { SallingAlgoliaHit } from './types'

function hit(overrides: Partial<SallingAlgoliaHit> = {}): SallingAlgoliaHit {
  return {
    objectID: '72675001-EA',
    id: 1,
    article: '72675001-EA',
    gtin: null,
    name: 'Yoghurt m. jordbær',
    description: '',
    manufacturer: '',
    ageCode: 0,
    productType: '',
    units: 70,
    unitsOfMeasure: 'g',
    unitOfMeasurePriceUnits: 'kg',
    images: [],
    categories: {},
    consumerFacingHierarchy: {},
    hierarchy_node: '',
    properties: {},
    infos: [],
    storeData: {
      '7701': {
        inStock: true,
        multipromo: 0,
        offerDescription: '',
        price: 300,
        beforePrice: 795,
        multiPromoPrice: 0,
        unitsOfMeasurePrice: 11357,
        unitsOfMeasurePriceUnit: 'kg',
        unitsOfMeasureOfferPrice: 4286,
        unitsOfMeasureShowPrice: 4286,
      },
    },
    isInCurrentLeaflet: false,
    isInOffer: [],
    targetOffer: 0,
    cpOffer: false,
    cpOfferFromDate: '2026-08-29',
    cpOfferToDate: '2026-09-04',
    cpOfferTitle: 'Tilbud',
    cpOfferPrice: 300,
    cpOfferAmount: 1,
    cpDiscount: 495,
    cpPercentDiscount: 62,
    cpOriginalPrice: 795,
    cpOfferId: 0,
    ...overrides,
  }
}

describe('mapHitToChainOffer Salling tilbud', () => {
  it('slår tilbud fra når varen er ude af avisen — også med gammel førpris', () => {
    const offer = mapHitToChainOffer('netto', hit(), 'prod-1')
    assert.equal(offer?.is_on_sale, false)
    assert.equal(offer?.before_price_cents, null)
    assert.equal(offer?.offer_until, null)
    assert.equal(offer?.price_cents, 300)
  })

  it('bevarer tilbud når varen er i den aktuelle avis', () => {
    const offer = mapHitToChainOffer(
      'netto',
      hit({ isInCurrentLeaflet: true }),
      'prod-1',
    )
    assert.equal(offer?.is_on_sale, true)
    assert.equal(offer?.before_price_cents, 795)
    assert.equal(offer?.price_cents, 300)
  })
})
