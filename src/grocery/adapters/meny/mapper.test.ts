import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { shouldImportFooddataOfferSource } from '@/lib/goma-import-stores'
import { collectMenyProducts, extractJsonObjectAfter, parseMenyAvisPage, parseMenyValidity } from './client'
import {
  guessMenyDepartment,
  isMenyAlcohol,
  mapMenyAvisOffer,
  mapMenyAvisProduct,
  menyOfferWindow,
  menyProductName,
  parseMenyDesc,
  parseMenyGroupNotes,
  selectMenyFoodItems,
  validMenyGtin,
} from './mapper'
import { isMenyAvisActiveOn, menyAvisFingerprint } from './sync'
import type { MenyAvis, MenyEnrichmentProduct, MenyNativeCategory } from './types'

const SYNCED = '2026-09-26T02:00:00.000Z'

function product(overrides: Partial<MenyEnrichmentProduct> = {}): MenyEnrichmentProduct {
  return {
    type: 13,
    id: 1,
    productId: '5000112611878',
    name: 'Innocent Æblejuice (Innocent Juice, Shot eller Smoothie)',
    desc: 'Innocent Æblejuice. 900 ml (Max. literpris 49,88)',
    price: 19.95,
    pageIndex: 3,
    alttext: 'Innocent Juice, Shot eller Smoothie',
    packagesize: 1,
    ...overrides,
  }
}

function avis(products: MenyEnrichmentProduct[], pageTexts: string[] = []): MenyAvis {
  return {
    paperId: 3058728,
    name: 'MENY uge 4026',
    url: 'https://ugensavis.meny.dk/',
    validFrom: '2026-09-25',
    validTo: '2026-10-01',
    pageTexts,
    products,
  }
}

describe('MENY avis page', () => {
  it('reads window.staticSettings with braces inside strings', () => {
    const html = `<script>window.staticSettings = {"a":"}{","b":{"c":[1,2]}};var x = {};</script>`
    assert.deepEqual(extractJsonObjectAfter(html, 'window.staticSettings'), { a: '}{', b: { c: [1, 2] } })
  })

  it('parses paper, chunk urls and validity', () => {
    const settings = {
      paperId: 3058728,
      name: 'MENY uge 4026',
      paperCompleteUrl: 'https://ugensavis.meny.dk/',
      pageTexts: ['Uge 40. Avisen gælder fra fredag 25.09.2026 til og med torsdag 01.10.2026. Se åbningstider'],
      enrichments: { chunkUrls: { '1-17': 'https://cdn.ipaper.io/a.json?token=x' } },
    }
    const { settings: s, validity } = parseMenyAvisPage(`<script>window.staticSettings = ${JSON.stringify(settings)};</script>`)
    assert.equal(s.paperId, 3058728)
    assert.deepEqual(s.chunkUrls, ['https://cdn.ipaper.io/a.json?token=x'])
    assert.deepEqual(validity, { validFrom: '2026-09-25', validTo: '2026-10-01' })
  })

  it('returns null validity when the period is missing', () => {
    assert.equal(parseMenyValidity(['Ingen dato her']), null)
  })

  it('collects type-13 products once per EAN', () => {
    const products = collectMenyProducts([
      { enrichments: [product(), { type: 6, id: 2 }, product({ id: 3 })] },
      { enrichments: [product({ productId: '57007007', name: 'Andet' })] },
    ])
    assert.deepEqual(products.map((p) => [p.id, String(p.productId)]), [
      [1, '5000112611878'],
      [1, '57007007'],
    ])
  })
})

