'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'

export default function AdminSettingsPage() {
  const { user } = useAuth()
  const [openaiApiKey, setOpenaiApiKey] = useState('')
  const [openaiAssistantId, setOpenaiAssistantId] = useState('')
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(false)

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
        setOpenaiAssistantId(config.assistantId || '')
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
          assistantId: openaiAssistantId
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

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Assistant ID
          </label>
          <input
            type="text"
            value={openaiAssistantId}
            onChange={(e) => setOpenaiAssistantId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="asst_..."
          />
          <p className="text-sm text-gray-500 mt-1">
            ID på din ChatGPT Assistant til opskriftstips
          </p>
        </div>

        <button
          onClick={saveSettings}
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? '💾 Gemmer...' : saved ? '✅ Gemt!' : '💾 Gem Indstillinger'}
        </button>

        {saved && (
          <p className="text-green-600 text-sm text-center">
            Indstillinger gemt! AI-funktionaliteten er nu aktiveret.
          </p>
        )}
      </div>

      <div className="mt-8 bg-blue-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-3">📋 Sådan Opretter Du Din Assistant:</h3>
        <ol className="list-decimal list-inside space-y-2 text-blue-800">
          <li>Gå til <a href="https://platform.openai.com/assistants" target="_blank" rel="noopener noreferrer" className="underline">platform.openai.com/assistants</a></li>
          <li>Klik "Create"</li>
          <li>Navn: "Recipe Tips Generator"</li>
          <li>Instructions: Kopier prompten fra koden</li>
          <li>Kopier Assistant ID og indsæt ovenfor</li>
        </ol>
      </div>
    </div>
  )
}
