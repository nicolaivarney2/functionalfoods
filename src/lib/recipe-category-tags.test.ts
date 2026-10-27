import assert from 'node:assert/strict'
import test from 'node:test'
import {
  categoriesForGeneratedRecipe,
  mealCategoryFromMaaltid,
  partitionRecipeCategories,
  recipeHasCategory,
} from './recipe-category-tags'

test('frokost fra AI-generering bliver kategorien Frokost', () => {
  assert.equal(mealCategoryFromMaaltid('frokost'), 'Frokost')
  assert.equal(mealCategoryFromMaaltid(' Frokost '), 'Frokost')
  const tags = categoriesForGeneratedRecipe('Sund mad', 'frokost')
  assert.equal(tags.mainCategory, 'Frokost')
  assert.deepEqual(tags.subCategories, ['Sund mad'])
})

test('morgenmad, aftensmad, dessert og snack mappes til kendte kategorier', () => {
  assert.equal(categoriesForGeneratedRecipe('Sund mad', 'morgenmad').mainCategory, 'Morgenmad')
  assert.equal(categoriesForGeneratedRecipe('Sund mad', 'aftensmad').mainCategory, 'Aftensmad')
  assert.equal(categoriesForGeneratedRecipe('Sund mad', 'dessert').mainCategory, 'Desserter')
  assert.equal(categoriesForGeneratedRecipe('Sund mad', 'snacks').mainCategory, 'Snack')
})

test('uden måltid beholdes niche-kategorien', () => {
  const tags = categoriesForGeneratedRecipe('Hovedretter', null)
  assert.equal(tags.mainCategory, 'Hovedretter')
  assert.deepEqual(tags.subCategories, [])
})

test('klik på Frokost lægger den på uden at smide Sund mad væk', () => {
  const split = partitionRecipeCategories(
    ['Sund mad', 'Keto', 'Frokost'],
    ['Aftensmad', 'Frokost', 'Morgenmad', 'Salater'],
    ['Keto', 'Sense']
  )
  assert.equal(split.mainCategory, 'Frokost')
  assert.deepEqual(split.subCategories, ['Sund mad'])
  assert.deepEqual(split.dietaryCategories, ['Keto'])
  assert.equal(recipeHasCategory(split, 'Frokost'), true)
})

test('fjernelse af Frokost falder tilbage til den gamle kategori', () => {
  const split = partitionRecipeCategories(
    ['Sund mad', 'Keto'],
    ['Aftensmad', 'Frokost', 'Morgenmad'],
    ['Keto'],
    'Frokost'
  )
  assert.equal(split.mainCategory, 'Sund mad')
  assert.equal(recipeHasCategory(split, 'Frokost'), false)
})
