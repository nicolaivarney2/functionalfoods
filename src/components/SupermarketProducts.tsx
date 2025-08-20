'use client'

import { useState, useEffect } from 'react'
import { Store, Tag, TrendingUp, Clock, ShoppingCart } from 'lucide-react'

interface SupermarketProduct {
  id: string
  name: string
  description: string
  category: string
  subcategory: string
  price: number
  originalPrice: number
  unit: string
  unitPrice: number
  isOnSale: boolean
  saleEndDate: string | null
  imageUrl: string | null
  store: string
  available: boolean
  temperatureZone: string | null
  nutritionInfo: Record<string, string>
  labels: string[]
  lastUpdated: string
  source: string
}

interface SupermarketProductsProps {
  recipeTitle?: string
  maxProducts?: number
}

export default function SupermarketProducts({ recipeTitle, maxProducts = 6 }: SupermarketProductsProps) {
  const [products, setProducts] = useState<SupermarketProduct[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchSupermarketProducts()
  }, [])

  const fetchSupermarketProducts = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/supermarket/products')
      const data = await response.json()
      
      if (data.success) {
        setProducts(data.products.slice(0, maxProducts))
      } else {
        setError(data.error || 'Failed to fetch products')
      }
    } catch (error) {
      setError('Failed to fetch supermarket products')
      console.error('Error fetching supermarket products:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('da-DK', {
      style: 'currency',
      currency: 'DKK'
    }).format(price)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('da-DK', {
      day: 'numeric',
      month: 'short'
    })
  }

  const getStoreColor = (store: string) => {
    const colors: Record<string, string> = {
      'REMA 1000': 'bg-blue-600',
      'Netto': 'bg-yellow-500',
      'Føtex': 'bg-blue-500',
      'Bilka': 'bg-blue-700',
      'default': 'bg-gray-600'
    }
    return colors[store] || colors.default
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="text-center py-8">
          <p className="text-gray-500">Kunne ikke indlæse dagligvarer</p>
          <button 
            onClick={fetchSupermarketProducts}
            className="mt-2 text-sm text-green-600 hover:text-green-700 underline"
          >
            Prøv igen
          </button>
        </div>
      </div>
    )
  }

  if (products.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="text-center py-8">
          <Store className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Ingen dagligvarer tilgængelige</h3>
          <p className="text-gray-500">Der er endnu ikke indlæst nogen produkter fra supermarkederne.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Store className="h-5 w-5 text-green-600" />
            <h3 className="text-lg font-semibold text-gray-900">
              {recipeTitle ? `Dagligvarer til "${recipeTitle}"` : 'Dagligvarer'}
            </h3>
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <Clock className="h-4 w-4" />
            <span>Opdateret {formatDate(products[0]?.lastUpdated || '')}</span>
          </div>
        </div>
      </div>

      {/* Products Grid */}
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map((product) => (
            <div key={product.id} className="bg-gray-50 rounded-lg p-4 hover:shadow-md transition-shadow">
              {/* Product Image */}
              <div className="aspect-square bg-gray-200 rounded-lg mb-3 overflow-hidden">
                {product.imageUrl ? (
                  <img 
                    src={product.imageUrl} 
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Tag className="h-8 w-8 text-gray-400" />
                  </div>
                )}
              </div>

              {/* Product Info */}
              <div className="space-y-2">
                <h4 className="font-medium text-gray-900 text-sm line-clamp-2">
                  {product.name}
                </h4>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium text-white ${getStoreColor(product.store)}`}>
                      {product.store}
                    </span>
                    {product.isOnSale && (
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        Tilbud
                      </span>
                    )}
                  </div>
                </div>

                {/* Price */}
                <div className="flex items-center space-x-2">
                  <span className="text-lg font-bold text-gray-900">
                    {formatPrice(product.price)}
                  </span>
                  {product.isOnSale && product.originalPrice > product.price && (
                    <span className="text-sm text-gray-500 line-through">
                      {formatPrice(product.originalPrice)}
                    </span>
                  )}
                  <span className="text-sm text-gray-500">
                    /{product.unit}
                  </span>
                </div>

                {/* Unit Price */}
                {product.unitPrice && product.unitPrice !== product.price && (
                  <p className="text-xs text-gray-500">
                    {formatPrice(product.unitPrice)} /{product.unit}
                  </p>
                )}

                {/* Category */}
                <div className="flex items-center space-x-1 text-xs text-gray-500">
                  <Tag className="h-3 w-3" />
                  <span>{product.category}</span>
                  {product.subcategory && (
                    <>
                      <span>•</span>
                      <span>{product.subcategory}</span>
                    </>
                  )}
                </div>

                {/* Sale End Date */}
                {product.isOnSale && product.saleEndDate && (
                  <div className="flex items-center space-x-1 text-xs text-red-600">
                    <Clock className="h-3 w-3" />
                    <span>Tilbud slutter {formatDate(product.saleEndDate)}</span>
                  </div>
                )}

                {/* Labels */}
                {product.labels && product.labels.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {product.labels.slice(0, 3).map((label, index) => (
                      <span 
                        key={index}
                        className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800"
                      >
                        {label}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Action Button */}
              <button className="w-full mt-3 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center space-x-2">
                <ShoppingCart className="h-4 w-4" />
                <span>Tilføj til indkøbsliste</span>
              </button>
            </div>
          ))}
        </div>

        {/* View All Button */}
        {products.length >= maxProducts && (
          <div className="text-center mt-6">
            <a 
              href="/dagligvarer" 
              className="inline-flex items-center space-x-2 text-green-600 hover:text-green-700 font-medium"
            >
              <span>Se alle dagligvarer</span>
              <TrendingUp className="h-4 w-4" />
            </a>
          </div>
        )}
      </div>
    </div>
  )
}
