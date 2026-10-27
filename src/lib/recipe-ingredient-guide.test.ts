import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  catalogSection,
  formatGuideAmount,
  formatGuideIngredient,
  medianAmount,
  renderRecipeIngredientGuide,
} from './recipe-ingredient-guide'

describe('recipe ingredient guide', () => {
  it('viser median og spænd, og markerer basisvarer', () => {
    assert.equal(formatGuideAmount(100), '100')
    assert.equal(formatGuideAmount(212.54), '212.5')
    assert.equal(medianAmount([50, 100, 150]), 100)

    const line = formatGuideIngredient({
      name: 'flødeost',
      category: 'Mejeri',
      basis: false,
      recipeIds: ['a', 'a', 'b'],
      units: [
        { unit: 'g', amounts: [50, 100, 150] },
        { unit: 'ml', amounts: [100] },
      ],
    })
    assert.match(line, /flødeost — g, typisk 100 \(50–150\); også ml, typisk 100\. 2 opskrifter\./)
    assert.doesNotMatch(line, /Basisvare/)
  })

  it('kataloget i prompten er et pejlemærke, ikke en lukket liste', () => {
    const markdown = renderRecipeIngredientGuide({
      recipeCount: 1,
      ingredients: [
        {
          name: 'radiser',
          category: 'Grøntsager',
          basis: false,
          recipeIds: ['a'],
          units: [{ unit: 'g', amounts: [30] }],
        },
      ],
    })
    assert.match(markdown, /Listen er ikke lukket/)
    assert.match(markdown, /## Grøntsager/)
    const prompt = catalogSection(markdown)
    assert.match(prompt, /FORETRUKNE INGREDIENSNANVE/)
    assert.match(prompt, /radiser — g, typisk 30/)
    assert.doesNotMatch(prompt, /## Keto/)
  })
})
