'use client'

import { useState } from 'react'
import { Recipe } from '@/types/recipe'

interface InstructionsListProps {
  recipe: Recipe
}

export default function InstructionsList({ recipe }: InstructionsListProps) {
  const [checkedSteps, setCheckedSteps] = useState<Set<string>>(new Set())

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
        {/* Render instruction groups if they exist, otherwise render individual steps */}
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
                      key={step.id} 
                      className={`flex space-x-4 cursor-pointer transition-colors ${
                        isChecked ? 'opacity-75' : ''
                      }`}
                      onClick={() => toggleStep(step.id)}
                    >
                      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold transition-colors ${
                        isChecked 
                          ? 'bg-green-600 text-white' 
                          : 'bg-green-600 text-white hover:bg-green-700'
                      }`}>
                        {isChecked ? '✓' : step.stepNumber}
                      </div>
                      <div className="flex-1">
                        <p className={`text-gray-900 leading-relaxed transition-all ${
                          isChecked ? 'line-through text-gray-500' : ''
                        }`}>
                          {step.instruction}
                        </p>
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
                key={step.id} 
                className={`flex space-x-4 cursor-pointer transition-colors ${
                  isChecked ? 'opacity-75' : ''
                }`}
                onClick={() => toggleStep(step.id)}
              >
                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold transition-colors ${
                  isChecked 
                    ? 'bg-green-600 text-white' 
                    : 'bg-green-600 text-white hover:bg-green-700'
                }`}>
                  {isChecked ? '✓' : step.stepNumber}
                </div>
                <div className="flex-1">
                  <p className={`text-gray-900 leading-relaxed transition-all ${
                    isChecked ? 'line-through text-gray-500' : ''
                  }`}>
                    {step.instruction}
                  </p>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
} 