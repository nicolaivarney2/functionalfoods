'use client'

import { useState, useEffect } from 'react'

export default function TestSimplePage() {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Simulate API call with static data
    setTimeout(() => {
      const mockData = [
        {
          id: '1',
          title: 'Test Recipe 1',
          description: 'This is a test recipe',
          totalTime: 30,
          servings: 4,
          difficulty: 'Nem'
        },
        {
          id: '2',
          title: 'Test Recipe 2',
          description: 'This is another test recipe',
          totalTime: 45,
          servings: 2,
          difficulty: 'Mellem'
        }
      ]
      setData(mockData)
      setLoading(false)
    }, 1000)
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-6">Simple Test</h1>
          <div className="text-center">
            <div className="animate-spin rounded-full border-2 border-gray-300 border-t-blue-600 w-8 h-8 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading test data...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Simple Test</h1>
        
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-6">
          <strong>Success!</strong> Loaded {data.length} test items
        </div>

        <div className="grid gap-4">
          {data.map((item) => (
            <div key={item.id} className="bg-white p-4 rounded-lg border">
              <h3 className="font-semibold text-lg">{item.title}</h3>
              <p className="text-gray-600 text-sm">{item.description}</p>
              <div className="mt-2 text-sm text-gray-500">
                <span>Time: {item.totalTime} min</span>
                <span className="ml-4">Servings: {item.servings}</span>
                <span className="ml-4">Difficulty: {item.difficulty}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
} 