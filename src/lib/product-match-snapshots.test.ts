import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  isMangledHyphenChainStoreProductId,
  parseFooddataProductId,
  storeProductIdFromFooddataProductId,
} from './product-match-snapshots'

describe('storeProductIdFromFooddataProductId', () => {
  it('bevarer REMA source_id (aldrig 1000-prefix)', () => {
    assert.equal(storeProductIdFromFooddataProductId('rema-1000-60009'), '60009')
    assert.equal(parseFooddataProductId('rema-1000-60009')?.source_id, '60009')
    assert.equal(parseFooddataProductId('rema-1000-60009')?.source_chain, 'rema-1000')
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
    assert.equal(storeProductIdFromFooddataProductId('bilka-110606'), '110606')
  })
})

describe('isMangledHyphenChainStoreProductId', () => {
  it('fanger første-bindestreg-split på REMA, ABC og Min Købmand', () => {
    assert.equal(isMangledHyphenChainStoreProductId('rema-1000', '1000-60009'), true)
    assert.equal(isMangledHyphenChainStoreProductId('abc-lavpris', 'lavpris-abclavpris-2026w36'), true)
    assert.equal(isMangledHyphenChainStoreProductId('min-koebmand', 'koebmand-5701410381295'), true)
  })

  it('lader rigtige source_id stå', () => {
    assert.equal(isMangledHyphenChainStoreProductId('rema-1000', '60009'), false)
    assert.equal(isMangledHyphenChainStoreProductId('abc-lavpris', 'abclavpris-2026w36-p06-e9f28'), false)
    assert.equal(isMangledHyphenChainStoreProductId('min-koebmand', 'minkoebmand-5701410381295'), false)
    assert.equal(isMangledHyphenChainStoreProductId('netto', '11018359-EA'), false)
  })
})
