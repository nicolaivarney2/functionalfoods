import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { reconcileMealPlanDiary } from './diary-meal-plan-sync'

const dinner = (title: string, recipeId: string) => ({
  logged_date: '2026-10-27',
  meal_type: 'dinner',
  recipe_id: recipeId,
  title,
})

describe('reconcileMealPlanDiary', () => {
  it('fylder kun et tomt slot', () => {
    const result = reconcileMealPlanDiary({
      mode: 'fill',
      desired: [dinner('Lasagne', 'b')],
      existing: [],
    })
    assert.deepEqual(result.deleteIds, [])
    assert.equal(result.insert.length, 1)
  })

  it('lægger ikke en ny ret oven i en der allerede ligger', () => {
    const result = reconcileMealPlanDiary({
      mode: 'fill',
      desired: [dinner('Lasagne', 'b')],
      existing: [
        {
          id: 'old',
          logged_date: '2026-10-27',
          meal_type: 'dinner',
          source: 'recipe',
          recipe_id: 'a',
          title: 'Chili con carne',
        },
      ],
    })
    assert.deepEqual(result.insert, [])
  })

  it('udskifter den gamle opskrift med madplanens ret', () => {
    const result = reconcileMealPlanDiary({
      mode: 'update',
      desired: [dinner('Lasagne', 'b')],
      existing: [
        {
          id: 'old-recipe',
          logged_date: '2026-10-27',
          meal_type: 'dinner',
          source: 'recipe',
          recipe_id: 'a',
          title: 'Chili con carne',
        },
        {
          id: 'old-plan',
          logged_date: '2026-10-27',
          meal_type: 'dinner',
          source: 'meal-plan',
          recipe_id: 'a',
          title: 'Chili con carne',
        },
      ],
    })
    assert.deepEqual(result.deleteIds.sort(), ['old-plan', 'old-recipe'])
    assert.equal(result.insert[0]?.title, 'Lasagne')
  })

  it('fjerner en madplan-ret når slotet er tømt', () => {
    const result = reconcileMealPlanDiary({
      mode: 'update',
      desired: [],
      existing: [
        {
          id: 'gone',
          logged_date: '2026-10-27',
          meal_type: 'dinner',
          source: 'meal-plan',
          recipe_id: 'a',
          title: 'Chili con carne',
        },
      ],
    })
    assert.deepEqual(result.deleteIds, ['gone'])
    assert.deepEqual(result.insert, [])
  })

  it('lader en manuel logning blive', () => {
    const result = reconcileMealPlanDiary({
      mode: 'sync',
      desired: [dinner('Lasagne', 'b')],
      existing: [
        {
          id: 'manual',
          logged_date: '2026-10-27',
          meal_type: 'dinner',
          source: 'manual',
          recipe_id: null,
          title: 'Restemad',
        },
      ],
    })
    assert.deepEqual(result.deleteIds, [])
    assert.equal(result.insert.length, 1)
  })

  it('fjerner en gammel kopieret opskrift når planen ikke har slotet længere', () => {
    const result = reconcileMealPlanDiary({
      mode: 'sync',
      desired: [],
      existing: [
        {
          id: 'copied',
          logged_date: '2026-10-27',
          meal_type: 'breakfast',
          source: 'recipe',
          recipe_id: 'a',
          title: 'Havregrød',
        },
      ],
    })
    assert.deepEqual(result.deleteIds, ['copied'])
  })

  it('rører ikke en kopieret opskrift på et tomt slot ved almindelig opdatering', () => {
    const result = reconcileMealPlanDiary({
      mode: 'update',
      desired: [],
      existing: [
        {
          id: 'copied',
          logged_date: '2026-10-27',
          meal_type: 'breakfast',
          source: 'recipe',
          recipe_id: 'a',
          title: 'Havregrød',
        },
      ],
    })
    assert.deepEqual(result.deleteIds, [])
  })

  it('indsætter ikke en dublet når den samme ret allerede er kopieret ind', () => {
    const result = reconcileMealPlanDiary({
      mode: 'sync',
      desired: [dinner('Lasagne', 'b')],
      existing: [
        {
          id: 'copied',
          logged_date: '2026-10-27',
          meal_type: 'dinner',
          source: 'recipe',
          recipe_id: 'b',
          title: 'Lasagne',
        },
      ],
    })
    assert.deepEqual(result.deleteIds, [])
    assert.deepEqual(result.insert, [])
  })

  it('indsætter ikke en dublet når madplan-retten allerede er den rigtige', () => {
    const result = reconcileMealPlanDiary({
      mode: 'sync',
      desired: [dinner('Lasagne', 'b')],
      existing: [
        {
          id: 'keep',
          logged_date: '2026-10-27',
          meal_type: 'dinner',
          source: 'meal-plan',
          recipe_id: 'b',
          title: 'Lasagne',
        },
      ],
    })
    assert.deepEqual(result.deleteIds, [])
    assert.deepEqual(result.insert, [])
  })

  it('lægger ikke en afvist ret ind igen', () => {
    const result = reconcileMealPlanDiary({
      mode: 'update',
      desired: [dinner('Lasagne', 'b')],
      existing: [
        {
          id: 'dismissed',
          logged_date: '2026-10-27',
          meal_type: 'dinner',
          source: 'meal-plan-dismissed',
          recipe_id: 'a',
          title: 'Chili con carne',
        },
      ],
    })
    assert.deepEqual(result.deleteIds, [])
    assert.deepEqual(result.insert, [])
  })
})