describe('MENY parsers', () => {
  it('strips the avis group from the name', () => {
    assert.equal(menyProductName(product()), 'Innocent Æblejuice')
    assert.equal(
      menyProductName(product({ name: 'Øko-Hokkaido (Gb) (Grøn Balance Dansk Økologisk Græskar)', alttext: 'Grøn Balance Dansk Økologisk Græskar' })),
      'Øko-Hokkaido (Gb)',
    )
    assert.equal(menyProductName(product({ name: '*Villa Boheme Red (Villa Boheme)', alttext: 'Villa Boheme' })), 'Villa Boheme Red')
  })

  it('parses amount, unit and unit price', () => {
    assert.deepEqual(parseMenyDesc('Merrild Koffeinlet 400 G. 400 g (Max. kg pris 299,75)'), {
      amount: 400,
      unit: 'g',
      unitPrice: { cents: 29975, unit: 'kg', multibuyQty: null },
      unitPriceText: 'Max. kg pris 299,75',
    })
    const faxe = parseMenyDesc('Faxe Kondi Pet. 150 cl (Literpris 6,63)')
    assert.deepEqual([faxe.amount, faxe.unit, faxe.unitPrice?.cents, faxe.unitPrice?.unit], [150, 'cl', 663, 'L'])
    const eggs = parseMenyDesc('Øko-Æbl. 70+ (Aa). 6 stk (Stk. pris 3,33)')
    assert.deepEqual([eggs.amount, eggs.unit, eggs.unitPrice?.unit], [6, 'stk', 'stk'])
    assert.equal(parseMenyDesc('Oksegrydesteg. 3.4 kg (Kg pris 159,90)').amount, 3.4)
    assert.equal(parseMenyDesc('Aa Zaatar Øko. 50 g (Max. kg pris 1.000,00)').unitPrice?.cents, 100000)
  })

  it('reads multibuy quantity from "v/N"', () => {
    const k = parseMenyDesc('K-Salat Tunsalat. 150 g (Max. kg pris v/2 bægere 149,75)')
    assert.deepEqual(k.unitPrice, { cents: 14975, unit: 'kg', multibuyQty: 2 })
  })

  it('keeps only real GS1 numbers as gtin', () => {
    assert.equal(validMenyGtin('5000112611878'), '5000112611878')
    assert.equal(validMenyGtin('5000112611877'), null)
    assert.equal(validMenyGtin('2014070000004'), null)
    assert.equal(validMenyGtin('0027076'), null)
    assert.equal(validMenyGtin('57007007'), '57007007')
  })
})

