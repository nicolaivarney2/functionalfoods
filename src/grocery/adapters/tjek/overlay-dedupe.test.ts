import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { tjekOverlayDuplicatesCatalog } from './overlay-dedupe'

describe('tjekOverlayDuplicatesCatalog', () => {
  const catalog = [
    'Coca-Cola 4-pak',
    'Hakket oksekød 14-18% fedt',
    'BKI formalet kaffe 400 g',
    'Faxe Kondi 8-pak',
  ]

  it('fanger samme avisvare som allerede er i Algolia', () => {
    assert.equal(tjekOverlayDuplicatesCatalog('Coca-Cola sodavand', catalog), true)
    assert.equal(tjekOverlayDuplicatesCatalog('BKI formalet kaffe', catalog), true)
    assert.equal(tjekOverlayDuplicatesCatalog('Faxe Kondi eller Pepsi Max sodavand', catalog), true)
  })

  it('bevarer slagter-/avisvarer Algolia ikke har som tilbud', () => {
    assert.equal(
      tjekOverlayDuplicatesCatalog('Okseculotte af inderlår pr. kg', catalog),
      false,
    )
    assert.equal(tjekOverlayDuplicatesCatalog('Pølsemesteren pølser', catalog), false)
  })
})
