'use client'

import { useMemo, useState } from 'react'
import Image from 'next/image'
import type { Ingredient, IngredientGroup, InstructionGroup, RecipeStep } from '@/types/recipe'
import { formatScaledIngredientAmount } from '@/lib/recipe-ingredient-amount'
import {
  collectRecipeIngredients,
  expandIngredientTagsInInstruction,
} from '@/lib/recipe-ingredient-tags'
import { PrintToolbar } from '@/components/print/PrintToolbar'

export type PrintRecipe = {
  title: string
  slug: string
  description: string
  shortDescription: string
  preparationTime: number
  cookingTime: number
  servings: number
  difficulty: string
  imageUrl: string
  imageAlt: string
  personalTips: string
  calories: number
  protein: number
  carbs: number
  fat: number
  fiber: number
  ingredients: Ingredient[]
  ingredientGroups?: IngredientGroup[]
  instructions: RecipeStep[]
  instructionGroups?: InstructionGroup[]
}

function plainText(value: string): string {
  return value
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ')
    .trim()
}

function formatMinutes(total: number): string {
  if (!Number.isFinite(total) || total <= 0) return ''
  const minutes = Math.round(total)
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest > 0 ? `${hours} t ${rest} min` : `${hours} t`
}

function formatQty(amount: number, unit: string, multiplier: number): string {
  if (!Number.isFinite(amount) || amount === 0) return ''
  const raw = formatScaledIngredientAmount(amount, unit, multiplier)
  return raw.replace(/(\d+)\.0(?=\s|$)/g, '$1').replace('.', ',')
}

function ingredientLine(ingredient: Ingredient, multiplier: number): string {
  const qty = formatQty(ingredient.amount, ingredient.unit, multiplier)
  const name = ingredient.name?.trim() || ''
  const base = `${qty} ${name}`.replace(/\s+/g, ' ').trim()
  const notes = ingredient.notes?.trim()
  return notes ? `${base} (${notes})` : base
}

function danishNumbers(text: string): string {
  return text.replace(/(\d+)\.0\b/g, '$1').replace(/(\d+)\.(\d+)/g, '$1,$2')
}

function stepText(instruction: string, ingredients: Ingredient[], multiplier: number): string {
  const expanded = expandIngredientTagsInInstruction(instruction, ingredients, multiplier)
  return danishNumbers(plainText(expanded))
}

