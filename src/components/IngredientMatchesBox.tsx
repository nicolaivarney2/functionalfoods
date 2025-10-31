'use client'

import { useState, useEffect } from 'react'
import { CheckCircle, XCircle, ShoppingCart, ExternalLink } from 'lucide-react'

interface IngredientMatch {
  ingredient: {
    id: string
    name: string
    amount: number
    unit: string
  }
  isMatched: boolean
  matches: Array<{
    product: {
      external_id: string
      name: string
      category: string
      store: string
      price: number
      original_price: number
      is_on_sale: boolean
      image_url: string | null
    }
    confidence: number
    matchType: string
  }>
  totalMatches: number
  bestMatch: any
}

interface IngredientMatchesBoxProps {
  recipeSlug: string
}

export default function IngredientMatchesBox({ recipeSlug }: IngredientMatchesBoxProps) {
  const [matches, setMatches] = useState<IngredientMatch[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showDetails, setShowDetails] = useState(false)

  useEffect(() => {
    loadIngredientMatches()
  }, [recipeSlug])

  const loadIngredientMatches = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/recipes/${recipeSlug}/ingredient-matches`)
      const data = await response.json()

      if (data.success) {
        setMatches(data.data.ingredientMatches)
      } else {
        setError(data.message)
      }
    } catch (err) {
      setError('Failed to load ingredient matches')
      console.error('Error loading ingredient matches:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
        <div className="flex items-center space-x-2 mb-3">
          <ShoppingCart size={16} className="text-blue-500" />
          <h3 className="text-sm font-medium text-blue-900">INGREDIENS MATCHES</h3>
        </div>
        <div className="text-sm text-blue-700">Loading ingredient matches...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 rounded-lg p-4 border border-red-200">
        <div className="flex items-center space-x-2 mb-3">
          <XCircle size={16} className="text-red-500" />
          <h3 className="text-sm font-medium text-red-900">INGREDIENS MATCHES</h3>
        </div>
        <div className="text-sm text-red-700">Error: {error}</div>
      </div>
    )
  }

  const matchedCount = matches.filter(m => m.isMatched).length
  const totalCount = matches.length
  const matchPercentage = totalCount > 0 ? Math.round((matchedCount / totalCount) * 100) : 0

  return (
    <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <ShoppingCart size={16} className="text-blue-500" />
          <h3 className="text-sm font-medium text-blue-900">INGREDIENS MATCHES</h3>
        </div>
        <div className="text-xs text-blue-700">
          {matchedCount}/{totalCount} matchet ({matchPercentage}%)
        </div>
      </div>

      {/* Summary */}
      <div className="text-sm text-blue-700 mb-3">
        {matchedCount === totalCount ? (
          <span className="flex items-center space-x-1">
            <CheckCircle size={14} className="text-green-500" />
            <span>Alle ingredienser er matchet med dagligvarer!</span>
          </span>
        ) : (
          <span>
            {matchedCount} af {totalCount} ingredienser er matchet med dagligvarer
          </span>
        )}
      </div>

      {/* Toggle Details Button */}
      {totalCount > 0 && (
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="text-xs text-blue-600 hover:text-blue-800 underline mb-3"
        >
          {showDetails ? 'Skjul detaljer' : 'Vis detaljer'}
        </button>
      )}

      {/* Detailed List */}
      {showDetails && (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {matches.map((match, index) => (
            <div key={match.ingredient.id} className="bg-white rounded p-3 border border-blue-100">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  {match.isMatched ? (
                    <CheckCircle size={14} className="text-green-500" />
                  ) : (
                    <XCircle size={14} className="text-red-500" />
                  )}
                  <span className="text-sm font-medium text-gray-900">
                    {match.ingredient.amount} {match.ingredient.unit} {match.ingredient.name}
                  </span>
                </div>
                <span className="text-xs text-gray-500">
                  {match.totalMatches} match{match.totalMatches !== 1 ? 'es' : ''}
                </span>
              </div>

              {match.isMatched && match.bestMatch && (
                <div className="ml-6 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-600">
                      Bedste match: {match.bestMatch.product.name}
                    </span>
                    <span className="text-xs font-medium text-green-600">
                      {match.bestMatch.product.price} kr
                    </span>
                  </div>
                  <div className="flex items-center space-x-2 text-xs text-gray-500">
                    <span>{match.bestMatch.product.store}</span>
                    <span>•</span>
                    <span>{match.bestMatch.product.category}</span>
                    {match.bestMatch.product.is_on_sale && (
                      <>
                        <span>•</span>
                        <span className="text-orange-600 font-medium">Tilbud!</span>
                      </>
                    )}
                  </div>
                  <div className="flex items-center space-x-1">
                    <a
                      href={`/dagligvarer/produkt/${match.bestMatch.product.external_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:text-blue-800 flex items-center space-x-1"
                    >
                      <ExternalLink size={12} />
                      <span>Se produkt</span>
                    </a>
                  </div>
                </div>
              )}

              {!match.isMatched && (
                <div className="ml-6 text-xs text-gray-500">
                  Ingen matchende produkter fundet
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
