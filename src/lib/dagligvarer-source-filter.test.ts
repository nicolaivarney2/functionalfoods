import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { dagligvarerOfferScanOrFilter } from './dagligvarer-source-filter'
import { shouldImportFooddataOfferSource } from './goma-import-stores'

describe('tilladte dagligvarekilder', () => {
  it('tilbudsscannen er kun rækker markeret som tilbud', () => {
    assert.equal(dagligvarerOfferScanOrFilter(), 'is_on_sale.eq.true')
  })

  it('kopierer egne kilder og springer Goma og Tjek over', () => {
    assert.equal(shouldImportFooddataOfferSource('lidl', 'lidl-avis', false), true)
    assert.equal(shouldImportFooddataOfferSource('meny', 'meny-avis', true), true)
    assert.equal(shouldImportFooddataOfferSource('spar', 'spar-avis', false), true)
    assert.equal(shouldImportFooddataOfferSource('min-koebmand', 'min-koebmand-avis', false), true)
    assert.equal(shouldImportFooddataOfferSource('netto', 'salling-algolia:netto', false), true)
    assert.equal(shouldImportFooddataOfferSource('rema-1000', 'rema-1000-api', true), true)
    assert.equal(shouldImportFooddataOfferSource('nemlig', 'nemlig-api', false), true)

    assert.equal(shouldImportFooddataOfferSource('lidl', 'goma', false), false)
    assert.equal(shouldImportFooddataOfferSource('lidl', 'goma', true), false)
    assert.equal(shouldImportFooddataOfferSource('lidl', 'tjek:offers', false), false)
    assert.equal(shouldImportFooddataOfferSource('foetex', 'tjek:offers', true), false)
    assert.equal(shouldImportFooddataOfferSource('bilka', 'catalog', false), false)
    assert.equal(shouldImportFooddataOfferSource('kvickly', 'leaflet:offers', false), false)
  })
})
