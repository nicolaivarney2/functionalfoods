'use client'

import { useEffect, useState } from 'react'

interface AutoPublishStatus {
  currentTime: string
  currentDate: string
  upcoming: number
  overdue: number
  published: number
  total: number
}

export default function AutoPublisher() {
  const [status, setStatus] = useState<AutoPublishStatus | null>(null)
  const [lastCheck, setLastCheck] = useState<Date | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Tjek status og udfør auto-publish
  const checkAndPublish = async () => {
    try {
      setIsRunning(true)
      setError(null)
      
      console.log('🔍 Checking auto-publish status...')
      
      // Først tjek status
      const statusResponse = await fetch('/api/admin/auto-publish')
      console.log('📡 Status response:', statusResponse.status, statusResponse.ok)
      
      if (statusResponse.ok) {
        const statusData = await statusResponse.json()
        setStatus(statusData)
        console.log('📊 Auto-publish status:', statusData)
      } else {
        const errorText = await statusResponse.text()
        console.error('❌ API error:', statusResponse.status, errorText)
        setError(`API Error: ${statusResponse.status}`)
        
        // Sæt fallback status hvis API fejler
        const now = new Date()
        setStatus({
          currentTime: now.toTimeString().slice(0, 5),
          currentDate: now.toISOString().split('T')[0],
          upcoming: 0,
          overdue: 0,
          published: 0,
          total: 0
        })
      }
      
      // Hvis der er forfaldne opskrifter, udfør auto-publish
      if (status && status.overdue > 0) {
        console.log(`🚀 Auto-publishing ${status.overdue} overdue recipes...`)
        
        const publishResponse = await fetch('/api/admin/auto-publish', {
          method: 'POST'
        })
        
        if (publishResponse.ok) {
          const publishData = await publishResponse.json()
          console.log('✅ Auto-publish completed:', publishData)
          
          // Opdater status efter udgivelse
          setTimeout(() => {
            checkAndPublish()
          }, 1000)
        }
      }
      
      setLastCheck(new Date())
      
    } catch (error) {
      console.error('❌ Error in auto-publish check:', error)
      setError('Network error')
      
      // Sæt fallback status ved network error
      const now = new Date()
      setStatus({
        currentTime: now.toTimeString().slice(0, 5),
        currentDate: now.toISOString().split('T')[0],
        upcoming: 0,
          overdue: 0,
          published: 0,
          total: 0
      })
    } finally {
      setIsRunning(false)
    }
  }

  useEffect(() => {
    // Kør første gang
    checkAndPublish()
    
    // Sæt interval til at køre hvert kvarter (15 minutter)
    const interval = setInterval(() => {
      checkAndPublish()
    }, 900000) // 15 minutter = 15 * 60 * 1000 = 900000 ms
    
    return () => clearInterval(interval)
  }, [])

  // Vis altid widget, selv hvis status er null
  return (
    <div className="fixed bottom-4 right-4 bg-white border border-gray-200 rounded-lg shadow-lg p-4 max-w-sm z-50">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-gray-900">🤖 Auto-Publisher</h3>
        <div className={`w-2 h-2 rounded-full ${isRunning ? 'bg-yellow-400' : error ? 'bg-red-400' : 'bg-green-400'}`}></div>
      </div>
      
      {error ? (
        <div className="text-xs text-red-600 space-y-1">
          <div>❌ {error}</div>
          <button
            onClick={checkAndPublish}
            disabled={isRunning}
            className="mt-2 w-full bg-red-600 text-white text-xs px-3 py-1 rounded hover:bg-red-700 disabled:opacity-50"
          >
            {isRunning ? 'Tjekker...' : 'Prøv igen'}
          </button>
        </div>
      ) : status ? (
        <div className="text-xs text-gray-600 space-y-1">
          <div>⏰ {status.currentTime} • {status.currentDate}</div>
          <div>📅 I dag: {status.total} opskrifter</div>
          <div className="flex space-x-3">
            <span className="text-blue-600">⏳ {status.upcoming} planlagt</span>
            <span className="text-yellow-600">⚠️ {status.overdue} forfalden</span>
            <span className="text-green-600">✅ {status.published} udgivet</span>
          </div>
          <div className="text-xs text-gray-500 mt-1">
            🔄 Tjekker hvert kvarter automatisk
          </div>
        </div>
      ) : (
        <div className="text-xs text-gray-600 space-y-1">
          <div>⏳ Indlæser status...</div>
          <button
            onClick={checkAndPublish}
            disabled={isRunning}
            className="mt-2 w-full bg-blue-600 text-white text-xs px-3 py-1 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {isRunning ? 'Tjekker...' : 'Tjek status'}
          </button>
        </div>
      )}
      
      {lastCheck && (
        <div className="text-xs text-gray-500 mt-2">
          Sidste tjek: {lastCheck.toLocaleTimeString('da-DK')}
        </div>
      )}
      
      {status && status.overdue > 0 && (
        <button
          onClick={checkAndPublish}
          disabled={isRunning}
          className="mt-2 w-full bg-blue-600 text-white text-xs px-3 py-1 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {isRunning ? 'Udgiver...' : `Udgiv ${status.overdue} opskrifter`}
        </button>
      )}
    </div>
  )
}
