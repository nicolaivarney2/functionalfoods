import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  normalizeAiRecipeIngredients,
  normalizeAiRecipeInstructions,
} from './ai-recipe-ingredient-normalize'

describe('normalizeAiRecipeIngredients', () => {
  it('regner dåse, dl og efter smag om til systemets enheder', () => {
    const [beans, water, salt, dates] = normalizeAiRecipeIngredients([
      { name: 'sorte bønner', amount: 0.8, unit: 'dåse' },
      { name: 'kogende vand', amount: 0.8, unit: 'dl' },
      { name: 'salt', amount: 0, unit: 'efter smag' },
      { name: 'dadler', amount: 9, unit: '' },
    ])
    assert.equal(beans.unit, 'g')
    assert.equal(beans.amount, 320)
    assert.equal(water.unit, 'ml')
    assert.equal(water.amount, 80)
    assert.equal(salt.unit, 'tsk')
    assert.equal(salt.amount, 0.5)
    assert.equal(dates.unit, 'stk')
    assert.equal(dates.amount, 9)
  })

  it('gør grillet kylling til rå kyllingebryst', () => {
    const [chicken] = normalizeAiRecipeIngredients([
      { name: 'grillet kyllingebryst', amount: 250, unit: 'g' },
    ])
    assert.equal(chicken.name, 'kyllingebryst')
    assert.equal(chicken.notes, 'grillet')
  })

  it('ensretter butiksnavne, urter, æg, olie og broccoli', () => {
    const [parsley, eggs, oil, broccoli, onion, pepper] = normalizeAiRecipeIngredients([
      { name: 'persille', amount: 1, unit: 'bundt' },
      { name: 'æg', amount: 106, unit: 'g' },
      { name: 'rapsolie', amount: 27, unit: 'g' },
      { name: 'broccoli', amount: 350, unit: 'g' },
      { name: 'løg, finthakket', amount: 1, unit: 'stk' },
      { name: 'sort peber', amount: 1, unit: 'tsk' },
    ])
    assert.equal(parsley.name, 'frisk persille')
    assert.equal(parsley.unit, 'bundt')
    assert.equal(parsley.amount, 0.25)
    assert.equal(eggs.unit, 'stk')
    assert.equal(eggs.amount, 2)
    assert.equal(oil.name, 'olivenolie')
    assert.equal(oil.unit, 'spsk')
    assert.equal(broccoli.unit, 'stk')
    assert.equal(onion.name, 'løg')
    assert.equal(onion.notes, 'finthakket')
    assert.equal(pepper.name, 'peber')
    assert.equal(pepper.unit, 'tsk')
  })
})

describe('normalizeAiRecipeInstructions', () => {
  it('lægger «i kvarte» ind som første trin og fjerner noten', () => {
    const ingredients = [{ name: 'kartofler', amount: 500, unit: 'g', notes: 'i kvarte' }]
    const steps = normalizeAiRecipeInstructions(
      [{ stepNumber: 1, instruction: 'Vend [[ing:kartofler]] i [[ing:olivenolie]].' }],
      ingredients,
    )
    assert.match(steps[0].instruction, /Skær \[\[ing:kartofler\]\] i kvarte\./)
    assert.match(steps[1].instruction, /Vend \[\[ing:kartofler\]\]/)
    assert.equal(ingredients[0].notes, null)
  })

  it('laver et grill-trin i stedet for at købe grillet kylling', () => {
    const ingredients = [{ name: 'kyllingebryst', amount: 250, unit: 'g', notes: 'grillet' }]
    const steps = normalizeAiRecipeInstructions(
      [{ stepNumber: 1, instruction: 'Skær [[ing:kyllingebryst]] i skiver.' }],
      ingredients,
    )
    assert.match(steps[0].instruction, /Grill \[\[ing:kyllingebryst\]\]\./)
    assert.equal(ingredients[0].notes, null)
  })

  it('beholder frosne som note, fordi det er sådan varen købes', () => {
    const ingredients = [{ name: 'ærter', amount: 200, unit: 'g', notes: 'frosne' }]
    const steps = normalizeAiRecipeInstructions(
      [{ stepNumber: 1, instruction: 'Tilsæt [[ing:ærter]] til sidst.' }],
      ingredients,
    )
    assert.match(steps[0].instruction, /ærter\]\], frosne/)
    assert.equal(ingredients[0].notes, 'frosne')
  })
})
