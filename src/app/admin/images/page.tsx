'use client'

import { useState, useEffect } from 'react'
import AdminLayout from '@/components/AdminLayout'
import { useAdminAuth } from '@/hooks/useAdminAuth'
import { Image, Download, Trash2, RefreshCw, Eye, FileImage } from 'lucide-react'

interface RecipeImage {
  id: string
  recipe_id: string
  recipe_title: string
  image_url: string
  local_path?: string
  file_size?: number
  created_at: string
  updated_at: string
}

export default function AdminImagesPage() {
  const { isAdmin, checking } = useAdminAuth()
  const [images, setImages] = useState<RecipeImage[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    total: 0,
    local: 0,
    external: 0,
    totalSize: 0
  })

  useEffect(() => {
    loadImages()
  }, [])

  const loadImages = async () => {
    try {
      const response = await fetch('/api/admin/images')
      if (response.ok) {
        const data = await response.json()
        setImages(data.images || [])
        
        // Calculate stats
        const localImages = data.images.filter((img: RecipeImage) => img.local_path)
        const totalSize = data.images.reduce((sum: number, img: RecipeImage) => sum + (img.file_size || 0), 0)
        
        setStats({
          total: data.images.length,
          local: localImages.length,
          external: data.images.length - localImages.length,
          totalSize
        })
      }
    } catch (error) {
      console.error('Error loading images:', error)
    } finally {
      setLoading(false)
    }
  }

  const downloadImage = async (imageUrl: string, recipeTitle: string) => {
    try {
      const response = await fetch(imageUrl)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${recipeTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.jpg`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Error downloading image:', error)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  if (checking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Tjekker admin rettigheder...</p>
        </div>
      </div>
    )
  }

  if (!isAdmin) {
    return null
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Billedeadministration</h1>
          <p className="mt-2 text-gray-600">
            Administrer billeder for alle opskrifter i systemet.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-4">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Image className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Total billeder
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {stats.total}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <FileImage className="h-6 w-6 text-green-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Lokale billeder
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {stats.local}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Image className="h-6 w-6 text-blue-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Eksterne billeder
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {stats.external}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Download className="h-6 w-6 text-purple-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Total størrelse
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {formatFileSize(stats.totalSize)}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">Handlinger</h3>
            <button
              onClick={loadImages}
              disabled={loading}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Opdater
            </button>
          </div>
        </div>

        {/* Images Grid */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <div className="px-4 py-5 sm:px-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Alle billeder ({images.length})
              </h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4">
              {images.map((image) => (
                <div key={image.id} className="bg-gray-50 rounded-lg p-4">
                  <div className="aspect-w-16 aspect-h-9 mb-3">
                    <img
                      src={image.image_url}
                      alt={image.recipe_title}
                      className="w-full h-32 object-cover rounded-lg"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement
                        target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2YzZjRmNiIvPjx0ZXh0IHg9IjEwMCIgeT0iMTAwIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5Y2EzYWYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5JbWFnZSBub3QgZm91bmQ8L3RleHQ+PC9zdmc+'
                      }}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-gray-900 truncate">
                      {image.recipe_title}
                    </h4>
                    
                    <div className="flex items-center text-xs text-gray-500">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        image.local_path ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {image.local_path ? 'Lokal' : 'Ekstern'}
                      </span>
                    </div>

                    {image.file_size && (
                      <p className="text-xs text-gray-500">
                        Størrelse: {formatFileSize(image.file_size)}
                      </p>
                    )}

                    <div className="flex space-x-2 pt-2">
                      <button
                        onClick={() => window.open(image.image_url, '_blank')}
                        className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-gray-300 shadow-sm text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        Se
                      </button>
                      <button
                        onClick={() => downloadImage(image.image_url, image.recipe_title)}
                        className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-gray-300 shadow-sm text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        <Download className="h-3 w-3 mr-1" />
                        Download
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
