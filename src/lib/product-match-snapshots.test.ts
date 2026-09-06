import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  parseFooddataProductId,
  storeProductIdFromFooddataProductId,
} from './product-match-snapshots'

describe('storeProductIdFromFooddataProductId', () => {
  it('bevarer REMA source_id (aldrig 1000-prefix)', () => {
    assert.equal(storeProductIdFromFooddataProductId('rema-1000-60009'), '60009')
    assert.equal(parseFooddataProductId('rema-1000-60009')?.source_id, '60009')
  })

  it('klipper hele kæde-prefixet på abc-lavpris og min-koebmand', () => {
    assert.equal(
      storeProductIdFromFooddataProductId('abc-lavpris-abclavpris-2026w36-p06-e9f28'),
      'abclavpris-2026w36-p06-e9f28',
    )
    assert.equal(
      storeProductIdFromFooddataProductId('min-koebmand-minkoebmand-5701410381295'),
      'minkoebmand-5701410381295',
    )
  })

  it('bevarer Netto/Føtex source_id inkl. bindestreg i SKU', () => {
    assert.equal(storeProductIdFromFooddataProductId('netto-11018359-EA'), '11018359-EA')
    assert.equal(storeProductIdFromFooddataProductId('foetex-72675001-EA'), '72675001-EA')
  })
})
