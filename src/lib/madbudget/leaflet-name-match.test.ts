import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  liveOffersForCuratedProductLine,
  liveOffersForCuratedSnapshots,
  productLinePhrase,
} from './leaflet-name-match'

describe('liveOffersForCuratedSnapshots', () => {
  it('genbruger kun tilbud med samme navn som en kurateret vare', () => {
    const live = liveOffersForCuratedSnapshots(['Tulip bacon', 'Cheasy Revet Ost 13%'], [
      { name_store: 'Jubilæumsplatte' },
      { name_store: 'Tulip bacon' },
      { name_store: 'Kyllingefilet' },
    ])
    assert.deepEqual(
      live.map((o) => o.name_store),
      ['Tulip bacon']
    )
  })

  it('matcher ikke på ingrediensord alene', () => {
    const live = liveOffersForCuratedSnapshots(['Hakket oksekød'], [{ name_store: 'Oksekød i skiver' }])
    assert.equal(live.length, 0)
  })
})

describe('liveOffersForCuratedProductLine', () => {
  it('finder den nuværende vare i samme linje som snapshot', () => {
    assert.equal(productLinePhrase('Flødeost naturel 16% fedt laktosefri'), 'flødeost')
    assert.equal(productLinePhrase('Radiser m. top i bundt'), 'radiser')
    assert.equal(productLinePhrase('Hakket oksekød'), 'hakket oksekød')

    const live = liveOffersForCuratedProductLine(
      ['Flødeost naturel 16% fedt laktosefri', 'Radiser m. top i bundt'],
      [
        { name_store: 'Fyldte røde peberfrugter m. flødeost' },
        { name_store: 'Garlí flødeost 24% fedt' },
        { name_store: 'Flødeost 21% fedt' },
        { name_store: 'Flødeost pikant 23% fedt' },
        { name_store: 'Radiser' },
        { name_store: 'Salat m. pak choi, edamamebønner, kinaradise og gomadressing' },
        { name_store: 'Kyllingepølse' },
      ]
    )
    assert.deepEqual(
      live.map((offer) => offer.name_store),
      ['Flødeost 21% fedt', 'Flødeost pikant 23% fedt', 'Radiser']
    )
  })

  it('gætter ikke ud fra ingrediensen, og hakket kræver næste ord', () => {
    const live = liveOffersForCuratedProductLine(
      [null, 'Hakket oksekød', 'Kylling'],
      [
        { name_store: 'Hakket kylling' },
        { name_store: 'Oksekød i skiver' },
        { name_store: 'Hakket oksekød 8-12%' },
        { name_store: 'Kyllingepølse' },
        { name_store: 'Kylling' },
      ]
    )
    assert.deepEqual(
      live.map((offer) => offer.name_store),
      ['Hakket oksekød 8-12%', 'Kylling']
    )
  })
})
