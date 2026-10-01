import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { nemligIdsFromSitemap, nemligCategoryPages, productGroupIdsFromPage } from './client'
import {
  mapNemligOffer,
  mapNemligProduct,
  nemligDepartment,
  nemligUnitPriceUnit,
  parseNemligSize,
  resolveNemligPricing,
} from './mapper'
import { nemligCatalogLooksComplete } from './sync'
import type { NemligCampaign, NemligProduct } from './types'

const NOW = Date.parse('2026-10-01T12:00:00Z')

function campaign(overrides: Partial<NemligCampaign>): NemligCampaign {
  return {
    MinQuantity: 0,
    MaxQuantity: 0,
    TotalPrice: 0,
    VariousPriceProductsCampaign: false,
    CampaignPrice: 0,
    CampaignUnitPrice: null,
    Type: 'ProductCampaignDiscount',
    Code: 'U',
    DiscountSavings: 0,
    IntervalStart: '2026-09-27T22:00:00Z',
    IntervalEnd: '2026-10-04T21:59:59Z',
    ShowCampaignInterval: true,
    ...overrides,
  }
}

function product(overrides: Partial<NemligProduct> = {}): NemligProduct {
  return {
    Id: '5604565',
    Name: 'Solbærmarmelade',
    Brand: 'Den Gamle Fabrik',
    Category: 'Kolonial',
    SubCategory: 'Marmelade',
    Url: 'solbaermarmelade-5604565',
    PrimaryImage: 'https://live.nemligstatic.com/x.png',
    Description: '400 g / Den Gamle Fabrik',
    Price: 16.95,
    UnitPrice: '42,38 kr./Kg.',
    UnitPriceCalc: 42.38,
    UnitPriceLabel: 'kr./Kg.',
    DiscountItem: false,
    Campaign: null,
    Labels: [],
    Availability: { IsAvailableInStock: true, IsDeliveryAvailable: true },
    ProductMainGroupName: 'Tørvarer',
    ProductCategoryGroupName: 'Syltetøj og marmelade',
    ProductSubGroupName: 'Marmelade',
    ...overrides,
  }
}

describe('Nemlig pricing', () => {
  it('regular price is not an offer', () => {
    const p = resolveNemligPricing(product(), NOW)
    assert.equal(p?.priceCents, 1695)
    assert.equal(p?.isOnSale, false)
    assert.equal(p?.unitPriceCents, 4238)
  })

  it('"2 for 32 kr" vs 16,95 is a multibuy offer at the regular unit price', () => {
    const p = resolveNemligPricing(
      product({ Campaign: campaign({ Type: 'ProductCampaignBuyXForY', MinQuantity: 2, TotalPrice: 32, CampaignPrice: 32 }) }),
      NOW,
    )
    assert.equal(p?.isOnSale, true)
    assert.equal(p?.priceCents, 1695)
    assert.equal(p?.beforePriceCents, null)
    assert.equal(p?.multibuy, '2 for 32,00 kr')
    assert.equal(p?.discountPct, 5.6)
  })

  it('mix offer that is not cheaper per unit is not an offer', () => {
    const p = resolveNemligPricing(
      product({ Campaign: campaign({ Type: 'ProductCampaignMixOffer', MinQuantity: 2, TotalPrice: 33.9 }) }),
      NOW,
    )
    assert.equal(p?.isOnSale, false)
    assert.equal(p?.multibuy, null)
  })

  it('discount uses CampaignPrice with the regular price as before-price', () => {
    const p = resolveNemligPricing(
      product({ Price: 75, Campaign: campaign({ CampaignPrice: 60, CampaignUnitPrice: 30, DiscountSavings: 15 }) }),
      NOW,
    )
    assert.equal(p?.priceCents, 6000)
    assert.equal(p?.beforePriceCents, 7500)
    assert.equal(p?.unitPriceCents, 3000)
    assert.equal(p?.discountPct, 20)
  })

  it('percent discount without unit price scales the regular unit price', () => {
    const p = resolveNemligPricing(
      product({
        Price: 20,
        UnitPriceCalc: 50,
        Campaign: campaign({ Type: 'ProductCampaignDiscountPercent', CampaignPrice: 15, CampaignUnitPrice: null }),
      }),
      NOW,
    )
    assert.equal(p?.priceCents, 1500)
    assert.equal(p?.unitPriceCents, 3750)
  })

  it('ignores free-product campaigns, expired and future campaigns', () => {
    for (const c of [
      campaign({ Type: 'ProductCampaignFreeProduct', CampaignPrice: 0 }),
      campaign({ CampaignPrice: 10, IntervalEnd: '2026-09-30T21:59:59Z' }),
      campaign({ CampaignPrice: 10, IntervalStart: '2026-10-04T22:00:00Z' }),
    ]) {
      assert.equal(resolveNemligPricing(product({ Campaign: c }), NOW)?.isOnSale, false)
    }
  })

  it('DiscountItem without a campaign is not an offer', () => {
    assert.equal(resolveNemligPricing(product({ DiscountItem: true }), NOW)?.isOnSale, false)
  })

  it('no price → no offer row', () => {
    assert.equal(resolveNemligPricing(product({ Price: 0 }), NOW), null)
    assert.equal(mapNemligOffer(product({ Price: 0 }), 'uuid', undefined, NOW), null)
  })
})