describe('MENY food filter', () => {
  it('flags wine, spirits and beer but not soft drinks or food with %', () => {
    const alcohol = (name: string, desc: string, alttext = '') =>
      isMenyAlcohol({ name, desc, alttext })
    assert.equal(alcohol('Nugan Stunt Bros Rødvin', 'Nugan Stunt Bros Rødvin. 75 cl (Literpris 59,93)'), true)
    assert.equal(alcohol('La Cuvee Rouge (La Cuvée eller Paddy\'s Creek)', 'La Cuvee Rouge. 300 cl (Literpris 33,32)'), true)
    assert.equal(alcohol('Tuborg Classic 4,6%', 'Tuborg Classic 4,6%. 33 cl (Literpris v/30 stk. 11,11)'), true)
    assert.equal(alcohol('Tanqueray Sevilla', 'Tanqueray Sevilla. 70 cl (Literpris 185,71)', 'Tanqueray Gin'), true)
    assert.equal(alcohol('Aa Lemonade Citroner Øko', 'Aa Lemonade Citroner Øko. 75 cl (Literpris 46,67)'), false)
    assert.equal(alcohol('Coca Cola 24-Pak', 'Coca Cola 24-Pak. 792 cl (Literpris 11,36)', 'Coca-Cola, Fanta eller Carlsberg'), false)
    assert.equal(alcohol('Arla Letmælk 1,5%', 'Arla Letmælk 1,5%. 1 l (Literpris 12,95)'), false)
    assert.equal(alcohol('Gestus Græsk Yoghurt 10%', 'Gestus Græsk Yoghurt 10%. 1000 g (Kg pris 30,00)'), false)
    assert.equal(alcohol('Ovnkyll. Overlår M/Rygben (Rose Dansk Kylling)', 'x. 1000 g (Max. kg pris 114,29)', 'Rose Dansk Kylling'), false)
    assert.equal(alcohol('Kk Rødvinssauce', 'Kk Rødvinssauce. 500 ml (Literpris 32,00)'), false)
  })

  it('uses catalog category, then group siblings, then name rules', () => {
    const native = new Map<string, MenyNativeCategory>([
      ['1', { lvl0: 'Kolonial', lvl1: 'Kaffe, te & kakao' }],
      ['2', { lvl0: 'Personlig pleje', lvl1: 'Kropspleje' }],
      ['3', { lvl0: 'Frost', lvl1: 'Is' }],
      ['4', { lvl0: 'Drikkevarer', lvl1: 'Spiritus & likør' }],
      ['5', { lvl0: 'Baby & børn', lvl1: 'Bleer & tilbehør' }],
    ])
    const selection = selectMenyFoodItems(
      avis([
        product({ productId: '1', name: 'Merrild Gold', alttext: 'Merrild eller Lavazza' }),
        product({ productId: '1a', name: 'Lavazza Qualita Oro', alttext: 'Merrild eller Lavazza' }),
        product({ productId: '2', name: 'Sanex Therapy', alttext: 'Sanex eller Palmolive' }),
        product({ productId: '2a', name: 'Palmolive Black Orchid', alttext: 'Sanex eller Palmolive' }),
        product({ productId: '3', name: 'Cdo Baileys', desc: 'Cdo Baileys. 825 ml (Max. literpris 47,27)', alttext: 'Carte d’Or' }),
        product({ productId: '4', name: 'Tullamore Dew', alttext: 'Tullamore' }),
        product({ productId: '5', name: 'Libero Comfort', alttext: 'Libero' }),
        product({ productId: '6', name: 'Kronelys 20cm', alttext: 'ASP-HOLMBLAD Krone- eller Fyrfadslys' }),
        product({ productId: '7', name: 'Okseculotte', desc: 'Okseculotte. 1 kg (Kg pris 179,90)', alttext: 'Okseculotte' }),
        product({ productId: '8', name: 'Pris mangler', price: null, alttext: 'Pris mangler' }),
      ]),
      native,
    )
    const kept = selection.items.map((i) => [i.ean, i.department])
    assert.deepEqual(kept, [
      ['1', 'Kolonial'],
      ['1a', 'Kolonial'],
      ['3', 'Frost'],
      ['7', 'Kød & fisk'],
    ])
    assert.equal(selection.alcoholSkipped, 1)
    assert.equal(selection.nonFoodSkipped, 4)
    assert.equal(selection.noPriceSkipped, 1)
    assert.equal(selection.nativeMatched, 5)
  })

  it('guesses departments for MENY own brands', () => {
    assert.equal(guessMenyDepartment('Da Boller I Tomat', 'Delikatessen Anbefaler Middagsretter'), 'Nemt & hurtigt')
    assert.equal(guessMenyDepartment('Pave Salami Med Peber', 'Sydeuropæisk Charcuteri eller Gestus Pizzabunde'), 'Kød & fisk')
    assert.equal(guessMenyDepartment('Gestus Pavé 4 Stk', null), 'Brød')
    assert.equal(guessMenyDepartment('Risifrutti Pink Lemonade', 'Risifrutti'), 'Mejeri & køl')
    assert.equal(guessMenyDepartment('Øko-Hokkaido Grøn', 'Grøn Balance Dansk Økologisk Græskar'), 'Frugt & grønt')
    assert.equal(guessMenyDepartment('Ukendt vare', null), null)
  })
})

describe('MENY page notes', () => {
  const text =
    'SKARP PRIS DANSKE PORRER 3 stk. Stk. pris 4,67. 7 særlige medlemspriser KAROLINES KØKKEN SAUCE Flere varianter. 500 ml. Literpris 32,00. PR. STK. 16.- MEDLEMSPRIS* PR. STK. 12.- Literpris 24,00 Max. 4 Stk. pr. kunde ROSE DANSK KYLLING Ovnklare. PR. PAKKE 40.- MEDLEMSPRIS* PR. PAKKE 29 95 Max. 4 Pakker pr. kunde'

  it('reads member price and limit per group without leaking to neighbours', () => {
    const notes = parseMenyGroupNotes([text], ['Danske Porrer', 'Karolines Køkken Sauce', 'Rose Dansk Kylling'])
    assert.equal(notes.get('Danske Porrer'), undefined)
    assert.deepEqual(notes.get('Karolines Køkken Sauce'), {
      regularPriceCents: 1600,
      memberPriceCents: 1200,
      limitText: 'Max. 4 stk pr. kunde',
    })
    assert.equal(notes.get('Rose Dansk Kylling')?.memberPriceCents, 2995)
  })

  it('only attaches the note when the avis price matches', () => {
    const items = selectMenyFoodItems(
      avis(
        [
          product({ productId: '1', name: 'Kk Mornay Sauce', desc: 'Kk Mornay Sauce. 500 ml (Literpris 32,00)', price: 16, alttext: 'Karolines Køkken Sauce' }),
          product({ productId: '2', name: 'Kk Stor Sauce', desc: 'Kk Stor Sauce. 1000 ml (Literpris 20,00)', price: 20, alttext: 'Karolines Køkken Sauce' }),
        ],
        [text],
      ),
      new Map(),
    ).items
    assert.deepEqual(items[0].note, { memberPriceCents: 1200, limitText: 'Max. 4 stk pr. kunde' })
    assert.equal(items[1].note, null)
  })
})

