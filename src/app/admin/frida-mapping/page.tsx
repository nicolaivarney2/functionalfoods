'use client'

import { useState } from 'react'
import { FridaIntegration } from '@/lib/ingredient-system/frida-integration'

export default function FridaMappingPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [currentMappings, setCurrentMappings] = useState<Record<string, number>>({})
  const [newMapping, setNewMapping] = useState({ ingredientName: '', fridaFoodId: '' })

  const fridaIntegration = new FridaIntegration()

  const handleSearch = async () => {
    if (!searchTerm.trim()) return
    
    console.log('🔍 Starting search for:', searchTerm)
    setIsSearching(true)
    
    try {
      setIsSearching(true)
      const { FridaIntegration } = await import('@/lib/ingredient-system/frida-integration')
      const fridaIntegration = new FridaIntegration()
      
      console.log(`🔍 Searching Frida for: ${searchTerm}`)
      
      // For now, just show a message that this feature is not implemented
      console.log('❌ Frida dataset search is not implemented yet')
      setSearchResults([])
      
    } catch (error) {
      console.error('❌ Error searching Frida:', error)
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }

  const handleAddMapping = () => {
    if (!newMapping.ingredientName || !newMapping.fridaFoodId) return
    
    const foodId = parseInt(newMapping.fridaFoodId)
    fridaIntegration.addIngredientMapping(newMapping.ingredientName, foodId)
    
    // Update current mappings
    setCurrentMappings(fridaIntegration.getIngredientMappings())
    
    // Clear form
    setNewMapping({ ingredientName: '', fridaFoodId: '' })
  }

  const handleSelectFood = (food: any) => {
    setNewMapping({
      ingredientName: searchTerm,
      fridaFoodId: food.id.toString()
    })
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Frida Ingredient Mapping</h1>
      
      {/* Current Mappings */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Current Mappings</h2>
        <div className="bg-gray-50 p-4 rounded-lg">
          {Object.entries(currentMappings).length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(currentMappings).map(([ingredient, foodId]) => (
                <div key={ingredient} className="bg-white p-3 rounded border">
                  <span className="font-medium">{ingredient}</span>
                  <span className="text-gray-500 ml-2">→ Frida ID {foodId}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No mappings yet. Search for ingredients below.</p>
          )}
        </div>
      </div>

      {/* Search Section */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Search Frida Dataset</h2>
        <div className="flex gap-4 mb-4">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search for ingredient (e.g., 'mango', 'kylling')"
            className="flex-1 p-3 border border-gray-300 rounded-lg"
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          />
          <button
            onClick={handleSearch}
            disabled={isSearching}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {isSearching ? 'Searching...' : 'Search'}
          </button>
          <button
            onClick={() => {
              setSearchTerm('kylling')
              setTimeout(() => handleSearch(), 100)
            }}
            className="px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            Test
          </button>
        </div>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="bg-white border rounded-lg">
            <div className="p-4 border-b bg-gray-50">
              <h3 className="font-semibold">Search Results for "{searchTerm}"</h3>
            </div>
            <div className="divide-y">
              {searchResults.map((food) => (
                <div key={food.id} className="p-4 hover:bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-medium">{food.name}</h4>
                      <p className="text-sm text-gray-600">{food.englishName}</p>
                      <p className="text-xs text-gray-500">{food.group}</p>
                    </div>
                    <div className="flex gap-2">
                      {food.hasNutritionalData && (
                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                          Has Data
                        </span>
                      )}
                      <button
                        onClick={() => handleSelectFood(food)}
                        className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                      >
                        Select
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Add Mapping Section */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Add New Mapping</h2>
        <div className="bg-gray-50 p-6 rounded-lg">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-2">Ingredient Name</label>
              <input
                type="text"
                value={newMapping.ingredientName}
                onChange={(e) => setNewMapping({ ...newMapping, ingredientName: e.target.value })}
                placeholder="e.g., mango, kylling"
                className="w-full p-3 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Frida Food ID</label>
              <input
                type="number"
                value={newMapping.fridaFoodId}
                onChange={(e) => setNewMapping({ ...newMapping, fridaFoodId: e.target.value })}
                placeholder="e.g., 5"
                className="w-full p-3 border border-gray-300 rounded-lg"
              />
            </div>
          </div>
          <button
            onClick={handleAddMapping}
            disabled={!newMapping.ingredientName || !newMapping.fridaFoodId}
            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            Add Mapping
          </button>
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 p-6 rounded-lg">
        <h3 className="font-semibold mb-2">How to use:</h3>
        <ol className="list-decimal list-inside space-y-2 text-sm">
          <li>Search for an ingredient (e.g., "mango", "kylling")</li>
          <li>Select the matching Frida food from the results</li>
          <li>Click "Add Mapping" to save the connection</li>
          <li>The ingredient will now have nutritional data from Frida</li>
        </ol>
      </div>
    </div>
  )
} 