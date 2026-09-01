import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  dagligvarerOfferScanOrFilter,
  dagligvarerTjekOverlayOrFilter,
} from './dagligvarer-source-filter'

describe('Tjek Salling leaflet overlay filters', () => {
  it('or-filter keeps non-tjek plus Tjek on Netto/Føtex/Bilka', () => {
    const f = dagligvarerTjekOverlayOrFilter()
    assert.equal(
      f,
      'source.not.like.tjek%,and(source.like.tjek%,store_id.in.(netto,foetex,bilka))',
    )
  })

  it('tilbud-scan includes Tjek overlay when Goma is primary', () => {
    const prev = process.env.GOMA_IMPORT_ENABLED
    process.env.GOMA_IMPORT_ENABLED = 'true'
    try {
      const f = dagligvarerOfferScanOrFilter()
      assert.match(f, /source.like.tjek%/)
      assert.match(f, /store_id.in.\(netto,foetex,bilka\)/)
      assert.doesNotMatch(f, /source.like.tjek%,and/)
    } finally {
      if (prev === undefined) delete process.env.GOMA_IMPORT_ENABLED
      else process.env.GOMA_IMPORT_ENABLED = prev
    }
  })
})
