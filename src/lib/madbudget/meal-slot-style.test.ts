import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  applyMealSlotStylesToGrid,
  inferBreakfastStyle,
  inferLunchStyle,
  mealsPerDayFromStyles,
  recipeFitsBreakfastStyle,
  recipeFitsLunchStyle,
  recipeFitsSlotStyle,
  recipePrepMinutes,
} from './meal-slot-style'

describe('meal-slot-style', () => {
  it('udleder mealsPerDay fra stil', () => {
    assert.deepEqual(mealsPerDayFromStyles('skip', 'skip'), ['dinner'])
    assert.deepEqual(mealsPerDayFromStyles('fast', 'skip'), ['dinner', 'breakfast'])
    assert.deepEqual(mealsPerDayFromStyles('skip', 'leftovers'), ['dinner', 'lunch'])
    assert.deepEqual(mealsPerDayFromStyles('home', 'packed'), ['dinner', 'breakfast', 'lunch'])
  })

  it('gætter stil for eksisterende profiler uden at slå rester til', () => {
    assert.equal(inferBreakfastStyle(['dinner', 'breakfast', 'lunch']), 'fast')
    assert.equal(inferLunchStyle(['dinner', 'breakfast', 'lunch']), 'home')
    assert.equal(inferBreakfastStyle(['dinner']), 'skip')
    assert.equal(inferLunchStyle(['dinner'], 'leftovers'), 'leftovers')
  })

  it('læser minutter fra prepTime-strenge', () => {
    assert.equal(recipePrepMinutes({ prepTime: '10 min' }), 10)
    assert.equal(recipePrepMinutes({ preparationTime: 8 }), 8)
  })

  it('hurtig morgenmad foretrækker æg og kort tid', () => {
    assert.equal(
      recipeFitsBreakfastStyle({ title: 'Spejlæg med bacon', prepTime: '8 min' }, 'fast'),
      true
    )
    assert.equal(
      recipeFitsBreakfastStyle({ title: 'Bagte æggefade i ovn', prepTime: '35 min' }, 'fast'),
      false
    )
    assert.equal(
      recipeFitsBreakfastStyle({ title: 'Æggekage i ovn', prepTime: '25 min' }, 'home'),
      true
    )
  })

  it('madpakke-frokost matcher salat og wrap', () => {
    assert.equal(recipeFitsLunchStyle({ title: 'Keto-salat med kylling' }, 'packed'), true)
    assert.equal(recipeFitsLunchStyle({ title: 'Karrygryde med ris' }, 'packed'), false)
    assert.equal(recipeFitsLunchStyle({ title: 'Karrygryde med ris' }, 'home'), true)
  })

  it('anbefalet-filter følger profilens stil', () => {
    const profile = { dietaryApproach: 'keto', breakfastStyle: 'fast' as const, lunchStyle: 'packed' as const }
    assert.equal(
      recipeFitsSlotStyle({ title: 'Omelet med ost', prepTime: '7 min' }, 'breakfast', profile),
      true
    )
    assert.equal(
      recipeFitsSlotStyle({ title: 'Grøn frokostsalat' }, 'lunch', profile),
      true
    )
    assert.equal(recipeFitsSlotStyle({ title: 'Lasagne' }, 'dinner', profile), true)
  })

  it('lægger rester på frokost når stilen er leftovers', () => {
    const grid = {
      monday: { breakfast: null, lunch: { title: 'Salat' }, dinner: { id: '1', title: 'Karry', calories: 500 } },
      tuesday: { breakfast: null, lunch: { title: 'Wrap' }, dinner: null },
      wednesday: { breakfast: null, lunch: null, dinner: null },
      thursday: { breakfast: null, lunch: null, dinner: null },
      friday: { breakfast: null, lunch: null, dinner: null },
      saturday: { breakfast: null, lunch: null, dinner: null },
      sunday: { breakfast: null, lunch: null, dinner: null },
    }
    const next = applyMealSlotStylesToGrid(grid, { lunchStyle: 'leftovers' })
    assert.equal((next.tuesday.lunch as { title?: string }).title, 'Rester: Karry')
    assert.equal((next.monday.dinner as { extraShoppingPortions?: number }).extraShoppingPortions, 1)
  })
})
