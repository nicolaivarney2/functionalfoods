import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { resolveRecipeCall, recipeGenerationTemperature } from './ff-recipe-prompt'
import { familiesForNiche, ketoDinnerSideIssue, pickLeastUsedFamily } from './recipe-dish-family'

describe('ketoDinnerSideIssue', () => {
  it('afviser flødesovs hvor grønkål og champignon ligger i sovsen', () => {
    const issue = ketoDinnerSideIssue('Hakket svinekød i fløde med grønkål', [
      { name: 'hakket svinekød', amount: 350, unit: 'g' },
      { name: 'grønkål', amount: 150, unit: 'g' },
      { name: 'champignon', amount: 150, unit: 'g' },
      { name: 'fløde', amount: 200, unit: 'ml' },
    ])
    assert.match(issue || '', /mangler tilbehør/)
  })

  it('godkender blomkålsris, spidskål og en salat som hele retten', () => {
    assert.equal(
      ketoDinnerSideIssue('Svinekød i fløde', [{ name: 'blomkålsris', amount: 400, unit: 'g' }]),
      null,
    )
    assert.match(
      ketoDinnerSideIssue('Svinekød i fløde', [{ name: 'blomkål', amount: 400, unit: 'g' }]) || '',
      /blomkålsris/,
    )
    assert.equal(
      ketoDinnerSideIssue('Koteletter', [{ name: 'spidskål', amount: 1, unit: 'stk' }]),
      null,
    )
    assert.equal(
      ketoDinnerSideIssue('Koteletter', [
        { name: 'broccoli', amount: 0.5, unit: 'stk', notes: 'til ris-tilbehør' },
      ]),
      null,
    )
    assert.match(
      ketoDinnerSideIssue('Koteletter', [{ name: 'broccoli', amount: 1, unit: 'stk' }]) || '',
      /til ris-tilbehør/,
    )
    assert.equal(ketoDinnerSideIssue('Cæsarsalat med kylling', [{ name: 'kylling', amount: 300, unit: 'g' }]), null)
    assert.equal(
      ketoDinnerSideIssue('Oksekød', [{ name: 'blomkål', amount: 150, unit: 'g' }]),
      ketoDinnerSideIssue('Oksekød', []),
    )
  })
})

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
    assert.match(call.systemPrompt, /AFTENSMAD/)
    assert.match(call.systemPrompt, /færdigt måltid/)
    assert.match(call.systemPrompt, /Grønt i sovsen er ikke tilbehør/)
    assert.match(call.systemPrompt, /400 g blomkålsris/)
    assert.match(call.systemPrompt, /0,5 stk broccoli/)
    assert.match(call.systemPrompt, /100 g pr\. person/)
    assert.match(call.systemPrompt, /Hold dig til det spor/)
    assert.doesNotMatch(call.systemPrompt, /UNDTAGELSE FRA OLIVENOLIE/)
    assert.doesNotMatch(call.systemPrompt, /madpakke|børnene/)
  })

  it('gør keto-frokost nem og skifter mellem salat, wrap og tærte', () => {
    const call = resolveRecipeCall({ niche: 'keto', mealType: 'frokost' })
    assert.equal(call.mode, 'free')
    assert.match(call.systemPrompt, /FROKOST/)
    assert.match(call.systemPrompt, /Nemt, men lækkert/)
    assert.match(call.systemPrompt, /croutoner/)
    assert.match(call.systemPrompt, /æggecrepe|ostewrap/i)
    assert.match(call.userPrompt, /^Generer én keto-opskrift til 2\. Det skal være frokost:/)
    assert.ok(call.familyLabel)
  })

  it('skiller keto-morgenmad på tid uden at låse én ret', () => {
    const call = resolveRecipeCall({ niche: 'keto', mealType: 'morgenmad' })
    assert.match(call.systemPrompt, /MORGENMAD/)
    assert.match(call.systemPrompt, /5–10 minutter/)
    assert.match(call.systemPrompt, /ikke skabelonen/)
    assert.match(call.systemPrompt, /chiapudding/i)
    assert.match(call.systemPrompt, /mandelmel/)
    assert.match(call.userPrompt, /morgenmad:/)
  })

  it('kan lave fedtkaffe som en keto-snack blandt andre', () => {
    const call = resolveRecipeCall({ niche: 'keto', mealType: 'snacks' })
    assert.match(call.systemPrompt, /SNACKS/)
    assert.match(call.systemPrompt, /fedtkaffe/)
    assert.match(call.systemPrompt, /MCT-olie/)
    assert.match(call.systemPrompt, /ikke den eneste/)
    assert.match(call.systemPrompt, /UNDTAGELSE FRA OLIVENOLIE/)
  })

  it('beholder keto-måltidet når brugeren har et ønske', () => {
    const call = resolveRecipeCall({
      niche: 'keto',
      mealType: 'morgenmad',
      wish: 'røræg',
    })
    assert.equal(call.mode, 'wish')
    assert.equal(call.familyLabel, null)
    assert.match(call.systemPrompt, /MORGENMAD/)
    assert.match(call.userPrompt, /røræg/)
    assert.doesNotMatch(call.systemPrompt, /DENNE GANG:/)
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
    assert.doesNotMatch(source.userPrompt, /MÅLTID:/)
  })

  it('beholder måltid og quick-interval når kilden er et link', () => {
    const call = resolveRecipeCall({
      niche: 'keto',
      mealType: 'frokost',
      constraints: ['Kulhydrat-strikthed 0–3'],
      sourceRecipe: {
        url: 'https://example.com/frokost',
        title: 'Kyllingesalat',
        ingredientsText: 'kylling',
        instructionsText: 'Bland.',
      },
    })
    assert.equal(call.mode, 'source')
    assert.match(call.userPrompt, /MÅLTID: frokost/)
    assert.match(call.userPrompt, /Kulhydrat-strikthed 0–3/)
    assert.match(call.systemPrompt, /FROKOST/)
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
