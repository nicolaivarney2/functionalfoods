import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { quickRecipeRangeInstruction } from './quick-recipe-ranges'

describe('quickRecipeRangeInstruction', () => {
  it('holder keto inde i hele 0–3-skalaen', () => {
    const text = quickRecipeRangeInstruction('keto')
    assert.match(text, /Protein-fokus 0–3/)
    assert.match(text, /Fedt-indhold 0–3/)
    assert.match(text, /Kulhydrat-strikthed 0–3/)
    assert.match(text, /maks 10 g netto/)
    assert.match(text, /op til 25 g netto/)
    assert.match(text, /Kompleksitet 0–3/)
    assert.match(text, /5–7 ingredienser/)
    assert.match(text, /10\+ ingredienser/)
  })

  it('dækker sense, glp1 og familiemad med hele intervallet', () => {
    assert.match(quickRecipeRangeInstruction('sense'), /ingen stivelse/)
    assert.match(quickRecipeRangeInstruction('sense'), /øvre ende/)
    assert.match(quickRecipeRangeInstruction('glp1'), /Fiber-fokus 0–3/)
    assert.match(quickRecipeRangeInstruction('glp1'), /mæthedsprofil 0–3/)
    assert.match(quickRecipeRangeInstruction('familiemad'), /One-pot 0–3/)
    assert.match(quickRecipeRangeInstruction('familiemad'), /Børnefavorit 0–3/)
  })
})
