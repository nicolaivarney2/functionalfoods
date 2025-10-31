'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'

export default function AdminSettingsPage() {
  const { user } = useAuth()
  const [openaiApiKey, setOpenaiApiKey] = useState('')
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(false)
  
  // Assistant IDs for each category
  const [assistantIds, setAssistantIds] = useState({
    familiemad: '',
    keto: '',
    sense: '',
    paleo: '',
    antiinflammatorisk: '',
    fleksitarisk: '',
    '5-2': '',
    'meal-prep': ''
  })

  useEffect(() => {
    // Load current settings from config file
    loadCurrentSettings()
  }, [])

  const loadCurrentSettings = async () => {
    try {
      const response = await fetch('/api/admin/openai-config')
      if (response.ok) {
        const config = await response.json()
        setOpenaiApiKey(config.apiKey || '')
        setAssistantIds(config.assistantIds || {
          familiemad: '',
          keto: '',
          sense: '',
          paleo: '',
          antiinflammatorisk: '',
          fleksitarisk: '',
          '5-2': '',
          'meal-prep': ''
        })
      }
    } catch (error) {
      console.error('Error loading OpenAI config:', error)
    }
  }

  const saveSettings = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/openai-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          apiKey: openaiApiKey,
          assistantIds: assistantIds,
        })
      })

      if (response.ok) {
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
      } else {
        const error = await response.json()
        alert(`Fejl ved gemning: ${error.error}`)
      }
    } catch (error) {
      console.error('Error saving settings:', error)
      alert('Fejl ved gemning af indstillinger')
    } finally {
      setLoading(false)
    }
  }


  if (!user) {
    return <div className="p-8">Du skal være logget ind for at se denne side.</div>
  }

  // Fjernet admin check - alle indloggede brugere kan tilgå settings
  // Du kan tilføje admin check senere hvis nødvendigt

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Admin Indstillinger</h1>
      
      <div className="bg-white rounded-lg shadow p-6 space-y-6">
        <h2 className="text-xl font-semibold text-gray-900">OpenAI Konfiguration</h2>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            OpenAI API Nøgle
          </label>
          <input
            type="password"
            value={openaiApiKey}
            onChange={(e) => setOpenaiApiKey(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="sk-..."
          />
          <p className="text-sm text-gray-500 mt-1">
            Din OpenAI API nøgle til at generere opskriftstips
          </p>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">ChatGPT Assistant IDs</h3>
          <p className="text-sm text-gray-600">
            Konfigurer hver kategori med sin egen dedikerede Assistant
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(assistantIds).map(([category, assistantId]) => (
              <div key={category}>
                <label className="block text-sm font-medium text-gray-700 mb-2 capitalize">
                  {category.replace('-', ' ')} Assistant
                </label>
                <input
                  type="text"
                  value={assistantId}
                  onChange={(e) => setAssistantIds(prev => ({
                    ...prev,
                    [category]: e.target.value
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="asst_..."
                />
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={saveSettings}
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? '💾 Gemmer...' : saved ? '✅ Gemt!' : '💾 Gem Indstillinger'}
        </button>
      </div>


      <div className="mt-8 bg-yellow-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-yellow-900 mb-3">⚠️ Vigtig Information:</h3>
        <p className="text-yellow-800 mb-4">
          I production (Vercel) gemmes konfigurationen via environment variables. 
          For at Assistant IDs virker, skal du tilføje dem til Vercel environment variables:
        </p>
        <div className="bg-yellow-100 p-3 rounded text-sm font-mono text-yellow-900">
          OPENAI_ASSISTANT_FAMILIEMAD=asst_xxx<br/>
          OPENAI_ASSISTANT_KETO=asst_xxx<br/>
          OPENAI_ASSISTANT_SENSE=asst_xxx<br/>
          OPENAI_ASSISTANT_PALEO=asst_xxx<br/>
          OPENAI_ASSISTANT_ANTIINFLAMMATORISK=asst_xxx<br/>
          OPENAI_ASSISTANT_FLEKSITARISK=asst_xxx<br/>
          OPENAI_ASSISTANT_5_2=asst_xxx<br/>
          OPENAI_ASSISTANT_MEAL_PREP=asst_xxx
        </div>
      </div>

      <div className="mt-8 bg-blue-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-3">📋 Sådan Opretter Du Dine Assistants:</h3>
        <ol className="list-decimal list-inside space-y-2 text-blue-800">
          <li>Gå til <a href="https://platform.openai.com/assistants" target="_blank" rel="noopener noreferrer" className="underline">platform.openai.com/assistants</a></li>
          <li>Opret 8 forskellige Assistants - en for hver kategori:</li>
          <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
            <li><strong>Familiemad:</strong> "Familiemad Recipe Generator"</li>
            <li><strong>Keto:</strong> "Keto Recipe Generator"</li>
            <li><strong>Sense:</strong> "Sense Recipe Generator"</li>
            <li><strong>Paleo:</strong> "Paleo/LCHF Recipe Generator"</li>
            <li><strong>Antiinflammatorisk:</strong> "Anti-inflammatory Recipe Generator"</li>
            <li><strong>Fleksitarisk:</strong> "Flexitarian Recipe Generator"</li>
            <li><strong>5:2:</strong> "5:2 Diet Recipe Generator"</li>
            <li><strong>Meal Prep:</strong> "Meal Prep Recipe Generator"</li>
          </ul>
          <li>For hver Assistant: Kopier den relevante prompt fra koden</li>
          <li>Kopier hver Assistant ID og indsæt i det relevante felt ovenfor</li>
        </ol>
      </div>
    </div>
  )
}
