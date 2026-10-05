import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  isHiddenCatalogImageHost,
  publicStoreUrl,
  toPublicCatalogImageUrl,
} from './catalog-image-url'

describe('toPublicCatalogImageUrl', () => {
  it('drops catalog-host images', () => {
    assert.equal(toPublicCatalogImageUrl('https://storage.goma.gg/v1/products/abc.jpg'), null)
  })

  it('drops leaflet image urls', () => {
    const upstream = 'https://image-transformer-api.tjek.com/v1/view?u=s3://sgn-prd-assets/x.jpg'
    assert.equal(toPublicCatalogImageUrl(upstream), null)
  })

  it('drops rewritten proxy paths', () => {
    assert.equal(toPublicCatalogImageUrl('/api/images/catalog/g/products/abc.jpg'), null)
    assert.equal(toPublicCatalogImageUrl('/api/images/catalog/a/abcdef'), null)
  })

  it('leaves chain CDNs untouched', () => {
    const url = 'https://images.rema1000.dk/pack.jpg'
    assert.equal(toPublicCatalogImageUrl(url), url)
  })
})

describe('publicStoreUrl', () => {
  it('drops links on hidden hosts', () => {
    assert.equal(publicStoreUrl('https://api.goma.gg/p/1'), null)
    assert.equal(publicStoreUrl('https://shop.rema1000.dk/produkt/1'), 'https://shop.rema1000.dk/produkt/1')
  })

  it('recognises hidden hosts', () => {
    assert.equal(isHiddenCatalogImageHost('https://squid-api.tjek.com/x'), true)
    assert.equal(isHiddenCatalogImageHost('https://www.etilbudsavis.dk/a'), true)
    assert.equal(isHiddenCatalogImageHost('https://www.nemlig.com/a'), false)
  })
})
