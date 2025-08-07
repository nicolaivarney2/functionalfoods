'use client'

import { useState } from 'react'
import { databaseService } from '@/lib/database-service'

export default function TestDatabasePage() {
  const [isTesting, setIsTesting] = useState(false)
  const [result, setResult] = useState<string>('')

  const handleTestConnection = async () => {
    setIsTesting(true)
    setResult('Testing connection...')
    
    try {
      const connectionOk = await databaseService.testConnection()
      
      if (connectionOk) {
        setResult('✅ Connection successful!')
        
        // Test database structure
        const structure = await databaseService.checkDatabaseStructure()
        const stats = await databaseService.getDatabaseStats()
        
        setResult(prev => prev + `\n📊 Database structure: ${JSON.stringify(structure, null, 2)}`)
        setResult(prev => prev + `\n📈 Database stats: ${JSON.stringify(stats, null, 2)}`)
        
      } else {
        setResult('❌ Connection failed!')
      }
    } catch (error) {
      setResult(`❌ Error: ${error}`)
    } finally {
      setIsTesting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Database Test</h1>
        
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <button
            onClick={handleTestConnection}
            disabled={isTesting}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {isTesting ? 'Testing...' : 'Test Database Connection'}
          </button>
          
          {result && (
            <div className="mt-6">
              <h2 className="text-lg font-semibold mb-2">Result:</h2>
              <pre className="bg-gray-100 p-4 rounded-lg text-sm overflow-auto">
                {result}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 