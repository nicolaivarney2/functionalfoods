'use client'

import { useState, useEffect } from 'react'
import { Star, MessageCircle, Edit, Save, X } from 'lucide-react'
import { Recipe } from '@/types/recipe'
import RecipeActions from './RecipeActions'
import DynamicIngredientsList from './DynamicIngredientsList'
import InstructionsList from './InstructionsList'
import CommentSystem from './CommentSystem'
import SocialSharing from './SocialSharing'
import RecipeTips from './RecipeTips'
import RelatedRecipes from './RelatedRecipes'
import AboutFunctionalFoods from './AboutFunctionalFoods'
import FloatingRecipeNavigation from './FloatingRecipeNavigation'
import RatingModal from './RatingModal'

interface RecipePageClientProps {
  recipe: Recipe
  allRecipes: Recipe[]
}

export default function RecipePageClient({ recipe, allRecipes }: RecipePageClientProps) {
  const [servings, setServings] = useState(recipe.servings || 2)
  const [currentRating, setCurrentRating] = useState(recipe.rating || 0)
  const [isRatingModalOpen, setIsRatingModalOpen] = useState(false)
  const [activeSection, setActiveSection] = useState<'ingredients' | 'instructions'>('ingredients')
  const [commentCount, setCommentCount] = useState(0)
  
  // Editing states
  const [isEditingDescription, setIsEditingDescription] = useState(false)
  const [editedDescription, setEditedDescription] = useState(recipe.shortDescription || '')
  const [isEditingCategories, setIsEditingCategories] = useState(false)
  const [editedCategories, setEditedCategories] = useState(recipe.dietaryCategories || [])
  const [personalTips, setPersonalTips] = useState(recipe.personalTips || '')

  // Update comment count when comments change
  const handleCommentUpdate = (newCount: number) => {
    setCommentCount(newCount)
  }

  useEffect(() => {
    const handleScroll = () => {
      const ingredientsSection = document.getElementById('ingredients')
      const instructionsSection = document.getElementById('instructions')

      if (ingredientsSection && instructionsSection) {
        const ingredientsRect = ingredientsSection.getBoundingClientRect()
        const instructionsRect = instructionsSection.getBoundingClientRect()

        if (ingredientsRect.top <= 100 && ingredientsRect.bottom >= 100) {
          setActiveSection('ingredients')
        } else if (instructionsRect.top <= 100 && instructionsRect.bottom >= 100) {
          setActiveSection('instructions')
        }
      }
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const scrollToSection = (section: 'ingredients' | 'instructions') => {
    const element = document.getElementById(section)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' })
    }
  }

  const saveDescription = async () => {
    try {
      const response = await fetch(`/api/recipes/${recipe.slug}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ shortDescription: editedDescription }),
      })

      if (response.ok) {
        setIsEditingDescription(false)
      }
    } catch (error) {
      console.error('Error saving description:', error)
    }
  }

  const saveCategories = async () => {
    try {
      const response = await fetch(`/api/recipes/${recipe.slug}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ dietaryCategories: editedCategories }),
      })

      if (response.ok) {
        setIsEditingCategories(false)
      }
    } catch (error) {
      console.error('Error saving categories:', error)
    }
  }

  const addCategory = () => {
    const newCategory = prompt('Indtast ny kategori:')
    if (newCategory && newCategory.trim()) {
      setEditedCategories([...editedCategories, newCategory.trim()])
    }
  }

  const removeCategory = (index: number) => {
    setEditedCategories(editedCategories.filter((_, i) => i !== index))
  }

  return (
    <>
      {/* Recipe Actions */}
      <section className="bg-white border-b border-gray-200">
        <div className="container py-6">
          <RecipeActions 
            recipeId={recipe.id} 
            recipeTitle={recipe.title}
            recipeSlug={recipe.slug}
            recipeImage={recipe.imageUrl}
            recipeDescription={recipe.shortDescription}
          />
        </div>
      </section>

      {/* Recipe Content - Ingredients and Instructions */}
      <section className="bg-white">
        <div className="container py-8">
          <div className="grid md:grid-cols-3 gap-8">
            {/* Dynamic Ingredients */}
            <DynamicIngredientsList recipe={recipe} servings={servings} onServingsChange={setServings} />

            {/* Instructions */}
            <InstructionsList recipe={recipe} />
          </div>
        </div>
      </section>

      {/* Recipe Tips with AI and Editing */}
      <section className="bg-gray-50 py-12">
        <div className="container">
          <RecipeTips 
            personalTips={personalTips}
            dietaryCategory={recipe.dietaryCategories?.[0] || 'sunde'}
            recipeSlug={recipe.slug}
            recipeTitle={recipe.title}
            onTipsUpdate={setPersonalTips}
          />
        </div>
      </section>

      {/* Recipe Description and Categories Editing */}
      <section className="bg-white py-12">
        <div className="container">
          <div className="max-w-4xl mx-auto space-y-8">
            
            {/* Description Editing */}
            <div className="bg-gray-50 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Beskrivelse</h3>
                <button
                  onClick={() => setIsEditingDescription(!isEditingDescription)}
                  className="flex items-center space-x-2 px-3 py-1.5 bg-gray-600 text-white text-sm rounded-lg hover:bg-gray-700 transition-colors"
                >
                  <Edit size={14} />
                  <span>{isEditingDescription ? 'Annuller' : 'Rediger'}</span>
                </button>
              </div>
              
              {isEditingDescription ? (
                <div className="space-y-4">
                  <textarea
                    value={editedDescription}
                    onChange={(e) => setEditedDescription(e.target.value)}
                    className="w-full h-32 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Skriv beskrivelse af opskriften..."
                  />
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={saveDescription}
                      className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Save size={14} />
                      <span>Gem</span>
                    </button>
                    <button
                      onClick={() => {
                        setEditedDescription(recipe.shortDescription || '')
                        setIsEditingDescription(false)
                      }}
                      className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                    >
                      <X size={14} />
                      <span>Annuller</span>
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-gray-700 leading-relaxed">
                  {recipe.shortDescription || 'Ingen beskrivelse tilgængelig.'}
                </p>
              )}
            </div>

            {/* Categories Editing */}
            <div className="bg-gray-50 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Kategorier & Tags</h3>
                <button
                  onClick={() => setIsEditingCategories(!isEditingCategories)}
                  className="flex items-center space-x-2 px-3 py-1.5 bg-gray-600 text-white text-sm rounded-lg hover:bg-gray-700 transition-colors"
                >
                  <Edit size={14} />
                  <span>{isEditingCategories ? 'Annuller' : 'Rediger'}</span>
                </button>
              </div>
              
              {isEditingCategories ? (
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    {editedCategories.map((category, index) => (
                      <div key={index} className="flex items-center space-x-2 bg-blue-100 text-blue-800 px-3 py-1 rounded-full">
                        <span>{category}</span>
                        <button
                          onClick={() => removeCategory(index)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={addCategory}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      + Tilføj kategori
                    </button>
                    <button
                      onClick={saveCategories}
                      className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Save size={14} />
                      <span>Gem</span>
                    </button>
                    <button
                      onClick={() => {
                        setEditedCategories(recipe.dietaryCategories || [])
                        setIsEditingCategories(false)
                      }}
                      className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                    >
                      <X size={14} />
                      <span>Annuller</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {recipe.dietaryCategories && recipe.dietaryCategories.length > 0 ? (
                    recipe.dietaryCategories.map((category, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 text-sm font-medium bg-green-100 text-green-800 rounded-full"
                      >
                        {category}
                      </span>
                    ))
                  ) : (
                    <span className="text-gray-500">Ingen kategorier tilgængelige.</span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Comment System - Moved up */}
      <section id="comments-section" className="bg-gray-50 py-12">
        <div className="container">
          <CommentSystem recipeSlug={recipe.slug} onCommentUpdate={handleCommentUpdate} />
        </div>
      </section>

      {/* Social Sharing */}
      <section className="bg-white py-8">
        <div className="container">
          <SocialSharing 
            recipeTitle={recipe.title}
            recipeDescription={recipe.shortDescription || ''}
            recipeUrl={typeof window !== 'undefined' ? window.location.href : ''}
          />
        </div>
      </section>

      {/* Related Recipes */}
      <RelatedRecipes recipes={allRecipes} currentRecipeId={recipe.id} />

      {/* About Functional Foods */}
      <AboutFunctionalFoods />

      {/* Rating Stars - Clickable */}
      <div id="rating-stars" className="fixed bottom-20 right-4 z-40">
        <div className="flex space-x-1 bg-white bg-opacity-90 backdrop-blur-sm rounded-lg p-2 shadow-lg">
          {[...Array(5)].map((_, i) => (
            <button
              key={i}
              onClick={() => setIsRatingModalOpen(true)}
              className="hover:scale-110 transition-transform"
              title={`Giv ${i + 1} stjerner`}
            >
              <Star
                size={16}
                className={i < currentRating ? 'text-yellow-400 fill-current' : 'text-gray-300'}
              />
            </button>
          ))}
          {recipe.reviewCount && recipe.reviewCount > 0 && (
            <span className="text-xs text-gray-600 ml-2 self-center">
              ({recipe.reviewCount})
            </span>
          )}
        </div>
      </div>

      {/* Comment Scroll Button */}
      <div className="fixed bottom-20 left-4 z-40">
        <button
          onClick={() => document.getElementById('comments-section')?.scrollIntoView({ behavior: 'smooth' })}
          className="flex items-center space-x-2 bg-white bg-opacity-90 backdrop-blur-sm rounded-lg p-2 shadow-lg text-gray-600 hover:text-gray-900 transition-colors"
        >
          <MessageCircle size={16} />
          <span className="text-sm">Kommentarer ({commentCount})</span>
        </button>
      </div>

      {/* Floating Navigation */}
      <FloatingRecipeNavigation
        onIngredientsClick={() => scrollToSection('ingredients')}
        onInstructionsClick={() => scrollToSection('instructions')}
        activeSection={activeSection}
      />

      {/* Rating Modal */}
      <RatingModal
        isOpen={isRatingModalOpen}
        onClose={() => setIsRatingModalOpen(false)}
        onRate={async (rating) => {
          try {
            console.log(`⭐ Saving rating: ${rating} stars for ${recipe.title}`)
            
            // Get current user ID (you'll need to implement this based on your auth system)
            const userId = 'temp-user-id' // Replace with actual user ID from auth context
            
            const response = await fetch(`/api/recipes/${recipe.slug}/rating`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                rating,
                userId
              })
            })

            if (!response.ok) {
              const errorData = await response.json()
              throw new Error(errorData.error || 'Failed to save rating')
            }

            const result = await response.json()
            
            if (result.success) {
              console.log(`✅ Rating saved successfully: ${result.newRating} stars, ${result.newReviewCount} reviews`)
              // Update local state with new rating from database
              setCurrentRating(result.newRating)
              // You might also want to update the recipe object here
            } else {
              throw new Error('Rating save failed')
            }
            
          } catch (error) {
            console.error('❌ Error saving rating:', error)
            // You might want to show a toast or error message to the user
            alert('Kunne ikke gemme bedømmelse. Prøv igen senere.')
          }
        }}
        recipeTitle={recipe.title}
      />
    </>
  )
} 