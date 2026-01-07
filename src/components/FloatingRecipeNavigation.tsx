'use client'

import { useState } from 'react'
import { ChevronUp } from 'lucide-react'

interface FloatingRecipeNavigationProps {
  onIngredientsClick: () => void
  onInstructionsClick: () => void
  activeSection: 'ingredients' | 'instructions'
}

export default function FloatingRecipeNavigation({
  onIngredientsClick,
  onInstructionsClick,
  activeSection
}: FloatingRecipeNavigationProps) {
  const [isVisible, setIsVisible] = useState(true)

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <>
      {/* Floating Navigation Buttons */}
      <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50 flex space-x-2 max-w-[calc(100vw-2rem)] px-2">
        <button
          onClick={onIngredientsClick}
          className={`px-3 md:px-4 py-1.5 md:py-2 rounded-full text-xs md:text-sm font-medium transition-all duration-200 whitespace-nowrap ${
            activeSection === 'ingredients'
              ? 'bg-green-600 text-white shadow-lg'
              : 'bg-gray-800 text-white hover:bg-gray-700'
          }`}
        >
          Ingredienser
        </button>
        <button
          onClick={onInstructionsClick}
          className={`px-3 md:px-4 py-1.5 md:py-2 rounded-full text-xs md:text-sm font-medium transition-all duration-200 whitespace-nowrap ${
            activeSection === 'instructions'
              ? 'bg-green-600 text-white shadow-lg'
              : 'bg-gray-800 text-white hover:bg-gray-700'
          }`}
        >
          Sådan gør du
        </button>
      </div>

      {/* Scroll to Top Button */}
      <button
        onClick={scrollToTop}
        className="fixed bottom-4 right-4 z-50 bg-gray-800 text-white p-3 rounded-full hover:bg-gray-700 transition-colors shadow-lg"
      >
        <ChevronUp size={20} />
      </button>
    </>
  )
} 