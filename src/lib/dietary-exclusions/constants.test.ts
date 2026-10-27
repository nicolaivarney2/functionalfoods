import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { normalizeExclusionTag, suggestExclusionTagsFromName } from './constants'
import { mergeIngredientTags } from './organic-tags'

describe('chili exclusion tag', () => {
  it('normaliserer chilli til chili', () => {
    assert.equal(normalizeExclusionTag('chilli'), 'chili')
    assert.equal(normalizeExclusionTag('chili'), 'chili')
  })

  it('foreslår chili på stærke varianter', () => {
    for (const name of [
      'chiliflager',
      'chilipulver',
      'sød chilisauce',
      'cayennepeber',
      'jalapeños',
      'jalapenos',
      'sriracha',
      'sambal oelek',
      'chipotle',
      'harissa',
      'piri piri',
      'gochujang',
      'tabasco',
    ]) {
      assert.ok(suggestExclusionTagsFromName(name).includes('chili'), name)
    }
  })

  it('rammer ikke peberfrugt, paprika eller chilensk', () => {
    for (const name of ['peberfrugter', 'rød peberfrugt', 'paprika', 'sort peber', 'chilensk vin']) {
      assert.equal(suggestExclusionTagsFromName(name).includes('chili'), false, name)
    }
  })

  it('beholder gluten når chili lægges på gochujang', () => {
    const after = mergeIngredientTags(['gluten'], {
      addFood: suggestExclusionTagsFromName('gochujang'),
    })
    assert.deepEqual(after, ['gluten', 'chili'])
  })
})

describe('frisk koriander og champignon', () => {
  it('normaliserer de danske navne', () => {
    assert.equal(normalizeExclusionTag('frisk koriander'), 'fresh-coriander')
    assert.equal(normalizeExclusionTag('koriander'), 'fresh-coriander')
    assert.equal(normalizeExclusionTag('champignon'), 'champignon')
    assert.equal(normalizeExclusionTag('svampe'), 'champignon')
  })

  it('foreslår frisk koriander på urten', () => {
    for (const name of ['frisk koriander', 'koriander', 'cilantro', 'koriander (kan undlades)']) {
      assert.ok(suggestExclusionTagsFromName(name).includes('fresh-coriander'), name)
    }
  })

  it('rammer ikke frø eller stødt koriander', () => {
    for (const name of ['korianderfrø', 'stødt koriander', 'coriander seeds']) {
      assert.equal(suggestExclusionTagsFromName(name).includes('fresh-coriander'), false, name)
    }
  })

  it('foreslår champignon på champignon og svampe', () => {
    for (const name of ['champignon', 'brune champignon', 'svampe', 'champignon (kan undlades)']) {
      assert.ok(suggestExclusionTagsFromName(name).includes('champignon'), name)
    }
  })
})
