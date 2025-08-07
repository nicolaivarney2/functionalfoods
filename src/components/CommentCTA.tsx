'use client'

import { useState } from 'react'
import { MessageCircle, ChevronDown, ChevronUp, Heart, Star, Bell, User } from 'lucide-react'

interface CommentCTAProps {
  onLoginClick: () => void
}

export default function CommentCTA({ onLoginClick }: CommentCTAProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
      {/* Main CTA */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <MessageCircle className="text-green-600" size={24} />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Login for at kommentere
            </h3>
            <p className="text-gray-600 text-sm">
              Del dine erfaringer og få svar fra andre
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={onLoginClick}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            Log ind
          </button>
          
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>
        </div>
      </div>

      {/* Expanded benefits */}
      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <h4 className="text-sm font-medium text-gray-900 mb-3">
            Få adgang til alle funktioner:
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start space-x-3">
              <Heart className="text-red-500 mt-1" size={18} />
              <div>
                <h5 className="font-medium text-gray-900 text-sm">Gem favoritopskrifter</h5>
                <p className="text-gray-600 text-xs">Gem dine yndlingsopskrifter til senere</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <MessageCircle className="text-blue-500 mt-1" size={18} />
              <div>
                <h5 className="font-medium text-gray-900 text-sm">Skriv kommentarer</h5>
                <p className="text-gray-600 text-xs">Del tips og få svar fra andre</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <Star className="text-yellow-500 mt-1" size={18} />
              <div>
                <h5 className="font-medium text-gray-900 text-sm">Rate opskrifter</h5>
                <p className="text-gray-600 text-xs">Hjælp andre med dine bedømmelser</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <Bell className="text-green-500 mt-1" size={18} />
              <div>
                <h5 className="font-medium text-gray-900 text-sm">Gratis sparring</h5>
                <p className="text-gray-600 text-xs">Få personlig rådgivning til vægttab</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <User className="text-purple-500 mt-1" size={18} />
              <div>
                <h5 className="font-medium text-gray-900 text-sm">Personlige anbefalinger</h5>
                <p className="text-gray-600 text-xs">Få opskrifter tilpasset dine præferencer</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="w-4 h-4 bg-gradient-to-r from-green-400 to-blue-500 rounded-full mt-1"></div>
              <div>
                <h5 className="font-medium text-gray-900 text-sm">Madplanlægning</h5>
                <p className="text-gray-600 text-xs">Planlæg din uge med smarte madplaner</p>
              </div>
            </div>
          </div>
          
          <div className="mt-4 pt-4 border-t border-gray-200">
            <button
              onClick={onLoginClick}
              className="w-full bg-green-600 hover:bg-green-700 text-white py-3 px-4 rounded-lg font-medium transition-colors"
            >
              Opret gratis konto nu
            </button>
            <p className="text-xs text-gray-500 text-center mt-2">
              Det tager kun 30 sekunder og er helt gratis
            </p>
          </div>
        </div>
      )}
    </div>
  )
} 