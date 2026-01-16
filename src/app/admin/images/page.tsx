'use client'

import { useState, useEffect } from 'react'
import AdminLayout from '@/components/AdminLayout'
import { useAdminAuth } from '@/hooks/useAdminAuth'
import { Download, RefreshCw, FileImage, ExternalLink } from 'lucide-react'

interface RecipeImage {
  id: string
  title: string
  slug: string
  imageUrl: string
  createdAt: string
  updatedAt: string
}

export default function AdminImagesPage() {
  const { isAdmin, checking } = useAdminAuth()
  const [images, setImages] = useState<RecipeImage[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    total: 0,
    local: 0,
    external: 0,
    supabase: 0
  })

  useEffect(() => {
    loadImages()
  }, [])

  const loadImages = async () => {
    try {
      const response = await fetch('/api/admin/images')
      if (response.ok) {
        const data = await response.json()
        // API returns recipes array directly, not wrapped in data.recipes
        const recipesArray = Array.isArray(data) ? data : []
        setImages(recipesArray)
        
        // Calculate stats
        const supabaseImages = recipesArray.filter((img: RecipeImage) => 
          img.imageUrl && img.imageUrl.includes('supabase.co')
        )
        const localImages = recipesArray.filter((img: RecipeImage) => 
          img.imageUrl && img.imageUrl.startsWith('/images/')
        )
        const externalImages = recipesArray.filter((img: RecipeImage) => 
          img.imageUrl && !img.imageUrl.includes('supabase.co') && !img.imageUrl.startsWith('/images/')
        )
        
        setStats({
          total: recipesArray.length,
          local: localImages.length,
          external: externalImages.length,
          supabase: supabaseImages.length
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

  const getImageSource = (imageUrl: string) => {
    if (imageUrl.includes('supabase.co')) return 'Supabase Storage'
    if (imageUrl.startsWith('/images/')) return 'Local'
    return 'External'
  }

  const getImageSourceColor = (imageUrl: string) => {
    if (imageUrl.includes('supabase.co')) return 'text-green-600 bg-green-100'
    if (imageUrl.startsWith('/images/')) return 'text-blue-600 bg-blue-100'
    return 'text-orange-600 bg-orange-100'
  }

  if (checking) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600">You need admin privileges to view this page.</p>
        </div>
      </div>
    )
  }

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Image Management</h1>
          <button
            onClick={loadImages}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
            <div className="text-sm text-gray-600">Total Images</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-2xl font-bold text-green-600">{stats.supabase}</div>
            <div className="text-sm text-gray-600">Supabase Storage</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-2xl font-bold text-blue-600">{stats.local}</div>
            <div className="text-sm text-gray-600">Local Images</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-2xl font-bold text-orange-600">{stats.external}</div>
            <div className="text-sm text-gray-600">External URLs</div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Image
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Recipe
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Source
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      URL
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {images.map((image) => (
                    <tr key={image.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex-shrink-0 h-16 w-16">
                          <img
                            className="h-16 w-16 rounded-lg object-cover"
                            src={image.imageUrl}
                            alt={image.title}
                            onError={(e) => {
                              const target = e.target as HTMLImageElement
                              target.src = '/images/recipe-placeholder.jpg'
                            }}
                          />
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{image.title}</div>
                        <div className="text-sm text-gray-500">{image.slug}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getImageSourceColor(image.imageUrl)}`}>
                          {getImageSource(image.imageUrl)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 max-w-xs truncate">
                          {image.imageUrl}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => downloadImage(image.imageUrl, image.title)}
                            className="text-blue-600 hover:text-blue-900"
                            title="Download image"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                          <a
                            href={image.imageUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-green-600 hover:text-green-900"
                            title="View image"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {images.length === 0 && !loading && (
          <div className="text-center py-12">
            <FileImage className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No images found</h3>
            <p className="mt-1 text-sm text-gray-500">Start by importing some recipes with images.</p>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
