'use client'

import { useState } from 'react'
import { Recipe } from '@/types/recipe'
import {
  collectRecipeIngredients,
  formatIngredientTagLabel,
  parseInstructionWithIngredientTags,
  resolveTaggedIngredient,
} from '@/lib/recipe-ingredient-tags'

interface InstructionsListProps {
  recipe: Recipe
  servings: number
}

function InstructionRichText({
  instruction,
  ingredients,
  multiplier,
  isChecked,
}: {
  instruction: string
  ingredients: ReturnType<typeof collectRecipeIngredients>
  multiplier: number
  isChecked: boolean
}) {
  const parts = parseInstructionWithIngredientTags(instruction)

  return (
    <p
      className={`leading-relaxed transition-all ${
        isChecked ? 'line-through text-gray-500' : 'text-gray-900'
      }`}
    >
      {parts.map((part, index) => {
        if (part.type === 'text') {
          return <span key={index}>{part.value}</span>
        }

        const ingredient = resolveTaggedIngredient(part.id, ingredients)
        if (!ingredient) {
          return null
        }

        const label = formatIngredientTagLabel(ingredient, multiplier)
        return (
          <span
            key={index}
            title="Mængde fra ingredienslisten — følger antal personer"
            className={`mx-0.5 inline rounded-sm bg-emerald-50 px-1.5 py-0.5 font-medium text-emerald-900 ring-1 ring-inset ring-emerald-200/90 ${
              isChecked ? 'bg-emerald-50/60 text-emerald-400 ring-emerald-100' : ''
            }`}
          >
            {label}
          </span>
        )
      })}
    </p>
  )
}

export default function InstructionsList({ recipe, servings }: InstructionsListProps) {
  const [checkedSteps, setCheckedSteps] = useState<Set<string>>(new Set())
  const stepAnchorIds = new Map<string, string>()
  let stepPosition = 0

  const ingredients = collectRecipeIngredients(recipe)
  const multiplier = recipe.servings > 0 ? servings / recipe.servings : 1

  if (recipe.instructionGroups && recipe.instructionGroups.length > 0) {
    recipe.instructionGroups.forEach((group) => {
      group.steps.forEach((step) => {
        stepAnchorIds.set(step.id, `step-${++stepPosition}`)
      })
    })
  } else {
    recipe.instructions.forEach((step) => {
      stepAnchorIds.set(step.id, `step-${++stepPosition}`)
    })
  }

  const toggleStep = (stepId: string) => {
    const newChecked = new Set(checkedSteps)
    if (newChecked.has(stepId)) {
      newChecked.delete(stepId)
    } else {
      newChecked.add(stepId)
    }
    setCheckedSteps(newChecked)
  }

  return (
    <div id="instructions" className="md:col-span-2">
      <h2 className="text-2xl font-bold mb-6 text-gray-900">Fremgangsmåde</h2>
      <div className="space-y-8">
        {recipe.instructionGroups && recipe.instructionGroups.length > 0 ? (
          recipe.instructionGroups.map((group) => (
            <div key={group.id} className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2">
                {group.name}
              </h3>
              <div className="space-y-4 pl-4">
                {group.steps.map((step) => {
                  const isChecked = checkedSteps.has(step.id)
                  return (
                    <div
                      id={stepAnchorIds.get(step.id)}
                      key={step.id}
                      className={`flex space-x-4 cursor-pointer transition-colors ${
                        isChecked ? 'opacity-75' : ''
                      }`}
                      onClick={() => toggleStep(step.id)}
                    >
                      <div
                        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold transition-colors ${
                          isChecked
                            ? 'bg-green-600 text-white'
                            : 'bg-green-600 text-white hover:bg-green-700'
                        }`}
                      >
                        {isChecked ? '✓' : step.stepNumber}
                      </div>
                      <div className="flex-1">
                        <InstructionRichText
                          instruction={step.instruction}
                          ingredients={ingredients}
                          multiplier={multiplier}
                          isChecked={isChecked}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))
        ) : (
          recipe.instructions.map((step) => {
            const isChecked = checkedSteps.has(step.id)
            return (
              <div
                id={stepAnchorIds.get(step.id)}
                key={step.id}
                className={`flex space-x-4 cursor-pointer transition-colors ${
                  isChecked ? 'opacity-75' : ''
                }`}
                onClick={() => toggleStep(step.id)}
              >
                <div
                  className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold transition-colors ${
                    isChecked
                      ? 'bg-green-600 text-white'
                      : 'bg-green-600 text-white hover:bg-green-700'
                  }`}
                >
                  {isChecked ? '✓' : step.stepNumber}
                </div>
                <div className="flex-1">
                  <InstructionRichText
                    instruction={step.instruction}
                    ingredients={ingredients}
                    multiplier={multiplier}
                    isChecked={isChecked}
                  />
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
