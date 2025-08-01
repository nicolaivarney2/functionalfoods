'use client'

import { ArrowDown } from 'lucide-react'

export default function JumpToRecipeButton() {
  const scrollToRecipe = () => {
    document.getElementById('recipe-content')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <button 
      onClick={scrollToRecipe}
      className="inline-flex items-center space-x-2 bg-blue-600 text-white px-8 py-4 rounded-lg hover:bg-blue-700 transition-colors"
    >
      <ArrowDown size={20} />
      <span className="text-lg font-medium">Hop til opskrift</span>
    </button>
  )
} 