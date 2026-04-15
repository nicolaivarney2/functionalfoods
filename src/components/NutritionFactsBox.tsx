'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { PieChart, ChevronDown, ChevronUp, X } from 'lucide-react'
import { resolveNicheWeightLossLink } from '@/lib/dietary-niche-weight-loss'

interface NutritionFactsBoxProps {
  calories: number
  protein: number
  carbs: number
  fat: number
  fiber: number
  servings: number
  vitamins?: { [key: string]: number }
  minerals?: { [key: string]: number }
  /** Bruges til dynamisk "Forstå [niche]"-link til den rigtige vægttab-side */
  dietaryCategories?: string[]
  /** Prøves først hvis den matcher en kendt niche (typisk er dette måltidstype og ignoreres) */
  mainCategory?: string | null
}

export default function NutritionFactsBox({
  calories,
  protein,
  carbs,
  fat,
  fiber,
  servings,
  vitamins = {},
  minerals = {},
  dietaryCategories,
  mainCategory,
}: NutritionFactsBoxProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [fridaModalOpen, setFridaModalOpen] = useState(false)
  const nicheLink = resolveNicheWeightLossLink(dietaryCategories, mainCategory)

  const dietaryList = (dietaryCategories || []).filter((c) => c?.trim())
  const hasMultipleDietaryCategories = dietaryList.length > 1

  useEffect(() => {
    if (!fridaModalOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFridaModalOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [fridaModalOpen])

  // Daglige anbefalinger (voksne)
  const dailyValues = {
    // Vitaminer
    'A': { amount: 800, unit: 'µg' },
    'C': { amount: 80, unit: 'mg' },
    'D': { amount: 5, unit: 'µg' },
    'E': { amount: 12, unit: 'mg' },
    'B1': { amount: 1.1, unit: 'mg' },
    'B2': { amount: 1.4, unit: 'mg' },
    'B3': { amount: 16, unit: 'mg' },
    'B6': { amount: 1.4, unit: 'mg' },
    'B12': { amount: 2.4, unit: 'µg' },
    'Folate': { amount: 400, unit: 'µg' },
    'K': { amount: 75, unit: 'µg' },
    // Mineraler
    'calcium': { amount: 800, unit: 'mg' },
    'iron': { amount: 14, unit: 'mg' },
    'magnesium': { amount: 375, unit: 'mg' },
    'phosphor': { amount: 700, unit: 'mg' },
    'potassium': { amount: 2000, unit: 'mg' },
    'zinc': { amount: 10, unit: 'mg' },
    'selenium': { amount: 55, unit: 'µg' },
    'sodium': { amount: 2300, unit: 'mg' } // Max anbefaling
  }

  // Generer dynamiske nutrition data baseret på props
  const generateNutritionData = () => {
    const vitaminData: { [key: string]: { amount: number, unit: string, dailyValue: number, percentage: number } } = {}
    const mineralData: { [key: string]: { amount: number, unit: string, dailyValue: number, percentage: number } } = {}

    // Process vitamins - værdierne fra API er allerede pr. portion
    Object.entries(vitamins).forEach(([vitaminKey, amount]) => {
      const dailyVal = dailyValues[vitaminKey as keyof typeof dailyValues]
      if (dailyVal && amount > 0) {
        const perServing = amount
        const percentage = Math.round((perServing / dailyVal.amount) * 100)
        const displayName = vitaminKey === 'B12' ? 'Vitamin B12' : 
                           vitaminKey === 'B6' ? 'Vitamin B6' :
                           vitaminKey === 'B1' ? 'Vitamin B1 (Thiamin)' :
                           vitaminKey === 'B2' ? 'Vitamin B2 (Riboflavin)' :
                           vitaminKey === 'B3' ? 'Vitamin B3 (Niacin)' :
                           vitaminKey === 'Folate' ? 'Folsyre' :
                           `Vitamin ${vitaminKey}`
        
        vitaminData[displayName] = {
          amount: Math.round(perServing * 100) / 100,
          unit: dailyVal.unit,
          dailyValue: dailyVal.amount,
          percentage
        }
      }
    })

    // Process minerals - værdierne fra API er allerede pr. portion
    Object.entries(minerals).forEach(([mineralKey, amount]) => {
      const dailyVal = dailyValues[mineralKey as keyof typeof dailyValues]
      if (dailyVal && amount > 0) {
        const perServing = amount
        const percentage = Math.round((perServing / dailyVal.amount) * 100)
        const displayName = mineralKey === 'calcium' ? 'Calcium' :
                           mineralKey === 'iron' ? 'Jern' :
                           mineralKey === 'magnesium' ? 'Magnesium' :
                           mineralKey === 'phosphor' ? 'Fosfor' :
                           mineralKey === 'potassium' ? 'Kalium' :
                           mineralKey === 'zinc' ? 'Zink' :
                           mineralKey === 'selenium' ? 'Selen' :
                           mineralKey === 'sodium' ? 'Natrium' : mineralKey
        
        mineralData[displayName] = {
          amount: Math.round(perServing * 100) / 100,
          unit: dailyVal.unit,
          dailyValue: dailyVal.amount,
          percentage
        }
      }
    })

    return { vitaminData, mineralData }
  }

  const { vitaminData, mineralData } = generateNutritionData()

  // Generer dynamiske highlights baseret på faktisk nutrition data
  const generateHighlights = () => {
    const highlights: string[] = []
    const allNutrients = { ...vitaminData, ...mineralData }

    // Find høje værdier (>= 100% af daglig anbefaling)
    Object.entries(allNutrients).forEach(([name, data]) => {
      if (data.percentage >= 133) {
        highlights.push(`Høj mængde ${name} (${data.percentage}% af daglig anbefaling)`)
      } else if (data.percentage >= 100) {
        highlights.push(`Indeholder betydelige mængder af ${name} (${data.percentage}% af daglig anbefaling)`)
      } else if (data.percentage >= 50) {
        highlights.push(`God kilde til ${name} (${data.percentage}% af daglig anbefaling)`)
      }
    })

    // Tilføj makro-nutrition highlights
    if (protein >= 20) {
      highlights.push(`Højt proteinindhold (${Math.round(protein)}g per portion)`)
    }
    if (carbs <= 5) {
      highlights.push(`Meget lavt kulhydratindhold (${Math.round(carbs)}g) - perfekt til keto`)
    }
    if (fiber >= 5) {
      highlights.push(`God kilde til kostfibre (${Math.round(fiber)}g)`)
    }

    // Begræns til top 4 highlights
    return highlights.slice(0, 4)
  }

  const highlights = generateHighlights()

  return (
    <div className="bg-gray-50 rounded-lg p-4 space-y-3 border border-gray-200">
      {/* Header */}
              <div className="flex items-center space-x-2">
          <PieChart size={16} className="text-gray-500" />
          <h3 className="text-sm font-medium text-gray-900">NÆRINGSINDHOLD PR. PORTION</h3>
        </div>



      {/* Basic Nutrition Grid */}
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="flex justify-between">
          <span className="text-gray-600">Kalorier:</span>
          <span className="font-medium">{Math.round(calories)} kcal</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Protein:</span>
          <span className="font-medium">{Math.round(protein * 10) / 10}g</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Kulhydrater:</span>
          <span className="font-medium">{Math.round(carbs * 10) / 10}g</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Fedt:</span>
          <span className="font-medium">{Math.round(fat * 10) / 10}g</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Fiber:</span>
          <span className="font-medium">{Math.round(fiber * 10) / 10}g</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Portioner:</span>
          <span className="font-medium">{servings} stk</span>
        </div>
      </div>

      {/* Expandable Detailed Nutrition */}
      <div className="border-t border-gray-200 pt-3">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center justify-between w-full text-left hover:bg-gray-100 rounded px-2 py-1 transition-colors"
        >
          <span className="text-xs font-medium text-gray-700">Detaljeret næringsindhold</span>
          {isExpanded ? (
            <ChevronUp size={14} className="text-gray-500" />
          ) : (
            <ChevronDown size={14} className="text-gray-500" />
          )}
        </button>

        {isExpanded && (
          <div className="mt-3 space-y-4">
            {/* Highlights */}
            <div className="bg-green-50 rounded p-3">
              <h4 className="text-xs font-medium text-green-800 mb-2">Næringshøjdepunkter</h4>
              <ul className="space-y-1">
                {highlights.map((highlight, index) => (
                  <li key={index} className="text-xs text-green-700 flex items-start">
                    <span className="text-green-500 mr-1">•</span>
                    {highlight}
                  </li>
                ))}
              </ul>
              <p className="mt-2 pt-2 border-t border-green-200/80 text-xs text-green-800/95 leading-relaxed">
                I vores Madbudget kan du lave en fuld madplan for ugen og se fuld makro- og mikrosammensætning
                (vitaminer og mineraler) for ugen, så du ved, om du lever sundt!{' '}
                <Link
                  href="/madbudget"
                  className="font-semibold text-green-900 underline underline-offset-2 decoration-green-700/70 hover:text-green-950"
                >
                  Prøv det her
                </Link>
              </p>
            </div>

            {/* Vitamins */}
            {Object.keys(vitaminData).length > 0 && (
              <div>
                <h4 className="text-xs font-medium text-gray-900 mb-2">Vitaminer</h4>
                <div className="space-y-1">
                  {Object.entries(vitaminData).map(([vitamin, data]) => (
                    <div key={vitamin} className="flex justify-between items-center">
                      <span className="text-gray-600 text-xs">{vitamin}:</span>
                      <div className="flex items-center space-x-1">
                        <span className="font-medium text-xs">{data.amount} {data.unit}</span>
                        <span className="text-xs text-gray-500">({data.percentage}%)</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Minerals */}
            {Object.keys(mineralData).length > 0 && (
              <div>
                <h4 className="text-xs font-medium text-gray-900 mb-2">Mineraler</h4>
                <div className="space-y-1">
                  {Object.entries(mineralData).map(([mineral, data]) => (
                    <div key={mineral} className="flex justify-between items-center">
                      <span className="text-gray-600 text-xs">{mineral}:</span>
                      <div className="flex items-center space-x-1">
                        <span className="font-medium text-xs">{data.amount} {data.unit}</span>
                        <span className="text-xs text-gray-500">({data.percentage}%)</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Flere kostkategorier → FRIDA-modal. Én kategori → niche vægttab-link */}
      <div className="pt-3 border-t border-gray-200">
        {hasMultipleDietaryCategories ? (
          <>
            <p className="text-xs text-gray-600 leading-relaxed">
              <strong>Forstå ernæringsudregningens grundlag:</strong>{' '}
              <button
                type="button"
                onClick={() => setFridaModalOpen(true)}
                className="text-emerald-700 underline underline-offset-2 hover:text-emerald-900 text-left font-normal"
              >
                Sådan beregner vi næringsindhold (FRIDA)
              </button>
            </p>
            {fridaModalOpen && (
              <div
                className="fixed inset-0 z-[100] flex items-center justify-center p-4"
                role="dialog"
                aria-modal="true"
                aria-labelledby="frida-modal-title"
              >
                <div
                  className="absolute inset-0 bg-black/45"
                  aria-hidden
                  onClick={() => setFridaModalOpen(false)}
                />
                <div className="relative z-10 w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-xl border border-gray-200">
                  <div className="flex justify-between items-start gap-4 mb-4">
                    <h3 id="frida-modal-title" className="text-lg font-semibold text-gray-900 pr-8">
                      Sådan udregner vi næringsindholdet
                    </h3>
                    <button
                      type="button"
                      onClick={() => setFridaModalOpen(false)}
                      className="shrink-0 rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                      aria-label="Luk"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="space-y-4 text-sm text-gray-700 leading-relaxed">
                    <p>
                      Vores ingredienser er koblet direkte til den{' '}
                      <strong>officielle danske fødevaredatabase (FRIDA)</strong>. Tallene bygger derfor på samme
                      udgangspunkt som ved standardiserede danske fødevarer — så du får så præcist et billede som muligt,
                      når vi lægger en hel ret sammen.
                    </p>
                    <p>
                      Hver ingrediens har kendt sammensætning <strong>pr. 100 g eller 100 ml</strong>. Vi summerer dem med
                      de mængder, opskriften bruger, så vi får det <strong>samlede næringsindhold for hele retten</strong>.
                    </p>
                    <p>
                      Det samlede tal <strong>fordeler vi med antal portioner</strong>, som opskriften er skrevet til — det
                      er derfor, du ser næringsindhold <strong>pr. portion</strong>.
                    </p>
                    <p className="text-gray-600">
                      Spiser du mere eller mindre end én portion, følger dit faktiske indtag med. Tallene er altså et{' '}
                      <strong>vejledende gennemsnit</strong> — ikke en fast dosis.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <p className="text-xs text-gray-600 leading-relaxed">
            {nicheLink.generic ? (
              <>
                <strong>Forstå vægttab:</strong>{' '}
                <Link
                  href={nicheLink.href}
                  className="text-emerald-700 underline underline-offset-2 hover:text-emerald-900"
                >
                  Læs om anbefalet næringsindhold til vægttab
                </Link>
              </>
            ) : (
              <>
                <strong>Forstå {nicheLink.label}:</strong>{' '}
                <Link
                  href={nicheLink.href}
                  className="text-emerald-700 underline underline-offset-2 hover:text-emerald-900"
                >
                  Læs om anbefalet næringsindhold på {nicheLink.label} til vægttab
                </Link>
              </>
            )}
          </p>
        )}
      </div>
    </div>
  )
} 