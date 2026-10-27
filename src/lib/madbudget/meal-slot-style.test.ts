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
  slotRepeatUniqueCount,
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

  it('sætter 2–3 unikke retter pr. slot', () => {
    assert.equal(slotRepeatUniqueCount('breakfast', { breakfastStyle: 'repeat' }), 2)
    assert.equal(slotRepeatUniqueCount('breakfast', { breakfastStyle: 'fast' }), 3)
    assert.equal(slotRepeatUniqueCount('breakfast', { breakfastStyle: 'skip' }), null)
    assert.equal(slotRepeatUniqueCount('lunch', { lunchStyle: 'packed' }), 3)
    assert.equal(slotRepeatUniqueCount('lunch', { lunchStyle: 'leftovers' }), null)
  })

  it('gentager højst tre morgenmads- og frokostretter', () => {
    const grid = {
      monday: { breakfast: { id: 'b1', title: 'Yoghurt' }, lunch: { id: 'l1', title: 'Salat' }, dinner: null },
      tuesday: { breakfast: { id: 'b2', title: 'Æg' }, lunch: { id: 'l2', title: 'Wrap' }, dinner: null },
      wednesday: { breakfast: { id: 'b3', title: 'Grød' }, lunch: { id: 'l3', title: 'Tærte' }, dinner: null },
      thursday: { breakfast: { id: 'b4', title: 'Smoothie' }, lunch: { id: 'l4', title: 'Bowl' }, dinner: null },
      friday: { breakfast: { id: 'b5', title: 'Pandekager' }, lunch: { id: 'l5', title: 'Rugbrød' }, dinner: null },
      saturday: { breakfast: { id: 'b6', title: 'Omelet' }, lunch: { id: 'l6', title: 'Pita' }, dinner: null },
      sunday: { breakfast: { id: 'b7', title: 'Chia' }, lunch: { id: 'l7', title: 'Frittata' }, dinner: null },
    }
    const next = applyMealSlotStylesToGrid(grid, { breakfastStyle: 'fast', lunchStyle: 'packed' })
    const breakfastIds = Object.values(next).map((day) => (day.breakfast as { id?: string })?.id)
    const lunchIds = Object.values(next).map((day) => (day.lunch as { id?: string })?.id)
    assert.deepEqual([...new Set(breakfastIds)].sort(), ['b1', 'b2', 'b3'])
    assert.deepEqual([...new Set(lunchIds)].sort(), ['l1', 'l2', 'l3'])
    assert.equal(breakfastIds[3], 'b1')
    assert.equal(lunchIds[3], 'l1')
  })

  it('holder kun to morgenmadsretter når stilen er repeat', () => {
    const grid = {
      monday: { breakfast: { id: 'b1', title: 'Yoghurt' }, lunch: null, dinner: null },
      tuesday: { breakfast: { id: 'b2', title: 'Æg' }, lunch: null, dinner: null },
      wednesday: { breakfast: { id: 'b3', title: 'Grød' }, lunch: null, dinner: null },
      thursday: { breakfast: { id: 'b4', title: 'Smoothie' }, lunch: null, dinner: null },
      friday: { breakfast: { id: 'b5', title: 'Pandekager' }, lunch: null, dinner: null },
      saturday: { breakfast: { id: 'b6', title: 'Omelet' }, lunch: null, dinner: null },
      sunday: { breakfast: { id: 'b7', title: 'Chia' }, lunch: null, dinner: null },
    }
    const next = applyMealSlotStylesToGrid(grid, { breakfastStyle: 'repeat', lunchStyle: 'skip' })
    const breakfastIds = Object.values(next).map((day) => (day.breakfast as { id?: string })?.id)
    assert.deepEqual([...new Set(breakfastIds)].sort(), ['b1', 'b2'])
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