describe('mapNemligOffer', () => {
  it('maps a live mix offer', () => {
    const o = mapNemligOffer(
      product({
        CampaignAttribute: 'Fast mixtilbud',
        Campaign: campaign({ Type: 'ProductCampaignMixOffer', MinQuantity: 3, TotalPrice: 30, MaxQuantity: 6 }),
      }),
      'uuid-1',
      '2026-10-01T02:00:00Z',
      NOW,
    )
    assert.equal(o?.store_id, 'nemlig')
    assert.equal(o?.source, 'nemlig-api')
    assert.equal(o?.is_on_sale, true)
    assert.equal(o?.multibuy, '3 for 30,00 kr')
    assert.equal(o?.offer_description, 'Fast mixtilbud · Maks 6 stk')
    assert.equal(o?.offer_from, '2026-09-27T22:00:00Z')
    assert.equal(o?.offer_until, '2026-10-04T21:59:59Z')
    assert.equal(o?.unit_price_unit, 'kg')
    assert.equal(o?.in_stock, true)
  })

  it('regular row has no offer window and follows availability', () => {
    const o = mapNemligOffer(
      product({ Availability: { IsAvailableInStock: false, IsDeliveryAvailable: true } }),
      'uuid-1',
      undefined,
      NOW,
    )
    assert.equal(o?.is_on_sale, false)
    assert.equal(o?.offer_from, null)
    assert.equal(o?.offer_until, null)
    assert.equal(o?.offer_description, null)
    assert.equal(o?.in_stock, false)
  })
})

describe('mapNemligProduct', () => {
  it('reuses the Goma key and maps department/categories', () => {
    const p = mapNemligProduct({ product: product(), department: 'Kolonial' }, '2026-10-01T02:00:00Z')
    assert.equal(p.source_chain, 'nemlig')
    assert.equal(p.source_id, 'nemlig-5604565')
    assert.equal(p.gtin, null)
    assert.equal(p.category_lvl0, 'Kolonial')
    assert.equal(p.category_lvl1, 'Syltetøj og marmelade')
    assert.equal(p.category_lvl2, 'Marmelade')
    assert.equal(p.amount, 400)
    assert.equal(p.unit, 'g')
    assert.equal(p.brand, 'Den Gamle Fabrik')
    assert.equal(p.active, true)
    assert.equal(p.last_seen_at, '2026-10-01T02:00:00Z')
  })

  it('maps Nemlig main groups onto the existing department names', () => {
    const dept = (name: string) => nemligDepartment(product({ ProductMainGroupName: name }))
    assert.equal(dept('Drikke'), 'Drikkevarer')
    assert.equal(dept('Vin og spiritus'), 'Drikkevarer')
    assert.equal(dept('Køl'), 'Mejeri og køl')
    assert.equal(dept('Konfekture'), 'Slik og snacks')
    assert.equal(dept('Brød'), 'Brød og kager')
    assert.equal(dept('Pleje'), 'Personlig pleje')
    assert.equal(dept('Nonfood'), 'Husholdning')
    assert.equal(dept('Dyremad og tilbehør'), 'Dyr')
    assert.equal(nemligDepartment(product({ ProductMainGroupName: null }), 'Frost'), 'Frost')
    assert.equal(nemligDepartment(product({ ProductMainGroupName: 'Ydelser' })), 'Diverse')
  })
})

