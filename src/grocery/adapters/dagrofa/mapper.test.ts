import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { shouldImportFooddataOfferSource } from '@/lib/goma-import-stores'
import { DAGROFA_AVIS_CHAINS, isDagrofaChainId, type DagrofaAvisChain } from './chains'
import { collectDagrofaProducts, extractJsonObjectAfter, parseDagrofaAvisPage, parseDagrofaValidity } from './client'
import {
  guessDagrofaDepartment,
  isDagrofaAlcohol,
  mapDagrofaAvisOffer,
  mapDagrofaAvisProduct,
  dagrofaOfferWindow,
  dagrofaProductName,
  parseDagrofaDesc,
  parseDagrofaGroupNotes,
  selectDagrofaFoodItems,
  validDagrofaGtin,
} from './mapper'
import { isDagrofaAvisActiveOn, dagrofaAvisFingerprint } from './sync'
import type { DagrofaAvis, DagrofaEnrichmentProduct, DagrofaNativeCategory } from './types'

const SYNCED = '2026-09-26T02:00:00.000Z'

function product(overrides: Partial<DagrofaEnrichmentProduct> = {}): DagrofaEnrichmentProduct {
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

function avis(
  products: DagrofaEnrichmentProduct[],
  pageTexts: string[] = [],
  chain: DagrofaAvisChain = DAGROFA_AVIS_CHAINS.meny,
): DagrofaAvis {
  return {
    chain,
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
    const { settings: s, validity } = parseDagrofaAvisPage(
      `<script>window.staticSettings = ${JSON.stringify(settings)};</script>`,
      DAGROFA_AVIS_CHAINS.meny,
    )
    assert.equal(s.paperId, 3058728)
    assert.deepEqual(s.chunkUrls, ['https://cdn.ipaper.io/a.json?token=x'])
    assert.deepEqual(validity, { validFrom: '2026-09-25', validTo: '2026-10-01' })
  })

  it('throws with the chain label when staticSettings is missing', () => {
    assert.throws(() => parseDagrofaAvisPage('<html></html>', DAGROFA_AVIS_CHAINS.spar), /^Error: SPAR:/)
  })

  it('reads SPAR and Min Købmand validity with month names', () => {
    assert.deepEqual(
      parseDagrofaValidity(['AVISEN GÆLDER FRA FREDAG 25. SEPTEMBER TIL OG MED TORSDAG 1. OKTOBER 2026 Ret til trykfejl']),
      { validFrom: '2026-09-25', validTo: '2026-10-01' },
    )
    assert.deepEqual(
      parseDagrofaValidity(['Tilbuddene gælder fra fredag den 25. september til og med torsdag den 1. oktober 2026.']),
      { validFrom: '2026-09-25', validTo: '2026-10-01' },
    )
    assert.deepEqual(
      parseDagrofaValidity(['Avisen gælder fra fredag 26. december til og med torsdag 1. januar 2027']),
      { validFrom: '2026-12-26', validTo: '2027-01-01' },
    )
  })

  it('returns null validity when the period is missing', () => {
    assert.equal(parseDagrofaValidity(['Ingen dato her']), null)
  })

  it('knows the three Dagrofa chains', () => {
    assert.equal(isDagrofaChainId('spar'), true)
    assert.equal(isDagrofaChainId('min-koebmand'), true)
    assert.equal(isDagrofaChainId('loevbjerg'), false)
  })

  it('collects type-13 products once per EAN', () => {
    const products = collectDagrofaProducts([
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
    assert.equal(dagrofaProductName(product()), 'Innocent Æblejuice')
    assert.equal(
      dagrofaProductName(product({ name: 'Øko-Hokkaido (Gb) (Grøn Balance Dansk Økologisk Græskar)', alttext: 'Grøn Balance Dansk Økologisk Græskar' })),
      'Øko-Hokkaido (Gb)',
    )
    assert.equal(dagrofaProductName(product({ name: '*Villa Boheme Red (Villa Boheme)', alttext: 'Villa Boheme' })), 'Villa Boheme Red')
  })

  it('parses amount, unit and unit price', () => {
    assert.deepEqual(parseDagrofaDesc('Merrild Koffeinlet 400 G. 400 g (Max. kg pris 299,75)'), {
      amount: 400,
      unit: 'g',
      unitPrice: { cents: 29975, unit: 'kg', multibuyQty: null },
      unitPriceText: 'Max. kg pris 299,75',
    })
    const faxe = parseDagrofaDesc('Faxe Kondi Pet. 150 cl (Literpris 6,63)')
    assert.deepEqual([faxe.amount, faxe.unit, faxe.unitPrice?.cents, faxe.unitPrice?.unit], [150, 'cl', 663, 'L'])
    const eggs = parseDagrofaDesc('Øko-Æbl. 70+ (Aa). 6 stk (Stk. pris 3,33)')
    assert.deepEqual([eggs.amount, eggs.unit, eggs.unitPrice?.unit], [6, 'stk', 'stk'])
    assert.equal(parseDagrofaDesc('Oksegrydesteg. 3.4 kg (Kg pris 159,90)').amount, 3.4)
    assert.equal(parseDagrofaDesc('Aa Zaatar Øko. 50 g (Max. kg pris 1.000,00)').unitPrice?.cents, 100000)
  })

  it('reads multibuy quantity from "v/N"', () => {
    const k = parseDagrofaDesc('K-Salat Tunsalat. 150 g (Max. kg pris v/2 bægere 149,75)')
    assert.deepEqual(k.unitPrice, { cents: 14975, unit: 'kg', multibuyQty: 2 })
  })

  it('keeps only real GS1 numbers as gtin', () => {
    assert.equal(validDagrofaGtin('5000112611878'), '5000112611878')
    assert.equal(validDagrofaGtin('5000112611877'), null)
    assert.equal(validDagrofaGtin('2014070000004'), null)
    assert.equal(validDagrofaGtin('0027076'), null)
    assert.equal(validDagrofaGtin('57007007'), '57007007')
  })
})

describe('MENY food filter', () => {
  it('flags wine, spirits and beer but not soft drinks or food with %', () => {
    const alcohol = (name: string, desc: string, alttext = '') =>
      isDagrofaAlcohol({ name, desc, alttext })
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
    assert.equal(alcohol('Æblemost Ørskov 75 Cl', 'Æblemost Ørskov 75 Cl. 75 cl (Literpris 26,67)'), false)
    assert.equal(alcohol('A.B. Marcipanbrød Baileys', 'A.B. Marcipanbrød Baileys. 150 g (Max. kg pris 333,33)'), false)
  })

  it('drops kitchen supplies kept in the food aisles', () => {
    const selection = selectDagrofaFoodItems(
      avis([product({ productId: '1', name: 'Fixa Fryseposer 4 Lt', desc: 'Fixa Fryseposer 4 Lt. 1 stk', alttext: 'Fixa' })]),
      new Map(),
    )
    assert.deepEqual([selection.items.length, selection.nonFoodSkipped], [0, 1])
  })

  it('uses catalog category, then group siblings, then name rules', () => {
    const native = new Map<string, DagrofaNativeCategory>([
      ['1', { lvl0: 'Kolonial', lvl1: 'Kaffe, te & kakao' }],
      ['2', { lvl0: 'Personlig pleje', lvl1: 'Kropspleje' }],
      ['3', { lvl0: 'Frost', lvl1: 'Is' }],
      ['4', { lvl0: 'Drikkevarer', lvl1: 'Spiritus & likør' }],
      ['5', { lvl0: 'Baby & børn', lvl1: 'Bleer & tilbehør' }],
    ])
    const selection = selectDagrofaFoodItems(
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
    assert.equal(guessDagrofaDepartment('Da Boller I Tomat', 'Delikatessen Anbefaler Middagsretter'), 'Nemt & hurtigt')
    assert.equal(guessDagrofaDepartment('Pave Salami Med Peber', 'Sydeuropæisk Charcuteri eller Gestus Pizzabunde'), 'Kød & fisk')
    assert.equal(guessDagrofaDepartment('Gestus Pavé 4 Stk', null), 'Brød')
    assert.equal(guessDagrofaDepartment('Risifrutti Pink Lemonade', 'Risifrutti'), 'Mejeri & køl')
    assert.equal(guessDagrofaDepartment('Øko-Hokkaido Grøn', 'Grøn Balance Dansk Økologisk Græskar'), 'Frugt & grønt')
    assert.equal(guessDagrofaDepartment('Heinz Tomatketchup', null), 'Kolonial')
    assert.equal(guessDagrofaDepartment('Gestus Middagskødboller', null), 'Nemt & hurtigt')
    assert.equal(guessDagrofaDepartment('Dill & Parmesan Chips', null), 'Slik og snacks')
    assert.equal(guessDagrofaDepartment('Premium Chokoladekage', null), null)
    assert.equal(guessDagrofaDepartment('Arla Yogh Pære Banan Øko', null), 'Mejeri & køl')
    assert.equal(guessDagrofaDepartment('Faxe Kondi 0 Kal. 12pk Pet', null), 'Drikkevarer')
    assert.equal(guessDagrofaDepartment('Ukendt vare', null), null)
  })
})

describe('MENY page notes', () => {
  const text =
    'SKARP PRIS DANSKE PORRER 3 stk. Stk. pris 4,67. 7 særlige medlemspriser KAROLINES KØKKEN SAUCE Flere varianter. 500 ml. Literpris 32,00. PR. STK. 16.- MEDLEMSPRIS* PR. STK. 12.- Literpris 24,00 Max. 4 Stk. pr. kunde ROSE DANSK KYLLING Ovnklare. PR. PAKKE 40.- MEDLEMSPRIS* PR. PAKKE 29 95 Max. 4 Pakker pr. kunde'

  it('reads member price and limit per group without leaking to neighbours', () => {
    const notes = parseDagrofaGroupNotes([text], ['Danske Porrer', 'Karolines Køkken Sauce', 'Rose Dansk Kylling'])
    assert.equal(notes.get('Danske Porrer'), undefined)
    assert.deepEqual(notes.get('Karolines Køkken Sauce'), {
      regularPriceCents: 1600,
      memberPriceCents: 1200,
      limitText: 'Max. 4 stk pr. kunde',
    })
    assert.equal(notes.get('Rose Dansk Kylling')?.memberPriceCents, 2995)
  })

  it('only attaches the note when the avis price matches', () => {
    const items = selectDagrofaFoodItems(
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
  const [item] = selectDagrofaFoodItems(
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
    const row = mapDagrofaAvisProduct(item, SYNCED)
    assert.equal(row.source_chain, 'meny')
    assert.equal(row.source_id, 'avis-5701234567899')
    assert.equal(row.gtin, '5701234567899')
    assert.equal(row.name, 'K-Salat Tunsalat')
    assert.equal(row.image_url, null)
    assert.deepEqual([row.amount, row.unit, row.category_lvl0, row.category_lvl1], [150, 'g', 'Mejeri og køl', 'Pålæg'])
  })

  it('maps the offer with period, unit price and multibuy', () => {
    const offer = mapDagrofaAvisOffer(item, 'uuid', SYNCED)!
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
    const offer = mapDagrofaAvisOffer(
      { ...item, note: { memberPriceCents: 1200, limitText: 'Max. 4 stk pr. kunde' } },
      'uuid',
      SYNCED,
    )!
    assert.equal(offer.offer_description, 'Medlemspris 12,00 kr med MENY-appen · Max. 4 stk pr. kunde')
  })

  it('handles period and fingerprint', () => {
    const a = avis([product()])
    assert.deepEqual(dagrofaOfferWindow(a), { from: '2026-09-24T22:00:00.000Z', until: '2026-10-01T22:00:00.000Z' })
    assert.equal(isDagrofaAvisActiveOn(a, '2026-10-01'), true)
    assert.equal(isDagrofaAvisActiveOn(a, '2026-10-02'), false)
    assert.equal(dagrofaAvisFingerprint(a), dagrofaAvisFingerprint(avis([product()])))
    assert.notEqual(dagrofaAvisFingerprint(a), dagrofaAvisFingerprint(avis([product({ price: 18 })])))
  })

  it('is imported to FF even though MENY was a Goma chain', () => {
    assert.equal(shouldImportFooddataOfferSource('meny', 'meny-avis', false), true)
    assert.equal(shouldImportFooddataOfferSource('meny', 'meny-avis', true), true)
  })
})

describe('SPAR and Min Købmand mapping', () => {
  const itemFor = (chain: DagrofaAvisChain) =>
    selectDagrofaFoodItems(
      avis([product({ productId: '5701234567899', name: 'Okseculotte', desc: 'Okseculotte. 1 kg (Kg pris 179,90)', alttext: 'Okseculotte' })], [], chain),
      new Map(),
    ).items[0]

  it('writes rows under the chain’s own store and source', () => {
    const spar = itemFor(DAGROFA_AVIS_CHAINS.spar)
    assert.equal(mapDagrofaAvisProduct(spar, SYNCED).source_chain, 'spar')
    const offer = mapDagrofaAvisOffer(spar, 'uuid', SYNCED)!
    assert.deepEqual([offer.store_id, offer.source], ['spar', 'spar-avis'])

    const mk = itemFor(DAGROFA_AVIS_CHAINS['min-koebmand'])
    assert.equal(mapDagrofaAvisProduct(mk, SYNCED).source_chain, 'min-koebmand')
    const mkOffer = mapDagrofaAvisOffer(mk, 'uuid', SYNCED)!
    assert.deepEqual([mkOffer.store_id, mkOffer.source], ['min-koebmand', 'min-koebmand-avis'])
  })

  it('names the member app per chain', () => {
    const note = { memberPriceCents: 1200, limitText: null }
    const spar = mapDagrofaAvisOffer({ ...itemFor(DAGROFA_AVIS_CHAINS.spar), note }, 'uuid', SYNCED)!
    assert.equal(spar.offer_description, 'Medlemspris 12,00 kr med SAMMEN-appen')
    const mk = mapDagrofaAvisOffer({ ...itemFor(DAGROFA_AVIS_CHAINS['min-koebmand']), note }, 'uuid', SYNCED)!
    assert.equal(mk.offer_description, 'Medlemspris 12,00 kr')
  })

  it('is imported to FF', () => {
    assert.equal(shouldImportFooddataOfferSource('spar', 'spar-avis', true), true)
    assert.equal(shouldImportFooddataOfferSource('min-koebmand', 'min-koebmand-avis', true), true)
  })
})
