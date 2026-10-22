import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { applyCookAhead, clearLeftoversFromSource } from './cook-ahead'
import {
  accidentalLeftoverAmount,
  perPortionAmount,
} from '../diary/accidental-leftover'
import {
  applyNextDayLunchLeftover,
  extraShoppingPortions,
  gridHasPlannedExtraPortions,
  leftoverSlotAction,
  removeNextDayLunchLeftover,
  replaceMealKeepingLeftovers,
  shoppingPeopleEating,
  stripOrphanExtraPortions,
} from './next-lunch-leftover'

type Cell = Record<string, unknown> | null

function emptyGrid() {
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
  const grid: Record<string, { breakfast: Cell; lunch: Cell; dinner: Cell }> = {}
  for (const day of days) {
    grid[day] = { breakfast: null, lunch: null, dinner: null }
  }
  return grid
}

function dinner(title: string, calories = 500) {
  return {
    id: title,
    slug: title.toLowerCase(),
    title,
    calories,
    protein: 30,
    ingredients: [{ name: 'kylling', amount: 400, unit: 'g' }],
    servings: 4,
    recipeServings: 4,
    householdServings: 4,
  }
}

describe('planlagte rester til frokost dagen efter', () => {
  it('lægger én ekstra portion på aftensmaden og en rester-frokost med fuld næring', () => {
    const grid = emptyGrid()
    grid.thursday.dinner = dinner('Karry', 500)
    const result = applyNextDayLunchLeftover(grid, 'thursday')
    assert.equal(result.ok, true)
    if (!result.ok) return
    assert.equal(extraShoppingPortions(result.grid.thursday.dinner), 1)
    assert.equal(shoppingPeopleEating(4, result.grid.thursday.dinner), 5)
    const lunch = result.grid.friday.lunch as Record<string, unknown>
    assert.equal(lunch.isLeftover, true)
    assert.equal(lunch.leftoverKind, 'next-lunch')
    assert.equal(lunch.title, 'Rester: Karry')
    assert.equal(lunch.calories, 500)
    assert.deepEqual(lunch.ingredients, [])
    assert.equal(
      ((result.grid.thursday.dinner as Record<string, unknown>).ingredients as unknown[]).length,
      1
    )
  })

  it('den ekstra portion ændrer indkøbsmængden, som pris-cachen nøgler på', () => {
    const without = shoppingPeopleEating(4, {})
    const withLeftover = shoppingPeopleEating(4, { extraShoppingPortions: 1 })
    const recipeServings = 4
    const baseAmount = 400
    const amountFor = (people: number) => baseAmount * (people / recipeServings)
    const key = (amount: number) => `rema:${amount}:g`
    assert.equal(amountFor(without), 400)
    assert.equal(amountFor(withLeftover), 500)
    assert.notEqual(key(amountFor(without)), key(amountFor(withLeftover)))
  })

  it('spørger før en optaget frokost overskrives og rører ikke en låst plads', () => {
    const grid = emptyGrid()
    grid.thursday.dinner = dinner('Karry')
    grid.friday.lunch = dinner('Salat')
    const occupied = applyNextDayLunchLeftover(grid, 'thursday')
    assert.equal(occupied.ok, false)
    if (occupied.ok) return
    assert.equal(occupied.reason, 'occupied')
    assert.equal(occupied.occupiedTitle, 'Salat')
    assert.equal(grid.friday.lunch && (grid.friday.lunch as Record<string, unknown>).title, 'Salat')

    const locked = applyNextDayLunchLeftover(grid, 'thursday', {
      overwrite: true,
      isLocked: (day, meal) => day === 'friday' && meal === 'lunch',
    })
    assert.equal(locked.ok, false)
    if (locked.ok) return
    assert.equal(locked.reason, 'locked')
    assert.equal((grid.friday.lunch as Record<string, unknown>).title, 'Salat')

    const replaced = applyNextDayLunchLeftover(grid, 'thursday', { overwrite: true })
    assert.equal(replaced.ok, true)
    if (!replaced.ok) return
    assert.equal((replaced.grid.friday.lunch as Record<string, unknown>).title, 'Rester: Karry')
  })

  it('sletning og skift af kilde-retten tager resterne med', () => {
    const grid = emptyGrid()
    grid.thursday.dinner = dinner('Karry', 500)
    const planned = applyNextDayLunchLeftover(grid, 'thursday')
    assert.equal(planned.ok, true)
    if (!planned.ok) return

    const swapped = replaceMealKeepingLeftovers(planned.grid, 'thursday', 'dinner', dinner('Lasagne', 700))
    assert.equal((swapped.thursday.dinner as Record<string, unknown>).title, 'Lasagne')
    assert.equal(extraShoppingPortions(swapped.thursday.dinner), 1)
    const lunch = swapped.friday.lunch as Record<string, unknown>
    assert.equal(lunch.title, 'Rester: Lasagne')
    assert.equal(lunch.calories, 700)
    assert.equal(lunch.leftoverFromDay, 'thursday')

    const cleared = replaceMealKeepingLeftovers(swapped, 'thursday', 'dinner', null)
    assert.equal(cleared.thursday.dinner, null)
    assert.equal(cleared.friday.lunch, null)
  })

  it('fjerner den ekstra portion, når frokost-resterne slettes', () => {
    const grid = emptyGrid()
    grid.thursday.dinner = dinner('Karry')
    const planned = applyNextDayLunchLeftover(grid, 'thursday')
    assert.equal(planned.ok, true)
    if (!planned.ok) return
    const removed = removeNextDayLunchLeftover(planned.grid, 'thursday')
    assert.equal(removed.friday.lunch, null)
    assert.equal(extraShoppingPortions(removed.thursday.dinner), 0)
    assert.equal(gridHasPlannedExtraPortions(removed), false)
  })

  it('cook-ahead rører ikke frokost-resterne', () => {
    const grid = emptyGrid()
    grid.thursday.dinner = dinner('Karry')
    const planned = applyNextDayLunchLeftover(grid, 'thursday')
    assert.equal(planned.ok, true)
    if (!planned.ok) return
    const cooked = applyCookAhead(planned.grid, 'thursday', 'dinner', 2)
    assert.equal((cooked.friday.lunch as Record<string, unknown>).leftoverKind, 'next-lunch')
    assert.equal(extraShoppingPortions(cooked.thursday.dinner), 1)
    assert.equal((cooked.friday.dinner as Record<string, unknown>).isLeftover, true)
  })

  it('søndag har ingen frokost dagen efter i samme uge', () => {
    const grid = emptyGrid()
    grid.sunday.dinner = dinner('Steg')
    const result = applyNextDayLunchLeftover(grid, 'sunday')
    assert.equal(result.ok, false)
    if (result.ok) return
    assert.equal(result.reason, 'no-next-day')
    assert.equal(leftoverSlotAction(grid, 'sunday', 'dinner'), null)
    assert.equal(leftoverSlotAction(grid, 'monday', 'lunch'), null)
  })

  it('en forældreløs ekstra portion fjernes, når frokost-resterne ikke fulgte med', () => {
    const grid = emptyGrid()
    grid.thursday.dinner = { ...dinner('Karry'), extraShoppingPortions: 1 }
    const stripped = stripOrphanExtraPortions(grid)
    assert.equal(extraShoppingPortions(stripped.thursday.dinner), 0)
  })

  it('clear af samme måltid lader next-lunch være, indtil kilden slettes', () => {
    const grid = emptyGrid()
    grid.thursday.dinner = dinner('Karry')
    const planned = applyNextDayLunchLeftover(grid, 'thursday')
    assert.equal(planned.ok, true)
    if (!planned.ok) return
    const onlySameMeal = clearLeftoversFromSource(planned.grid, 'thursday', 'dinner')
    assert.equal((onlySameMeal.friday.lunch as Record<string, unknown>).leftoverKind, 'next-lunch')
    const withLunch = clearLeftoversFromSource(planned.grid, 'thursday', 'dinner', { includeNextLunch: true })
    assert.equal(withLunch.friday.lunch, null)
  })
})

describe('tilfældige rester i madloggen', () => {
  it('trækker 25 % fra én portion', () => {
    const per = perPortionAmount(800, 2)
    assert.equal(per, 400)
    assert.equal(accidentalLeftoverAmount(per ?? 0), 300)
    assert.equal(accidentalLeftoverAmount(perPortionAmount(500, 1) ?? 0), 375)
  })
})