export function RecipePrintView({
  recipe,
  autoprint = false,
}: {
  recipe: PrintRecipe
  autoprint?: boolean
}) {
  const baseServings = recipe.servings > 0 ? recipe.servings : 4
  const [servings, setServings] = useState(baseServings)
  const multiplier = baseServings > 0 ? servings / baseServings : 1
  const ingredients = useMemo(() => collectRecipeIngredients(recipe), [recipe])
  const intro = plainText(recipe.shortDescription || recipe.description || '')
  const totalTime = formatMinutes((recipe.preparationTime || 0) + (recipe.cookingTime || 0))
  const groups = recipe.ingredientGroups?.filter((group) => group.ingredients?.length) ?? []
  const instructionGroups = recipe.instructionGroups?.filter((group) => group.steps?.length) ?? []
  const flatSteps = instructionGroups.length > 0 ? [] : recipe.instructions || []
  const hasNutrition = [recipe.calories, recipe.protein, recipe.carbs, recipe.fat, recipe.fiber].some(
    (n) => Number(n) > 0
  )

  let stepNumber = 0

  return (
    <article className="mx-auto max-w-[720px] px-5 py-8 text-gray-950 print:max-w-none print:px-0 print:py-0">
      <PrintToolbar
        autoprint={autoprint}
        backHref={`/opskrift/${recipe.slug}`}
        backLabel="Tilbage til opskriften"
      />

      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Functional Foods</p>
      <h1 className="mt-1 text-3xl font-bold leading-tight">{recipe.title}</h1>

      <p className="mt-2 text-sm text-gray-700">
        {[
          totalTime ? `Tid ${totalTime}` : '',
          recipe.difficulty || '',
          `${servings} ${servings === 1 ? 'person' : 'personer'}`,
        ]
          .filter(Boolean)
          .join(' · ')}
      </p>

      <div className="no-print mt-4 flex items-center gap-3">
        <span className="text-sm text-gray-600">Antal personer</span>
        <button
          type="button"
          className="h-8 w-8 rounded-full border border-gray-300 text-lg leading-none"
          onClick={() => setServings((n) => Math.max(1, n - 1))}
          aria-label="Færre personer"
        >
          −
        </button>
        <span className="min-w-6 text-center font-semibold">{servings}</span>
        <button
          type="button"
          className="h-8 w-8 rounded-full border border-gray-300 text-lg leading-none"
          onClick={() => setServings((n) => Math.min(24, n + 1))}
          aria-label="Flere personer"
        >
          +
        </button>
      </div>

      {recipe.imageUrl ? (
        <div className="relative mt-5 h-52 w-full overflow-hidden rounded-md print:h-40">
          <Image
            src={recipe.imageUrl}
            alt={recipe.imageAlt || recipe.title}
            fill
            className="object-cover"
            sizes="720px"
          />
        </div>
      ) : null}

      {intro ? <p className="mt-5 text-base leading-relaxed">{intro}</p> : null}

      <h2 className="mt-8 border-b border-gray-300 pb-1 text-xl font-bold">
        Ingredienser
        <span className="ml-2 text-base font-normal text-gray-600">
          til {servings} {servings === 1 ? 'person' : 'personer'}
        </span>
      </h2>

      {groups.length > 0 ? (
        groups.map((group) => (
          <section key={group.id || group.name} className="mt-4">
            {group.name ? <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-600">{group.name}</h3> : null}
            <ul className="mt-2 space-y-1.5">
              {group.ingredients.map((ingredient, index) => (
                <li key={`${ingredient.rowId || ingredient.id}-${index}`} className="flex items-start gap-2 text-[15px] leading-snug">
                  <span className="mt-1 inline-block h-3 w-3 shrink-0 border border-gray-800" aria-hidden />
                  <span>{ingredientLine(ingredient, multiplier)}</span>
                </li>
              ))}
            </ul>
          </section>
        ))
      ) : (
        <ul className="mt-3 space-y-1.5">
          {ingredients.map((ingredient, index) => (
            <li key={`${ingredient.rowId || ingredient.id}-${index}`} className="flex items-start gap-2 text-[15px] leading-snug">
              <span className="mt-1 inline-block h-3 w-3 shrink-0 border border-gray-800" aria-hidden />
              <span>{ingredientLine(ingredient, multiplier)}</span>
            </li>
          ))}
        </ul>
      )}

      <h2 className="mt-8 border-b border-gray-300 pb-1 text-xl font-bold">Fremgangsmåde</h2>
      <ol className="mt-3 space-y-3">
        {(instructionGroups.length > 0 ? instructionGroups : [{ id: 'all', name: '', steps: flatSteps }]).map((group) => (
          <li key={group.id || group.name} className="list-none">
            {group.name ? <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-600">{group.name}</h3> : null}
            <ol className="space-y-3">
              {group.steps.map((step) => {
                stepNumber += 1
                const text = stepText(step.instruction, ingredients, multiplier)
                return (
                  <li key={step.id || stepNumber} className="flex gap-3 text-[15px] leading-relaxed">
                    <span className="w-6 shrink-0 font-semibold">{stepNumber}.</span>
                    <span>
                      {text}
                      {step.tips?.trim() ? (
                        <span className="mt-1 block text-sm italic text-gray-700">Tip: {plainText(step.tips)}</span>
                      ) : null}
                    </span>
                  </li>
                )
              })}
            </ol>
          </li>
        ))}
      </ol>

      {hasNutrition ? (
        <>
          <h2 className="mt-8 border-b border-gray-300 pb-1 text-xl font-bold">Næring pr. person</h2>
          <p className="mt-3 text-sm leading-relaxed">
            {[
              recipe.calories ? `${Math.round(recipe.calories)} kcal` : '',
              recipe.protein ? `${formatMacro(recipe.protein)} g protein` : '',
              recipe.carbs ? `${formatMacro(recipe.carbs)} g kulhydrat` : '',
              recipe.fat ? `${formatMacro(recipe.fat)} g fedt` : '',
              recipe.fiber ? `${formatMacro(recipe.fiber)} g fibre` : '',
            ]
              .filter(Boolean)
              .join(' · ')}
          </p>
          <p className="mt-1 text-xs text-gray-600">
            Næringstallene er pr. person. Ingrediensmængderne følger det valgte antal personer.
          </p>
        </>
      ) : null}

      {recipe.personalTips?.trim() ? (
        <>
          <h2 className="mt-8 border-b border-gray-300 pb-1 text-xl font-bold">Tip</h2>
          <p className="mt-3 text-[15px] leading-relaxed">{plainText(recipe.personalTips)}</p>
        </>
      ) : null}

      <p className="mt-10 text-xs text-gray-500">functionalfoods.dk/opskrift/{recipe.slug}</p>
    </article>
  )
}

function formatMacro(value: number): string {
  const rounded = Math.round(value * 10) / 10
  const text = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1)
  return text.replace('.', ',')
}
