'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Recipe, type Ingredient, type IngredientGroup } from '@/types/recipe'
import ServingSizeAdjuster from './ServingSizeAdjuster'
import { recipeHasSenseSpisekasse } from '@/lib/sense-spisekasse'

interface DynamicIngredientsListProps {
  recipe: Recipe
  servings: number
  onServingsChange: (servings: number) => void
}

function formatIngredientLine(
  ingredient: Ingredient,
  calculateIngredientAmount: (amount: number, unit: string) => string
) {
  const qty = calculateIngredientAmount(ingredient.amount, ingredient.unit)
  const base = `${qty} ${ingredient.name}`.replace(/\s+/g, ' ').trim()
  if (ingredient.notes?.trim()) {
    return `${base} (${ingredient.notes.trim()})`
  }
  return base
}

interface SenseSpisekasseTableProps {
  groups: IngredientGroup[]
  calculateIngredientAmount: (amount: number, unit: string) => string
  checkedIngredients: Set<string>
  toggleIngredient: (id: string) => void
}

function SenseSpisekasseTable({
  groups,
  calculateIngredientAmount,
  checkedIngredients,
  toggleIngredient,
}: SenseSpisekasseTableProps) {
  return (
    <div className="rounded-xl border border-emerald-200 bg-white shadow-sm overflow-hidden ring-1 ring-emerald-900/5">
      <div className="bg-gradient-to-r from-emerald-50 via-white to-white px-4 py-3 border-b border-emerald-100">
        <h3 className="text-base font-semibold text-emerald-950 tracking-tight">
          Sådan fordeler du efter Sense-spisekassemodellen
        </h3>
        <p className="text-sm text-emerald-900/85 mt-1.5 leading-relaxed">
          Grupperne svarer til håndfuld 1+2 (grønt), 3 (protein), 4 (stivelse eller frugt), fedt og smagsgivere — vejledende for en typisk portion; du justerer efter sult.
        </p>
        <Link
          href="/sense/vaegttab"
          className="mt-2 inline-block text-sm font-medium text-emerald-800 underline decoration-emerald-400 underline-offset-2 hover:text-emerald-950"
        >
          Læs mere om Sense og spisekassen
        </Link>
      </div>
      <div className="divide-y divide-gray-100">
        {groups.map((group) => (
          <section key={group.id} className="px-4 py-3 sm:px-4 sm:py-3.5">
            <h4 className="mb-2 border-b border-emerald-100 pb-2 text-sm font-semibold text-emerald-900">
              {group.name}
            </h4>
            <ul className="m-0 list-none space-y-1.5 p-0">
              {group.ingredients.map((ingredient) => {
                const isChecked = checkedIngredients.has(ingredient.id)
                return (
                  <li key={ingredient.id}>
                    <button
                      type="button"
                      onClick={() => toggleIngredient(ingredient.id)}
                      className={`flex w-full max-w-full items-start gap-2 rounded-lg border px-2.5 py-2 text-left text-sm transition-colors ${
                        isChecked
                          ? 'border-emerald-300 bg-emerald-50/60 text-gray-500 line-through'
                          : 'border-gray-100 bg-gray-50/90 text-gray-900 hover:border-emerald-200/60 hover:bg-white'
                      }`}
                    >
                      <span
                        className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${
                          isChecked ? 'border-emerald-600 bg-emerald-600' : 'border-gray-300'
                        }`}
                        aria-hidden
                      >
                        {isChecked ? <span className="h-1.5 w-1.5 rounded-full bg-white" /> : null}
                      </span>
                      <span className="min-w-0 flex-1 leading-snug break-words">
                        {formatIngredientLine(ingredient, calculateIngredientAmount)}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  )
}

export default function DynamicIngredientsList({ recipe, servings, onServingsChange }: DynamicIngredientsListProps) {
  const [checkedIngredients, setCheckedIngredients] = useState<Set<string>>(new Set())
  const isSenseRecipe = (recipe.dietaryCategories || []).some((c) => String(c).toLowerCase() === 'sense')
  const hasSenseSpisekasseLayout = recipeHasSenseSpisekasse(recipe)

  // Calculate the multiplier based on current servings vs original servings
  const multiplier = servings / recipe.servings

  const calculateIngredientAmount = (amount: number, unit: string) => {
    const adjustedAmount = amount * multiplier
    
    // Handle common unit conversions
    if (unit === 'dl' && adjustedAmount >= 1) {
      return `${adjustedAmount.toFixed(1)} ${unit}`
    } else if (unit === 'g' && adjustedAmount >= 1) {
      return `${Math.round(adjustedAmount)} ${unit}`
    } else if (unit === 'kg' && adjustedAmount >= 0.1) {
      return `${adjustedAmount.toFixed(1)} ${unit}`
    } else if (unit === 'l' && adjustedAmount >= 0.1) {
      return `${adjustedAmount.toFixed(1)} ${unit}`
    } else if (unit === 'stk' || unit === 'stykker') {
      if (adjustedAmount < 1 && adjustedAmount > 0) {
        return `${adjustedAmount.toFixed(1)} ${unit}`
      } else {
        return `${Math.round(adjustedAmount)} ${unit}`
      }
    } else if (unit === 'tsk' || unit === 'spsk') {
      return `${adjustedAmount.toFixed(1)} ${unit}`
    } else {
      return `${adjustedAmount.toFixed(1)} ${unit}`
    }
  }

  const toggleIngredient = (ingredientId: string) => {
    const newChecked = new Set(checkedIngredients)
    if (newChecked.has(ingredientId)) {
      newChecked.delete(ingredientId)
    } else {
      newChecked.add(ingredientId)
    }
    setCheckedIngredients(newChecked)
  }

  return (
    <div id="ingredients" className="md:col-span-1">
      <h2 className="text-2xl font-bold mb-4 text-gray-900">Ingredienser</h2>

      {isSenseRecipe && !hasSenseSpisekasseLayout && (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50/90 px-4 py-3 text-sm text-emerald-950">
          <p className="font-semibold text-emerald-900">Sense og håndfulde</p>
          <p className="mt-1 leading-relaxed text-emerald-900/90">
            Den her opskrift viser ingredienser som én liste. Når opskriften oprettes med Sense-skabelonen (AI eller manuelle grupper), vises den klassiske fordeling i spisekassen her.
          </p>
          <Link
            href="/sense/vaegttab"
            className="mt-2 inline-block font-medium text-emerald-800 underline decoration-emerald-400 underline-offset-2 hover:text-emerald-950"
          >
            Læs mere om Sense og spisekassen
          </Link>
        </div>
      )}
      
      {/* Serving Size Adjustment */}
      <div className="mb-4">
        <ServingSizeAdjuster
          initialServings={recipe.servings}
          onServingsChange={onServingsChange}
        />
      </div>
      
      <div className="space-y-2">
        {recipe.ingredientGroups && recipe.ingredientGroups.length > 0 ? (
          hasSenseSpisekasseLayout ? (
            <SenseSpisekasseTable
              groups={recipe.ingredientGroups}
              calculateIngredientAmount={calculateIngredientAmount}
              checkedIngredients={checkedIngredients}
              toggleIngredient={toggleIngredient}
            />
          ) : (
            recipe.ingredientGroups.map((group) => (
              <div key={group.id} className="space-y-2">
                <h3 className="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-1">
                  {group.name}
                </h3>
                <div className="space-y-1 pl-2">
                  {group.ingredients.map((ingredient) => {
                    const isChecked = checkedIngredients.has(ingredient.id)
                    return (
                      <div
                        key={ingredient.id}
                        className={`flex cursor-pointer items-center space-x-2 rounded-md border border-gray-200 bg-white p-2 transition-colors ${
                          isChecked ? 'border-green-300 bg-green-50' : 'hover:bg-gray-50'
                        }`}
                        onClick={() => toggleIngredient(ingredient.id)}
                      >
                        <div
                          className={`flex h-3 w-3 flex-shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                            isChecked
                              ? 'border-green-500 bg-green-500'
                              : 'border-gray-300 hover:border-gray-400'
                          }`}
                        >
                          {isChecked && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                        </div>
                        <span className={`text-sm text-gray-900 ${isChecked ? 'text-gray-500 line-through' : ''}`}>
                          {formatIngredientLine(ingredient, calculateIngredientAmount)}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))
          )
        ) : (
          recipe.ingredients.map((ingredient) => {
            const isChecked = checkedIngredients.has(ingredient.id)
            return (
              <div 
                key={ingredient.id} 
                className={`flex items-center space-x-2 p-2 bg-white border border-gray-200 rounded-md cursor-pointer transition-colors ${
                  isChecked ? 'bg-green-50 border-green-300' : 'hover:bg-gray-50'
                }`}
                onClick={() => toggleIngredient(ingredient.id)}
              >
                <div className={`w-3 h-3 border-2 rounded-full flex items-center justify-center transition-colors flex-shrink-0 ${
                  isChecked 
                    ? 'border-green-500 bg-green-500' 
                    : 'border-gray-300 hover:border-gray-400'
                }`}>
                  {isChecked && (
                    <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                  )}
                </div>
                <span className={`text-sm text-gray-900 ${isChecked ? 'line-through text-gray-500' : ''}`}>
                  {calculateIngredientAmount(ingredient.amount, ingredient.unit)} {ingredient.name}
                </span>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
} 