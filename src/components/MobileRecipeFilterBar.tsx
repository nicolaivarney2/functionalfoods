'use client'

import { useState, useRef } from 'react'
import { ChevronDown, Search, X } from 'lucide-react'

interface FilterOption {
  value: string
  label: string
  count?: number
}

interface MobileRecipeFilterBarProps {
  // Search
  searchQuery: string
  onSearchChange: (query: string) => void
  
  // Prep time filter
  prepTimeFilter: 'all' | 'quick' | 'medium' | 'long'
  onPrepTimeChange: (filter: 'all' | 'quick' | 'medium' | 'long') => void
  
  // Meal type filter
  mealTypeFilter: string
  onMealTypeChange: (filter: string) => void
  mealTypes: string[]
  
  // Dietary categories (only for /opskriftsoversigt)
  selectedDietary?: string
  onDietaryChange?: (category: string) => void
  dietaryCategories?: Array<{ id: string; name: string; icon: string }>
  
  // Clear filters
  onClearFilters: () => void
  hasActiveFilters: boolean
}

export default function MobileRecipeFilterBar({
  searchQuery,
  onSearchChange,
  prepTimeFilter,
  onPrepTimeChange,
  mealTypeFilter,
  onMealTypeChange,
  mealTypes,
  selectedDietary,
  onDietaryChange,
  dietaryCategories,
  onClearFilters,
  hasActiveFilters
}: MobileRecipeFilterBarProps) {
  const [mobileFiltersExpanded, setMobileFiltersExpanded] = useState(true) // Start expanded
  const filterBarRef = useRef<HTMLDivElement>(null)
  const startY = useRef(0)
  const isDragging = useRef(false)

  // Swipe handlers for mobile filter bar
  const onTouchStart = (e: React.TouchEvent) => {
    startY.current = e.touches[0].clientY
    isDragging.current = false
  }

  const onTouchMove = (e: React.TouchEvent) => {
    if (!startY.current) return
    const currentY = e.touches[0].clientY
    const diffY = startY.current - currentY
    if (Math.abs(diffY) > 10) {
      isDragging.current = true
    }
  }

  const onTouchEnd = (e: React.TouchEvent) => {
    if (!isDragging.current || !startY.current) return
    const endY = e.changedTouches[0].clientY
    const diffY = startY.current - endY
    
    // Swipe up to expand, swipe down to collapse
    if (diffY > 50) {
      setMobileFiltersExpanded(true)
    } else if (diffY < -50) {
      setMobileFiltersExpanded(false)
    }
    
    startY.current = 0
    isDragging.current = false
  }

  const prepTimeOptions: FilterOption[] = [
    { value: 'all', label: 'Alle' },
    { value: 'quick', label: 'Under 30 min' },
    { value: 'medium', label: '30-60 min' },
    { value: 'long', label: 'Over 60 min' }
  ]

  const activeFilterCount = [
    prepTimeFilter !== 'all',
    mealTypeFilter !== 'all',
    searchQuery !== '',
    selectedDietary && selectedDietary !== 'all'
  ].filter(Boolean).length

  return (
    <div
      ref={filterBarRef}
      className={`lg:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-gray-200 shadow-lg z-50 transition-all duration-300 ease-in-out ${
        mobileFiltersExpanded ? 'max-h-[70vh]' : 'h-[60px]'
      } overflow-hidden`}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Collapsible Header - Always Visible */}
      <div 
        className="px-3 py-2.5 border-b border-gray-100 flex items-center justify-between cursor-pointer"
        onClick={() => setMobileFiltersExpanded(!mobileFiltersExpanded)}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {/* Active Filters Count */}
          {activeFilterCount > 0 && (
            <span className="flex-shrink-0 bg-blue-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
              {activeFilterCount}
            </span>
          )}
          
          <span className="text-sm font-medium text-gray-700">Filtre</span>
        </div>
        
        {/* Expand/Collapse Icon */}
        <ChevronDown 
          size={18} 
          className={`flex-shrink-0 ml-2 text-gray-500 transition-transform duration-300 ${
            mobileFiltersExpanded ? 'rotate-180' : ''
          }`}
        />
      </div>

      {/* Expandable Content */}
      {mobileFiltersExpanded && (
        <div className="px-3 py-3 overflow-y-auto max-h-[calc(70vh-60px)]">
          {/* Compact Search */}
          <div className="mb-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Søg opskrifter..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                className="w-full pl-8 pr-2 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {searchQuery && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onSearchChange('')
                  }}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Dietary Categories - Only for /opskriftsoversigt */}
          {dietaryCategories && onDietaryChange && (
            <div className="mb-3">
              <div className="text-xs font-medium text-gray-500 mb-1.5 px-1">Kategorier</div>
              <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onDietaryChange('all')
                  }}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all whitespace-nowrap flex-shrink-0 ${
                    selectedDietary === 'all'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  Alle
                </button>
                {dietaryCategories.map(category => {
                  const isSelected = selectedDietary === category.id
                  return (
                    <button
                      key={category.id}
                      onClick={(e) => {
                        e.stopPropagation()
                        onDietaryChange(category.id)
                      }}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all whitespace-nowrap flex-shrink-0 ${
                        isSelected
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      <span className="text-sm">{category.icon}</span>
                      <span>{category.name}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Prep Time Filter - Horizontal Swipe */}
          <div className="mb-3">
            <div className="text-xs font-medium text-gray-500 mb-1.5 px-1">Forberedelsestid</div>
            <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
              {prepTimeOptions.map(option => {
                const isSelected = prepTimeFilter === option.value
                return (
                  <button
                    key={option.value}
                    onClick={(e) => {
                      e.stopPropagation()
                      onPrepTimeChange(option.value as any)
                    }}
                    className={`px-3 py-2 rounded-lg text-xs font-medium transition-all whitespace-nowrap flex-shrink-0 ${
                      isSelected
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {option.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Meal Type Filter - Horizontal Swipe */}
          <div className="mb-3">
            <div className="text-xs font-medium text-gray-500 mb-1.5 px-1">Måltidstype</div>
            <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onMealTypeChange('all')
                }}
                className={`px-3 py-2 rounded-lg text-xs font-medium transition-all whitespace-nowrap flex-shrink-0 ${
                  mealTypeFilter === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700'
                }`}
              >
                Alle
              </button>
              {mealTypes.map(type => {
                const isSelected = mealTypeFilter === type
                return (
                  <button
                    key={type}
                    onClick={(e) => {
                      e.stopPropagation()
                      onMealTypeChange(type)
                    }}
                    className={`px-3 py-2 rounded-lg text-xs font-medium transition-all whitespace-nowrap flex-shrink-0 ${
                      isSelected
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {type}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Reset button */}
          {hasActiveFilters && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onClearFilters()
              }}
              className="w-full text-sm text-blue-600 hover:text-blue-700 underline border-t pt-3 mt-3"
            >
              Nulstil alle filtre
            </button>
          )}
        </div>
      )}
    </div>
  )
}

