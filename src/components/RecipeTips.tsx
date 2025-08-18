'use client'

import { useState } from 'react'
import { Lightbulb, Bot, Edit, Save, X } from 'lucide-react'

interface RecipeTipsProps {
  personalTips?: string
  dietaryCategory?: string
  recipeSlug?: string
  recipeTitle?: string
  onTipsUpdate?: (newTips: string) => void
}

export default function RecipeTips({ 
  personalTips, 
  dietaryCategory, 
  recipeSlug,
  recipeTitle,
  onTipsUpdate 
}: RecipeTipsProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editedTips, setEditedTips] = useState(personalTips || '')
  const [isGeneratingAI, setIsGeneratingAI] = useState(false)

  const generateAITips = async () => {
    if (!recipeSlug || !recipeTitle) return
    
    setIsGeneratingAI(true)
    try {
      const response = await fetch('/api/ai/generate-tips', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: recipeTitle,
          description: 'En lækker opskrift der er værd at prøve',
          difficulty: 'medium',
          totalTime: 45,
          dietaryCategories: [dietaryCategory || 'Generel']
        }),
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success && data.tips) {
          setEditedTips(data.tips)
          if (onTipsUpdate) {
            onTipsUpdate(data.tips)
          }
        }
      } else {
        console.error('Failed to generate AI tips')
      }
    } catch (error) {
      console.error('Error generating AI tips:', error)
    } finally {
      setIsGeneratingAI(false)
    }
  }

  const saveTips = async () => {
    if (!recipeSlug) return
    
    try {
      const response = await fetch(`/api/recipes/${recipeSlug}/personal-tips`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ personalTips: editedTips }),
      })

      if (response.ok) {
        if (onTipsUpdate) {
          onTipsUpdate(editedTips)
        }
        setIsEditing(false)
      }
    } catch (error) {
      console.error('Error saving tips:', error)
    }
  }

  const cancelEdit = () => {
    setEditedTips(personalTips || '')
    setIsEditing(false)
  }

  if (personalTips && personalTips.trim()) {
    // Format personalTips - første afsnit som tekst, "-" punkter som bullets
    const formatTips = (tips: string) => {
      const lines = tips.split('\n').filter(line => line.trim())
      
      // Find første afsnit (indtil første bullet punkt)
      const firstParagraphEnd = lines.findIndex(line => {
        const trimmed = line.trim()
        // Håndter alle typer bindestreger: -, –, —, −
        return /^[-–—−]\s/.test(trimmed)
      })
      const firstParagraph = lines.slice(0, firstParagraphEnd).join(' ')
      
      // Find alle bullet punkter
      const bulletPoints = lines
        .filter(line => {
          const trimmed = line.trim()
          // Håndter alle typer bindestreger: -, –, —, −
          return /^[-–—−]\s/.test(trimmed)
        })
        .map(line => {
          const trimmed = line.trim()
          // Fjern alle typer bindestreger og trim
          return trimmed.replace(/^[-–—−]\s*/, '').trim()
        })
      
      // Find sidste afsnit (efter sidste bullet punkt)
      const lastBulletIndex = lines.map((line, index) => ({ line, index }))
        .filter(({ line }) => {
          const trimmed = line.trim()
          return /^[-–—−]\s/.test(trimmed)
        })
        .pop()?.index || -1
      const lastParagraph = lines.slice(lastBulletIndex + 1).join(' ')
      
      return {
        firstParagraph,
        bulletPoints,
        lastParagraph: lastParagraph.trim()
      }
    }

    const formatted = formatTips(personalTips)

    return (
      <div className="bg-blue-50 rounded-lg p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-bold">💡</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Mine tips til opskriften</h3>
          </div>
          
          <div className="flex items-center space-x-2">
            {recipeSlug && (
              <button
                onClick={generateAITips}
                disabled={isGeneratingAI}
                className="flex items-center space-x-2 px-3 py-1.5 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
              >
                <Bot size={14} />
                <span>{isGeneratingAI ? 'Genererer...' : 'AI Tips'}</span>
              </button>
            )}
            
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center space-x-2 px-3 py-1.5 bg-gray-600 text-white text-sm rounded-lg hover:bg-gray-700 transition-colors"
            >
              <Edit size={14} />
              <span>Rediger</span>
            </button>
          </div>
        </div>
        
        {isEditing ? (
          <div className="space-y-4">
            <textarea
              value={editedTips}
              onChange={(e) => setEditedTips(e.target.value)}
              className="w-full h-32 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Skriv dine personlige tips til opskriften..."
            />
            <div className="flex items-center space-x-2">
              <button
                onClick={saveTips}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Save size={14} />
                <span>Gem</span>
              </button>
              <button
                onClick={cancelEdit}
                className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                <X size={14} />
                <span>Annuller</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 text-gray-700">
            {/* Første afsnit som almindelig tekst */}
            {formatted.firstParagraph && (
              <p className="leading-relaxed">
                {formatted.firstParagraph}
              </p>
            )}
            
            {/* Bullet points */}
            {formatted.bulletPoints.length > 0 && (
              <ul className="space-y-2">
                {formatted.bulletPoints.map((point, index) => (
                  <li key={index} className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                    <span className="leading-relaxed">{point}</span>
                  </li>
                ))}
              </ul>
            )}
            
            {/* Sidste afsnit som almindelig tekst */}
            {formatted.lastParagraph && (
              <p className="leading-relaxed">
                {formatted.lastParagraph}
              </p>
            )}
          </div>
        )}
      </div>
    )
  }

  const defaultTips = [
    `Denne ${dietaryCategory || 'sunde'} opskrift er perfekt til at holde dig mæt og tilfreds.`,
    'Prøv at tilpasse krydderierne efter din smag - det gør retten til din egen.',
    'Gem rester i køleskabet - de smager ofte endnu bedre dagen efter.',
    'Server med frisk brød eller en simpel salat for at gøre måltidet komplet.'
  ]

  return (
    <div className="bg-green-50 rounded-lg p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
            <span className="text-white text-sm font-bold">💡</span>
          </div>
          <h3 className="text-lg font-semibold text-gray-900">Generelle tips</h3>
        </div>
        
        {recipeSlug && (
          <button
            onClick={generateAITips}
            disabled={isGeneratingAI}
            className="flex items-center space-x-2 px-3 py-1.5 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
          >
            <Bot size={14} />
            <span>{isGeneratingAI ? 'Genererer...' : 'AI Tips'}</span>
          </button>
        )}
      </div>
      
      <ul className="space-y-2 text-gray-700">
        {defaultTips.map((tip, index) => (
          <li key={index} className="flex items-start space-x-2">
            <span className="text-green-500 mt-1">•</span>
            <span>{tip}</span>
          </li>
        ))}
      </ul>
    </div>
  )
} 