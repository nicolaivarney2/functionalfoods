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
            personalTips={recipe.personalTips || ''}
            dietaryCategory={recipe.dietaryCategories?.[0] || 'sunde'}
            recipeSlug={recipe.slug}
            recipeTitle={recipe.title}
            onTipsUpdate={() => {}} // No editing for personal tips
          />
        </div>
      </section>

      {/* Recipe Description and Categories Editing */}
      <section className="bg-white py-12">
        <div className="container">
          <div className="max-w-4xl mx-auto space-y-8">
            
            {/* Description */}
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900">Beskrivelse</h3>
              <p className="text-gray-700 leading-relaxed">
                {recipe.shortDescription || 'Ingen beskrivelse tilgængelig.'}
              </p>
            </div>

            {/* Categories */}
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900">Kategorier & Tags</h3>
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