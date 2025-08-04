'use client'

import { useState, useEffect } from 'react'
import { Recipe } from '@/types/recipe'
import { Star, MessageCircle } from 'lucide-react'
import FloatingRecipeNavigation from '@/components/FloatingRecipeNavigation'
import ServingSizeAdjuster from '@/components/ServingSizeAdjuster'
import RecipeActions from '@/components/RecipeActions'
import RecipeTips from '@/components/RecipeTips'
import RelatedRecipes from '@/components/RelatedRecipes'
import AboutFunctionalFoods from '@/components/AboutFunctionalFoods'
import CommentSystem from '@/components/CommentSystem'
import SocialSharing from '@/components/SocialSharing'
import DynamicIngredientsList from '@/components/DynamicIngredientsList'
import InstructionsList from '@/components/InstructionsList'
import RatingModal from '@/components/RatingModal'

interface RecipePageClientProps {
  recipe: Recipe
  allRecipes: Recipe[]
}

export default function RecipePageClient({ recipe, allRecipes }: RecipePageClientProps) {
  const [activeSection, setActiveSection] = useState<'ingredients' | 'instructions'>('ingredients')
  const [servings, setServings] = useState(recipe.servings || 4)
  const [isRatingModalOpen, setIsRatingModalOpen] = useState(false)
  const [currentRating, setCurrentRating] = useState(4) // Default rating

  // Add event listeners for top elements when component mounts
  useEffect(() => {
    const topRatingStars = document.getElementById('top-rating-stars')
    const topComments = document.getElementById('top-comments')

    if (topRatingStars) {
      topRatingStars.addEventListener('click', () => {
        setIsRatingModalOpen(true)
      })
      topRatingStars.style.cursor = 'pointer'
      topRatingStars.classList.add('hover:opacity-80', 'transition-opacity')
    }

    if (topComments) {
      topComments.addEventListener('click', () => {
        document.getElementById('comments-section')?.scrollIntoView({ behavior: 'smooth' })
      })
      topComments.style.cursor = 'pointer'
      topComments.classList.add('hover:text-gray-900', 'transition-colors')
    }

    // Cleanup event listeners
    return () => {
      if (topRatingStars) {
        topRatingStars.removeEventListener('click', () => setIsRatingModalOpen(true))
      }
      if (topComments) {
        topComments.removeEventListener('click', () => {
          document.getElementById('comments-section')?.scrollIntoView({ behavior: 'smooth' })
        })
      }
    }
  }, [])

  const scrollToSection = (section: 'ingredients' | 'instructions') => {
    setActiveSection(section)
    const element = document.getElementById(section)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <>


      {/* Recipe Actions - Rendered in client component */}
      <section className="bg-white border-b border-gray-200">
        <div className="container py-6">
          <RecipeActions recipeId={recipe.id} recipeTitle={recipe.title} />
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

      {/* Comment System - Moved up */}
      <section id="comments-section" className="bg-gray-50 py-12">
        <div className="container">
          <CommentSystem recipeSlug={recipe.slug} />
        </div>
      </section>

      {/* Social Sharing */}
      <section className="bg-white py-8">
        <div className="container">
          <SocialSharing 
            recipeTitle={recipe.title}
            recipeUrl={`${typeof window !== 'undefined' ? window.location.origin : ''}/opskrift/${recipe.slug}`}
            recipeImage={recipe.imageUrl}
            recipeDescription={recipe.description}
          />
        </div>
      </section>

      {/* Recipe Tips */}
      <section className="bg-white">
        <div className="container py-8">
          <RecipeTips tips={[]} dietaryCategory={recipe.dietaryCategories[0]} />
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
            >
              <Star
                size={16}
                className={i < currentRating ? 'text-yellow-400 fill-current' : 'text-gray-300'}
              />
            </button>
          ))}
        </div>
      </div>

      {/* Comment Scroll Button */}
      <div className="fixed bottom-20 left-4 z-40">
        <button
          onClick={() => document.getElementById('comments-section')?.scrollIntoView({ behavior: 'smooth' })}
          className="flex items-center space-x-2 bg-white bg-opacity-90 backdrop-blur-sm rounded-lg p-2 shadow-lg text-gray-600 hover:text-gray-900 transition-colors"
        >
          <MessageCircle size={16} />
          <span className="text-sm">Kommentarer (0)</span>
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
        onRate={(rating) => {
          setCurrentRating(rating)
          // Here you could save the rating to your database
          console.log(`Rating saved: ${rating} stars for ${recipe.title}`)
        }}
        recipeTitle={recipe.title}
      />
    </>
  )
} 