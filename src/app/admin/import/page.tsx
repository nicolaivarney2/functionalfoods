'use client'

import { useState } from 'react'
import { Upload, FileText, CheckCircle, AlertCircle, Loader, Download } from 'lucide-react'
import { RawRecipeData } from '@/lib/recipe-import'
import { convertKetolivRecipes, downloadKetolivData } from '@/lib/ketoliv-converter'

interface ImportResult {
  success: boolean
  message: string
  recipeCount?: number
  errors?: string[]
}

export default function ImportPage() {
  const [recipes, setRecipes] = useState('')
  const [isKetolivFormat, setIsKetolivFormat] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState<'success' | 'error'>('success')
  const [importedCount, setImportedCount] = useState(0)
  const [totalRecipes, setTotalRecipes] = useState(0)

  const handleImport = async () => {
    if (!recipes.trim()) {
      setMessage('Indtast venligst opskrifter')
      setMessageType('error')
      return
    }

    setIsLoading(true)
    setMessage('')

    try {
      let parsedRecipes
      try {
        parsedRecipes = JSON.parse(recipes)
      } catch (error) {
        setMessage('Ugyldigt JSON format')
        setMessageType('error')
        setIsLoading(false)
        return
      }

      const response = await fetch('/api/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipes: parsedRecipes,
          isKetolivFormat,
        }),
      })

      const result = await response.json()

      if (result.success) {
        setMessage(result.message)
        setMessageType('success')
        setImportedCount(result.recipeCount)
        setTotalRecipes(result.totalRecipes)
        setRecipes('')
      } else {
        setMessage(result.message || 'Fejl ved import')
        setMessageType('error')
      }
    } catch (error) {
      setMessage('Fejl ved import: ' + (error instanceof Error ? error.message : 'Ukendt fejl'))
      setMessageType('error')
    }

    setIsLoading(false)
  }

  const handleDownloadImages = async () => {
    setIsLoading(true)
    setMessage('')

    try {
      const response = await fetch('/api/download-images', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const result = await response.json()

      if (result.success) {
        setMessage(result.message)
        setMessageType('success')
      } else {
        setMessage(result.message || 'Fejl ved download af billeder')
        setMessageType('error')
      }
    } catch (error) {
      setMessage('Fejl ved download af billeder: ' + (error instanceof Error ? error.message : 'Ukendt fejl'))
      setMessageType('error')
    }

    setIsLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-md p-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-8">Import Opskrifter</h1>
            
            {/* Success/Error Message */}
            {message && (
              <div className={`mb-6 p-4 rounded-lg ${
                messageType === 'success' 
                  ? 'bg-green-50 text-green-800 border border-green-200' 
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}>
                {message}
                {importedCount > 0 && (
                  <div className="mt-2 text-sm">
                    Importeret: {importedCount} opskrifter | Total: {totalRecipes} opskrifter
                  </div>
                )}
              </div>
            )}

            {/* Bulk Import Section */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Bulk Import</h2>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <h3 className="font-medium text-blue-900 mb-2">📥 Bulk Import med Billeder</h3>
                <p className="text-blue-700 text-sm mb-3">
                  Importér flere opskrifter på én gang. Billeder downloades automatisk og gemmes lokalt.
                </p>
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="ketoliv-format"
                      checked={isKetolivFormat}
                      onChange={(e) => setIsKetolivFormat(e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <label htmlFor="ketoliv-format" className="text-sm text-blue-800">
                      Ketoliv format (konverterer automatisk)
                    </label>
                  </div>
                  <div className="text-xs text-blue-600">
                    ✅ Billeder downloades automatisk<br/>
                    ✅ Gemmes lokalt i /public/images/recipes/<br/>
                    ✅ Ingen eksterne afhængigheder
                  </div>
                </div>
              </div>
            </div>

            {/* Recipe Input */}
            <div className="mb-6">
              <label htmlFor="recipes" className="block text-sm font-medium text-gray-700 mb-2">
                Opskrifter (JSON format)
              </label>
              <textarea
                id="recipes"
                value={recipes}
                onChange={(e) => setRecipes(e.target.value)}
                placeholder={`[
  {
    "title": "Min Opskrift",
    "description": "Beskrivelse af opskriften",
    "imageUrl": "https://example.com/image.jpg",
    ...
  }
]`}
                className="w-full h-64 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={handleImport}
                disabled={isLoading}
                className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? 'Importerer...' : 'Importér Opskrifter'}
              </button>
              
              <button
                onClick={handleDownloadImages}
                disabled={isLoading}
                className="flex-1 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? 'Downloader...' : 'Download Billeder'}
              </button>
            </div>

            {/* Instructions */}
            <div className="mt-8 p-6 bg-gray-50 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Instruktioner</h3>
              <div className="space-y-3 text-sm text-gray-700">
                <div>
                  <strong>Standard format:</strong>
                  <pre className="mt-1 p-2 bg-gray-100 rounded text-xs overflow-x-auto">
{`{
  "title": "Opskrift titel",
  "description": "Beskrivelse",
  "imageUrl": "https://example.com/image.jpg",
  "ingredients": [...],
  "instructions": [...]
}`}
                  </pre>
                </div>
                <div>
                  <strong>Ketoliv format:</strong> Marker "Ketoliv format" for automatisk konvertering
                </div>
                <div>
                  <strong>Billeder:</strong> Downloades automatisk og gemmes lokalt
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 