describe('parsers', () => {
  it('parses pack sizes', () => {
    assert.deepEqual(parseNemligSize('200 g / X'), { amount: 200, unit: 'g' })
    assert.deepEqual(parseNemligSize('1,5 l / X'), { amount: 1.5, unit: 'L' })
    assert.deepEqual(parseNemligSize('4 x 33 cl / X'), { amount: 132, unit: 'cl' })
    assert.deepEqual(parseNemligSize('ca. 500 g / X'), { amount: 500, unit: 'g' })
    assert.deepEqual(parseNemligSize('400-500 g / X'), { amount: 400, unit: 'g' })
    assert.deepEqual(parseNemligSize('6 stk. / X'), { amount: 6, unit: 'stk' })
    assert.deepEqual(parseNemligSize('Frankrig / X'), { amount: null, unit: null })
  })

  it('parses unit price labels', () => {
    assert.equal(nemligUnitPriceUnit('kr./Kg.'), 'kg')
    assert.equal(nemligUnitPriceUnit('kr./Ltr.'), 'L')
    assert.equal(nemligUnitPriceUnit('kr./Stk.'), 'stk')
    assert.equal(nemligUnitPriceUnit('kr./Pr. Mtr.'), 'm')
  })

  it('reads product ids from the sitemap', () => {
    const xml = '<url><loc>https://www.nemlig.com/solbaermarmelade-5604565</loc></url><url><loc>https://www.nemlig.com/x-y-100008</loc></url>'
    assert.deepEqual(nemligIdsFromSitemap(xml), ['5604565', '100008'])
  })

  it('collects leaf pages under Dagligvarer and Vin, skipping inspiration', () => {
    const pages = nemligCategoryPages([
      {
        Id: '1',
        Url: '/dagligvarer',
        Text: 'Dagligvarer',
        Children: [
          { Id: '2', Url: '/dagligvarer/frost', Text: 'Frost ', Children: [{ Id: '3', Url: '/dagligvarer/frost/is', Text: 'Is' }] },
          { Id: '4', Url: '/dagligvarer/nye-varer-inspiration', Text: 'Nyt', Children: [{ Id: '5', Url: '/dagligvarer/nye-varer-inspiration/a', Text: 'A' }] },
        ],
      },
      { Id: '6', Url: '/vin', Text: 'Vin og spiritus', Children: [{ Id: '7', Url: '/vin/roedvin', Text: 'Rødvin' }] },
      { Id: '8', Url: '/opskrifter', Text: 'Opskrifter', Children: [{ Id: '9', Url: '/opskrifter/x', Text: 'X' }] },
    ])
    assert.deepEqual(pages, [
      { url: '/dagligvarer/frost/is', department: 'Frost' },
      { url: '/vin/roedvin', department: 'Vin og spiritus' },
    ])
  })

  it('finds product group ids anywhere in page content', () => {
    const page = { content: [{ ProductGroupId: 'a' }, { Ribbon: { Items: [{ ProductGroupId: 'b' }, { ProductGroupId: 'a' }] } }] }
    assert.deepEqual(productGroupIdsFromPage(page), ['a', 'b'])
  })
})

describe('nemligCatalogLooksComplete', () => {
  const base = { pages: 600, groups: 1300, sitemapIds: 13_374, fetchedSingly: 4_361, failures: [] as string[] }
  const entries = (n: number) => Array.from({ length: n }, () => ({ product: product(), department: '' }))

  it('accepts a full crawl with a single failure', () => {
    assert.equal(nemligCatalogLooksComplete({ ...base, entries: entries(13_370), failures: ['vare 1: 500'] }), null)
  })

  it('rejects a crawl missing the sitemap or most products', () => {
    assert.notEqual(nemligCatalogLooksComplete({ ...base, sitemapIds: 0, entries: entries(9_000) }), null)
    assert.notEqual(nemligCatalogLooksComplete({ ...base, entries: entries(8_000) }), null)
  })

  it('rejects a crawl with many failed calls', () => {
    const failures = Array.from({ length: 200 }, (_, i) => `gruppe ${i}: 500`)
    assert.notEqual(nemligCatalogLooksComplete({ ...base, entries: entries(13_000), failures }), null)
  })
})
