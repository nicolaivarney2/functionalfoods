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
    assert.equal(parsley.name, 'persille')
    assert.equal(parsley.unit, 'tsk')
    assert.equal(parsley.amount, 0.5)
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

  it('kalder revet blomkål for frostposen blomkålsris', () => {
    const [rice] = normalizeAiRecipeIngredients([{ name: 'revet blomkål', amount: 1, unit: 'stk' }])
    assert.equal(rice.name, 'blomkålsris')
    assert.equal(rice.notes, 'frosne')
    assert.equal(rice.amount, 400)
    assert.equal(rice.unit, 'g')

    const named = normalizeAiRecipeIngredients([{ name: 'blomkålsris', amount: 400, unit: 'g' }])[0]
    assert.equal(named.name, 'blomkålsris')
    assert.equal(named.notes, 'frosne')
    assert.equal(named.amount, 400)

    const head = normalizeAiRecipeIngredients([{ name: 'blomkål', amount: 1, unit: 'stk' }])[0]
    assert.equal(head.name, 'blomkål')
  })

  it('lander fløde som madlavningsfløde 18% og lader piskefløde være piskefløde', () => {
    const cooking = normalizeAiRecipeIngredients([{ name: 'fløde', amount: 2.5, unit: 'dl' }])[0]
    assert.equal(cooking.name, 'madlavningsfløde 18%')
    assert.equal(cooking.amount, 150)
    assert.equal(cooking.unit, 'ml')

    const named = normalizeAiRecipeIngredients([{ name: 'madlavningsfløde', amount: 100, unit: 'ml' }])[0]
    assert.equal(named.name, 'madlavningsfløde 18%')
    assert.equal(named.amount, 100)

    const whip = normalizeAiRecipeIngredients([{ name: 'piskefløde', amount: 200, unit: 'ml' }])[0]
    assert.equal(whip.name, 'piskefløde')
    assert.equal(whip.amount, 100)

    const heavy = normalizeAiRecipeIngredients([{ name: 'fløde 38%', amount: 50, unit: 'ml' }])[0]
    assert.equal(heavy.name, 'piskefløde')
    assert.equal(heavy.amount, 50)

    const cheese = normalizeAiRecipeIngredients([{ name: 'flødeost', amount: 100, unit: 'g' }])[0]
    assert.equal(cheese.name, 'flødeost')

    const steps = normalizeAiRecipeInstructions(
      [{ stepNumber: 1, instruction: 'Hæld [[ing:fløde]] i gryden.' }],
      [cooking],
    )
    assert.match(steps[0].instruction, /\[\[ing:madlavningsfløde 18%\]\]/)
  })

  it('skiller broccoliris fra broccoli i sovsen og sætter et halvt hoved', () => {
    const rice = normalizeAiRecipeIngredients([{ name: 'broccoliris', amount: 200, unit: 'g' }])[0]
    assert.equal(rice.name, 'broccoli')
    assert.equal(rice.notes, 'til ris-tilbehør')
    assert.equal(rice.amount, 0.5)
    assert.equal(rice.unit, 'stk')

    const named = normalizeAiRecipeIngredients([
      { name: 'broccoli til ris tilbehør', amount: 1, unit: 'stk' },
    ])[0]
    assert.equal(named.name, 'broccoli')
    assert.equal(named.amount, 0.5)
    assert.equal(named.notes, 'til ris-tilbehør')

    const vegetable = normalizeAiRecipeIngredients([{ name: 'broccoli', amount: 1, unit: 'stk' }])[0]
    assert.equal(vegetable.name, 'broccoli')
    assert.equal(vegetable.amount, 1)
    assert.equal(vegetable.notes, null)
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

  it('sætter cherrytomater i gram og krydderurter som krydderi fra glas', () => {
    const [few, many, grams, parsley, basil, oregano] = normalizeAiRecipeIngredients([
      { name: 'cherrytomater', amount: 2, unit: 'stk' },
      { name: 'cherry tomater', amount: 10, unit: 'stk' },
      { name: 'cherrytomater', amount: 120, unit: 'g' },
      { name: 'frisk persille', amount: 0.25, unit: 'bundt' },
      { name: 'basilikum', amount: 1, unit: 'bundt' },
      { name: 'oregano', amount: 0.5, unit: 'tsk' },
    ])
    assert.equal(few.name, 'cherrytomater')
    assert.equal(few.unit, 'g')
    assert.equal(few.amount, 20)
    assert.equal(many.unit, 'g')
    assert.equal(many.amount, 100)
    assert.equal(grams.amount, 120)
    assert.equal(grams.unit, 'g')
    assert.equal(parsley.name, 'persille')
    assert.equal(parsley.unit, 'tsk')
    assert.equal(parsley.amount, 0.5)
    assert.equal(parsley.notes, null)
    assert.equal(basil.name, 'basilikum')
    assert.equal(basil.unit, 'tsk')
    assert.equal(oregano.name, 'oregano')
    assert.equal(oregano.amount, 0.5)

    const steps = normalizeAiRecipeInstructions(
      [{ stepNumber: 1, instruction: 'Halvér [[ing:cherrytomater]] og drys med [[ing:frisk persille]].' }],
      [few, parsley],
    )
    assert.match(steps[0].instruction, /\[\[ing:cherrytomater\]\]/)
    assert.match(steps[0].instruction, /\[\[ing:persille\]\]/)
    assert.doesNotMatch(steps[0].instruction, /frisk persille/)
  })
})
