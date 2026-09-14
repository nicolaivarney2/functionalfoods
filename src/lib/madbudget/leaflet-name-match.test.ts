import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { liveOffersForCuratedSnapshots } from './leaflet-name-match'

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
