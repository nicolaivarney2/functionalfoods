import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { mapRemaOffer, pickCurrentPrice, resolveRemaOfferPricing } from './mapper'
import type { RemaPrice, RemaProduct } from './types'

const NOW = Date.parse('2026-09-01T12:00:00+00:00')

function price(overrides: Partial<RemaPrice> = {}): RemaPrice {
  return {
    price: 10,
    price_over_max_quantity: null,
    max_quantity: null,
    is_advertised: false,
    is_campaign: false,
    starting_at: '2026-01-08T00:00:00+00:00',
    ending_at: '2099-12-31T00:00:00+00:00',
    deposit: null,
    compare_unit: 'stk',
    compare_unit_price: 10,
    consumption_unit: null,
    consumption_quantity: null,
    ...overrides,
  }
}

function product(prices: RemaPrice[]): RemaProduct {
  return {
    id: 306600,
    name: 'PORRER',
    underline: '1 STK. / DANMARK KL.1',
    age_limit: null,
    hazard_precaution_statements: [],
    labels: [],
    description: null,
    info: '',
    images: [],
    prices,
    temperature_zone: null,
    is_self_scale_item: false,
    is_weight_item: false,
    is_available_in_all_stores: true,
    is_batch_item: false,
  }
}

describe('REMA prisvindue vs tilbudsavis', () => {
  it('vælger aktuel kampagne og gemmer kommende normalpris som førpris', () => {
    const prices = [
      price({
        price: 4,
        compare_unit_price: 4,
        is_advertised: true,
        is_campaign: true,
        starting_at: '2026-08-30T00:00:00+00:00',
        ending_at: '2026-09-05T00:00:00+00:00',
      }),
      price({
        price: 6.5,
        compare_unit_price: 6.5,
        starting_at: '2026-09-06T00:00:00+00:00',
      }),
    ]
    const pricing = resolveRemaOfferPricing(prices, NOW)
    assert.equal(pricing?.priceCents, 400)
    assert.equal(pricing?.beforePriceCents, 650)
    assert.equal(pricing?.isOnSale, true)

    const offer = mapRemaOffer(product(prices), 'prod-1', NOW)
    assert.equal(offer?.price_cents, 400)
    assert.equal(offer?.before_price_cents, 650)
    assert.equal(offer?.is_on_sale, true)
    assert.equal(offer?.offer_until, '2026-09-05T00:00:00+00:00')
  })

  it('markerer avis-partivare som tilbud selv uden is_campaign/førpris', () => {
    const prices = [
      price({
        price: 79.95,
        compare_unit: 'kg',
        compare_unit_price: 159.9,
        is_advertised: true,
        is_campaign: false,
        starting_at: '2026-08-30T00:00:00+00:00',
        ending_at: '2099-12-31T00:00:00+00:00',
      }),
    ]
    const offer = mapRemaOffer(
      { ...product(prices), name: 'OKSESPIDSBRYST', underline: '0.5 KG. / FRILAND', is_weight_item: true },
      'prod-2',
      NOW,
    )
    assert.equal(offer?.price_cents, 7995)
    assert.equal(offer?.before_price_cents, null)
    assert.equal(offer?.is_on_sale, true)
    assert.equal(offer?.offer_until, null)
    assert.equal(offer?.unit_price_cents, 15990)
  })

  it('vælger ikke udløbet kampagne efter ending_at', () => {
    const prices = [
      price({
        price: 4,
        is_campaign: true,
        is_advertised: true,
        starting_at: '2026-08-30T00:00:00+00:00',
        ending_at: '2026-09-05T00:00:00+00:00',
      }),
      price({
        price: 6.5,
        starting_at: '2026-09-06T00:00:00+00:00',
      }),
    ]
    const after = Date.parse('2026-09-05T12:00:00+00:00')
    const current = pickCurrentPrice(prices, after)
    assert.equal(current?.price, 6.5)
    assert.equal(resolveRemaOfferPricing(prices, after)?.isOnSale, false)
  })

  it('gemmer multibuy-loft (fx Mou max 6) uden at bruge over-max som avispris', () => {
    const prices = [
      price({
        price: 35,
        compare_unit: 'kg',
        compare_unit_price: 50,
        is_advertised: true,
        is_campaign: true,
        max_quantity: 6,
        price_over_max_quantity: 55.11,
        starting_at: '2026-08-30T00:00:00+00:00',
        ending_at: '2026-09-05T00:00:00+00:00',
      }),
      price({
        price: 55.11,
        compare_unit: 'kg',
        compare_unit_price: 78.73,
        starting_at: '2026-09-06T00:00:00+00:00',
      }),
    ]
    const offer = mapRemaOffer(product(prices), 'prod-3', NOW)
    assert.equal(offer?.price_cents, 3500)
    assert.equal(offer?.before_price_cents, 5511)
    assert.match(offer?.multibuy ?? '', /Maks 6 stk/)
  })
})