describe('MENY mapping', () => {
  const [item] = selectMenyFoodItems(
    avis(
      [
        product({
          productId: '5701234567899',
          name: 'K-Salat Tunsalat (K-Salat Pålægssalat eller Sauce)',
          desc: 'K-Salat Tunsalat. 150 g (Max. kg pris v/2 bægere 149,75)',
          price: 29.95,
          alttext: 'K-Salat Pålægssalat eller Sauce',
        }),
      ],
    ),
    new Map([['5701234567899', { lvl0: 'Mejeri og køl', lvl1: 'Pålæg' }]]),
  ).items

  it('maps the product with avis- prefix and no image', () => {
    const row = mapMenyAvisProduct(item, SYNCED)
    assert.equal(row.source_chain, 'meny')
    assert.equal(row.source_id, 'avis-5701234567899')
    assert.equal(row.gtin, '5701234567899')
    assert.equal(row.name, 'K-Salat Tunsalat')
    assert.equal(row.image_url, null)
    assert.deepEqual([row.amount, row.unit, row.category_lvl0, row.category_lvl1], [150, 'g', 'Mejeri og køl', 'Pålæg'])
  })

  it('maps the offer with period, unit price and multibuy', () => {
    const offer = mapMenyAvisOffer(item, 'uuid', SYNCED)!
    assert.equal(offer.store_id, 'meny')
    assert.equal(offer.source, 'meny-avis')
    assert.equal(offer.price_cents, 2995)
    assert.equal(offer.before_price_cents, null)
    assert.equal(offer.unit_price_cents, 14975)
    assert.equal(offer.unit_price_unit, 'kg')
    assert.equal(offer.multibuy, '2 for 29,95 kr')
    assert.equal(offer.offer_from, '2026-09-24T22:00:00.000Z')
    assert.equal(offer.offer_until, '2026-10-01T22:00:00.000Z')
    assert.equal(offer.is_on_sale, true)
  })

  it('writes member price and limit into the description', () => {
    const offer = mapMenyAvisOffer(
      { ...item, note: { memberPriceCents: 1200, limitText: 'Max. 4 stk pr. kunde' } },
      'uuid',
      SYNCED,
    )!
    assert.equal(offer.offer_description, 'Medlemspris 12,00 kr med MENY-appen · Max. 4 stk pr. kunde')
  })

  it('handles period and fingerprint', () => {
    const a = avis([product()])
    assert.deepEqual(menyOfferWindow(a), { from: '2026-09-24T22:00:00.000Z', until: '2026-10-01T22:00:00.000Z' })
    assert.equal(isMenyAvisActiveOn(a, '2026-10-01'), true)
    assert.equal(isMenyAvisActiveOn(a, '2026-10-02'), false)
    assert.equal(menyAvisFingerprint(a), menyAvisFingerprint(avis([product()])))
    assert.notEqual(menyAvisFingerprint(a), menyAvisFingerprint(avis([product({ price: 18 })])))
  })

  it('is imported to FF even though MENY was a Goma chain', () => {
    assert.equal(shouldImportFooddataOfferSource('meny', 'meny-avis', false), true)
    assert.equal(shouldImportFooddataOfferSource('meny', 'meny-avis', true), true)
  })
})
