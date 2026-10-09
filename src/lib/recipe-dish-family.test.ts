import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { resolveRecipeCall, recipeGenerationTemperature } from './ff-recipe-prompt'
import { familiesForNiche, pickLeastUsedFamily } from './recipe-dish-family'

describe('pickLeastUsedFamily', () => {
  it('vælger familien der er brugt mindst', () => {
    const families = familiesForNiche('proteinrig')
    const titles = Array.from({ length: 10 }, () => 'pastaret med oksekød')
    const label = pickLeastUsedFamily(titles, families)
    assert.notEqual(label, 'en pastaret')
    assert.ok(families.some((family) => family.label === label))
  })
})

describe('resolveRecipeCall', () => {
  it('låser keto og sætter DENNE GANG når ingen har navngivet retten', () => {
    const call = resolveRecipeCall({
      niche: 'keto',
      existingRecipes: [{ title: 'Omelet med spinat', dietaryCategories: ['Keto'] }],
      mealType: 'aftensmad',
    })
    assert.equal(call.mode, 'free')
    assert.equal(call.temperature, 0.85)
    assert.match(call.systemPrompt, /Højst ca\. 20 g netto kulhydrat/)
    assert.match(call.systemPrompt, /Nævn ikke Planomo/)
    assert.match(call.systemPrompt, new RegExp(`DENNE GANG: ${call.familyLabel}`))
    assert.match(call.userPrompt, /Generer én keto-opskrift til 2/)
    assert.doesNotMatch(call.systemPrompt, /madpakke|børnene/)
  })

  it('springer familien over ved fritekst og ved kildeopskrift', () => {
    const wish = resolveRecipeCall({
      niche: 'proteinrig',
      wish: 'miso-laks',
      existingRecipes: [{ title: 'Karry', dietaryCategories: ['Proteinrig kost'] }],
    })
    assert.equal(wish.mode, 'wish')
    assert.equal(wish.temperature, recipeGenerationTemperature('wish'))
    assert.equal(wish.familyLabel, null)
    assert.doesNotMatch(wish.systemPrompt, /DENNE GANG:/)
    assert.match(wish.userPrompt, /miso-laks/)
    assert.match(wish.systemPrompt, /30–40 g protein/)

    const source = resolveRecipeCall({
      niche: 'sense',
      sourceRecipe: {
        url: 'https://example.com/gryde',
        title: 'Oksegryde',
        ingredientsText: 'oksekød\nløg',
        instructionsText: 'Svits løgene.',
      },
    })
    assert.equal(source.mode, 'source')
    assert.equal(source.temperature, 0.35)
    assert.doesNotMatch(source.systemPrompt, /DENNE GANG:/)
    assert.match(source.userPrompt, /TILPAS KILDEOPSKRIFTEN/)
    assert.match(source.userPrompt, /Oksegryde/)
    assert.match(source.systemPrompt, /DET HER ER EN SENSE-RET/)
  })

  it('tæller kun titler fra samme niche', () => {
    const call = resolveRecipeCall({
      niche: 'fleksitarisk',
      existingRecipes: [
        { title: 'Pastaret', dietaryCategories: ['Keto'] },
        { title: 'Suppe med brød', dietaryCategories: ['Fleksitarisk'] },
      ],
    })
    assert.match(call.systemPrompt, /- Suppe med brød/)
    assert.doesNotMatch(call.systemPrompt, /- Pastaret/)
  })
})
