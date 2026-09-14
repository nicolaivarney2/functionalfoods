import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { cheapestStoreKeyFromPrices, storeQualifiesForCheapest } from './shopping-list-display'

const items = [{ name: 'Kylling' }, { name: 'Løg' }, { name: 'Ris' }, { name: 'Mælk' }, { name: 'Broccoli' }, { name: 'Ost' }, { name: 'Tomat' }]

describe('cheapestStoreKeyFromPrices', () => {
  it('lader ikke en tilbudsbutik med kun vejledende priser vinde', () => {
    const prices = {
      'rema-1000': {
        kylling: { totalPrice: 40, isGuidePrice: false },
        løg: { totalPrice: 10, isGuidePrice: false },
        ris: { totalPrice: 15, isGuidePrice: false },
        mælk: { totalPrice: 12, isGuidePrice: false },
        broccoli: { totalPrice: 14, isGuidePrice: false },
        ost: { totalPrice: 20, isGuidePrice: false },
        tomat: { totalPrice: 18, isGuidePrice: false },
      },
      løvbjerg: {
        kylling: { totalPrice: 30, isGuidePrice: true },
        løg: { totalPrice: 8, isGuidePrice: true },
        ris: { totalPrice: 10, isGuidePrice: true },
        mælk: { totalPrice: 9, isGuidePrice: true },
        broccoli: { totalPrice: 11, isGuidePrice: true },
        ost: { totalPrice: 16, isGuidePrice: true },
        tomat: { totalPrice: 14, isGuidePrice: true },
      },
    }
    assert.equal(storeQualifiesForCheapest(prices, 'løvbjerg', items), false)
    assert.equal(cheapestStoreKeyFromPrices(prices, ['rema-1000', 'løvbjerg'], items), 'rema-1000')
  })
})
