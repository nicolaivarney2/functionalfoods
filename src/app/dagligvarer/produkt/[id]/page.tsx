'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ShoppingCart, Heart, Share2, TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface Product {
  id: string
  external_id: string
  name: string
  description: string | null
  category: string | null
  subcategory: string | null
  price: number
  original_price: number
  unit: string | null
  amount: number | null
  quantity: string | null
  unit_price: number | null
  is_on_sale: boolean
  sale_end_date: string | null
  currency: string
  store: string
  store_url: string | null
  image_url: string | null
  available: boolean
  temperature_zone: string | null
  nutrition_info: any
  labels: string[]
  source: string
  last_updated: string
  metadata: any
  discount_percentage?: number
}

// 🚀 STATE-OF-THE-ART PRICE CHART COMPONENT
interface PriceChartProps {
  data: any[]
  currentPrice: number
  hoveredPoint: any
  onHover: (point: any) => void
}

function PriceChart({ data, currentPrice, hoveredPoint, onHover }: PriceChartProps) {
  if (!data || data.length === 0) return null
  
  // Calculate chart dimensions and scales
  const chartWidth = 800
  const chartHeight = 200
  const padding = 40
  
  const prices = data.map(d => d.price)
  const minPrice = Math.min(...prices)
  const maxPrice = Math.max(...prices)
  const priceRange = maxPrice - minPrice || 1 // Avoid division by zero
  
  // Create SVG path for the price line
  const createPath = () => {
    const points = data.map((d, i) => {
      const x = padding + (i / (data.length - 1)) * (chartWidth - 2 * padding)
      const y = padding + ((maxPrice - d.price) / priceRange) * (chartHeight - 2 * padding)
      return `${x},${y}`
    })
    
    return `M${points.join(' L')}`
  }
  
  // Create area path for gradient fill
  const createAreaPath = () => {
    const points = data.map((d, i) => {
      const x = padding + (i / (data.length - 1)) * (chartWidth - 2 * padding)
      const y = padding + ((maxPrice - d.price) / priceRange) * (chartHeight - 2 * padding)
      return { x, y }
    })
    
    if (points.length === 0) return ''
    
    let path = `M${points[0].x},${chartHeight - padding}`
    path += ` L${points[0].x},${points[0].y}`
    
    for (let i = 1; i < points.length; i++) {
      path += ` L${points[i].x},${points[i].y}`
    }
    
    path += ` L${points[points.length - 1].x},${chartHeight - padding}`
    path += ' Z'
    
    return path
  }
  
  // Calculate price trend
  const priceChange = data.length > 1 ? data[data.length - 1].price - data[0].price : 0
  const priceChangePercent = data.length > 1 ? ((priceChange / data[0].price) * 100) : 0
  
  return (
    <div className="space-y-4">
      {/* Price Summary Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-xl border border-green-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-green-600 uppercase tracking-wide">Laveste Pris</p>
              <p className="text-2xl font-bold text-green-900">{minPrice.toFixed(2)} kr</p>
            </div>
            <TrendingDown className="w-8 h-8 text-green-500" />
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-xl border border-blue-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-blue-600 uppercase tracking-wide">Aktuel Pris</p>
              <p className="text-2xl font-bold text-blue-900">{currentPrice.toFixed(2)} kr</p>
            </div>
            <Minus className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-red-50 to-rose-50 p-4 rounded-xl border border-red-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-red-600 uppercase tracking-wide">Højeste Pris</p>
              <p className="text-2xl font-bold text-red-900">{maxPrice.toFixed(2)} kr</p>
            </div>
            <TrendingUp className="w-8 h-8 text-red-500" />
          </div>
        </div>
      </div>
      
      {/* Price Trend Indicator */}
      <div className={`flex items-center gap-2 p-3 rounded-lg ${priceChange >= 0 ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
        {priceChange >= 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
        <span className="font-medium">
          {priceChange >= 0 ? 'Prisen er steget' : 'Prisen er faldet'} med {Math.abs(priceChangePercent).toFixed(1)}% 
          ({priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)} kr)
        </span>
      </div>
      
      {/* Interactive Chart */}
      <div className="relative">
        <svg 
          width={chartWidth} 
          height={chartHeight}
          className="w-full h-auto rounded-lg"
          style={{ maxWidth: '100%' }}
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
        >
          {/* Gradient definitions */}
          <defs>
            <linearGradient id="priceGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.05" />
            </linearGradient>
            <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#6366F1" />
              <stop offset="50%" stopColor="#3B82F6" />
              <stop offset="100%" stopColor="#06B6D4" />
            </linearGradient>
          </defs>
          
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => (
            <g key={i}>
              <line
                x1={padding}
                y1={padding + ratio * (chartHeight - 2 * padding)}
                x2={chartWidth - padding}
                y2={padding + ratio * (chartHeight - 2 * padding)}
                stroke="#E5E7EB"
                strokeWidth="1"
                strokeDasharray="2,2"
              />
              <text
                x={padding - 10}
                y={padding + ratio * (chartHeight - 2 * padding) + 5}
                textAnchor="end"
                className="text-xs fill-gray-400"
              >
                {(maxPrice - ratio * priceRange).toFixed(0)} kr
              </text>
            </g>
          ))}
          
          {/* Area fill */}
          <path
            d={createAreaPath()}
            fill="url(#priceGradient)"
            className="transition-all duration-300"
          />
          
          {/* Price line */}
          <path
            d={createPath()}
            fill="none"
            stroke="url(#lineGradient)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="drop-shadow-sm"
          />
          
          {/* Interactive points */}
          {data.map((point, i) => {
            const x = padding + (i / (data.length - 1)) * (chartWidth - 2 * padding)
            const y = padding + ((maxPrice - point.price) / priceRange) * (chartHeight - 2 * padding)
            
            return (
              <g key={i}>
                <circle
                  cx={x}
                  cy={y}
                  r={hoveredPoint === point ? 8 : 5}
                  fill="#3B82F6"
                  stroke="white"
                  strokeWidth="2"
                  className="cursor-pointer transition-all duration-200 hover:r-8 drop-shadow-md"
                  onMouseEnter={() => onHover(point)}
                  onMouseLeave={() => onHover(null)}
                />
                
                {/* Hover tooltip */}
                {hoveredPoint === point && (
                  <g>
                    <rect
                      x={x - 50}
                      y={y - 40}
                      width="100"
                      height="30"
                      rx="6"
                      fill="rgba(0,0,0,0.8)"
                      className="drop-shadow-lg"
                    />
                    <text
                      x={x}
                      y={y - 25}
                      textAnchor="middle"
                      className="text-xs fill-white font-medium"
                    >
                      {point.price.toFixed(2)} kr
                    </text>
                    <text
                      x={x}
                      y={y - 12}
                      textAnchor="middle"
                      className="text-xs fill-gray-300"
                    >
                      {new Date(point.timestamp).toLocaleDateString('da-DK')}
                    </text>
                  </g>
                )}
              </g>
            )
          })}
        </svg>
        
        {/* Timeline labels */}
        <div className="flex justify-between mt-2 px-10">
          {data.map((point, i) => {
            if (i === 0 || i === data.length - 1 || i === Math.floor(data.length / 2)) {
              return (
                <span key={i} className="text-xs text-gray-500">
                  {new Date(point.timestamp).toLocaleDateString('da-DK', { 
                    month: 'short', 
                    day: 'numeric' 
                  })}
                </span>
              )
            }
            return null
          })}
        </div>
      </div>
    </div>
  )
}

export default function ProductPage() {
  const params = useParams()
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [priceHistory, setPriceHistory] = useState<any[]>([])
  const [priceLoading, setPriceLoading] = useState(false)
  const [hoveredPoint, setHoveredPoint] = useState<any>(null)
  const [similarProducts, setSimilarProducts] = useState<Product[]>([])
  const [otherSizeProducts, setOtherSizeProducts] = useState<Product[]>([])
  const [similarLoading, setSimilarLoading] = useState(false)

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true)
        const response = await fetch(`/api/supermarket/product/${params.id}`)
        const data = await response.json()
        if (data.success && data.product) {
          setProduct(data.product)
          if (data.similarProducts) {
            setSimilarProducts(data.similarProducts)
          }
          if (data.otherSizeProducts) {
            setOtherSizeProducts(data.otherSizeProducts)
          }
        } else {
          setError('Produkt ikke fundet')
        }
      } catch (err) {
        setError('Fejl ved hentning af produkt')
        console.error('Error fetching product:', err)
      } finally {
        setLoading(false)
      }
    }

    if (params.id) {
      fetchProduct()
    }
  }, [params.id])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="bg-white rounded-lg shadow-sm p-8">
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="bg-white rounded-lg shadow-sm p-8">
            <div className="text-center py-12">
              <h1 className="text-2xl font-bold text-gray-900 mb-4">Produkt ikke fundet</h1>
              <p className="text-gray-600 mb-6">{error || 'Produktet kunne ikke indlæses'}</p>
              <Link 
                href="/dagligvarer" 
                className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                <ArrowLeft size={16} className="mr-2" />
                Tilbage til dagligvarer
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Filtrer andre størrelser så vi ikke viser samme butik i begge lister
  const storesShownInSameSize = new Set<string>([
    product.store,
    ...similarProducts.map((p) => p.store),
  ])
  const filteredOtherSizeProducts = otherSizeProducts.filter(
    (p) => !storesShownInSameSize.has(p.store)
  )

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Back button */}
        <div className="mb-6">
          <Link 
            href="/dagligvarer" 
            className="inline-flex items-center text-green-600 hover:text-green-700"
          >
            <ArrowLeft size={16} className="mr-2" />
            Tilbage til dagligvarer
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {/* Product header */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">{product.name}</h1>
                {product.description && (
                  <p className="text-gray-600 text-lg">{product.description}</p>
                )}
                {product.is_on_sale && (
                  <span className="inline-block bg-red-100 text-red-800 text-sm px-3 py-1 rounded-full mt-2">
                    TILBUD
                  </span>
                )}
              </div>
              <div className="flex gap-2 ml-4">
                <button className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100">
                  <Heart size={20} />
                </button>
                <button className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100">
                  <Share2 size={20} />
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 p-6">
            {/* Product image */}
            <div className="flex justify-center">
              {product.image_url ? (
                <img 
                  src={product.image_url.startsWith('http') 
                    ? `/api/images/proxy?url=${encodeURIComponent(product.image_url)}`
                    : product.image_url
                  } 
                  alt={product.name}
                  className="w-80 h-80 object-cover rounded-lg shadow-lg"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                  loading="lazy"
                />
              ) : (
                <div className="w-80 h-80 bg-gray-200 rounded-lg flex items-center justify-center">
                  <span className="text-gray-400">Intet billede</span>
                </div>
              )}
            </div>

            {/* Product details */}
            <div className="space-y-6">
              {/* Price section */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-baseline gap-3 mb-2">
                  <span className="text-3xl font-bold text-gray-900">
                    {product.price?.toFixed(2)} kr
                  </span>
                  {product.original_price && product.price < product.original_price && (
                    <span className="text-lg text-gray-500 line-through">
                      {product.original_price.toFixed(2)} kr
                    </span>
                  )}
                </div>
                
                {product.unit_price && product.unit_price > 0 && (
                  <p className="text-sm text-gray-600">
                    Pris pr. {product.unit || 'enhed'}: {product.unit_price.toFixed(2)} kr
                  </p>
                )}
              </div>

              {/* Quantity and unit info */}
              <div className="space-y-3">
                {product.amount && product.unit && (
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-gray-600">Mængde:</span>
                    <span className="font-medium">{product.amount} {product.unit}</span>
                  </div>
                )}
                
                {product.quantity && !product.amount && (
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-gray-600">Mængde:</span>
                    <span className="font-medium">{product.quantity}</span>
                  </div>
                )}

                {product.category && (
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-gray-600">Kategori:</span>
                    <span className="font-medium">{product.category}</span>
                  </div>
                )}

                {product.subcategory && (
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-gray-600">Underkategori:</span>
                    <span className="font-medium">{product.subcategory}</span>
                  </div>
                )}

                {/* Show all stores with this product */}
                <div className="py-2 border-b border-gray-100">
                  <span className="text-gray-600">Butik med varen:</span>
                  <div className="mt-2 space-y-2">
                    {/* Current store */}
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded border-2 ${
                          product.store === 'Netto' ? 'border-yellow-400 bg-yellow-100' :
                          product.store === 'REMA 1000' ? 'border-blue-900 bg-blue-100' :
                          product.store === 'Føtex' ? 'border-blue-950 bg-blue-100' :
                          product.store === 'Bilka' ? 'border-blue-400 bg-blue-100' :
                          product.store === 'Nemlig' ? 'border-orange-600 bg-orange-100' :
                          product.store === 'MENY' ? 'border-red-800 bg-red-100' :
                          product.store === 'Spar' ? 'border-red-600 bg-red-100' :
                          'border-gray-300 bg-gray-100'
                        }`}></div>
                        <span className="font-medium">{product.store} (denne side)</span>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-lg">
                          {product.is_on_sale ? (
                            <span className="text-red-600">{(product.price || 0).toFixed(2)} kr</span>
                          ) : (
                            <span>{(product.price || 0).toFixed(2)} kr</span>
                          )}
                        </div>
                        {product.is_on_sale && product.discount_percentage && (
                          <div className="text-xs text-green-600 font-semibold">
                            SPAR {product.discount_percentage}%
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Similar products from other stores (samme størrelse) */}
                    {similarLoading ? (
                      <div className="text-sm text-gray-500">Indlæser andre butikker...</div>
                    ) : (
                      similarProducts.map((similarProduct) => (
                        <div key={similarProduct.id} className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded border-2 ${
                              similarProduct.store === 'Netto' ? 'border-yellow-400 bg-yellow-100' :
                              similarProduct.store === 'REMA 1000' ? 'border-blue-900 bg-blue-100' :
                              similarProduct.store === 'Føtex' ? 'border-blue-950 bg-blue-100' :
                              similarProduct.store === 'Bilka' ? 'border-blue-400 bg-blue-100' :
                              similarProduct.store === 'Nemlig' ? 'border-orange-600 bg-orange-100' :
                              similarProduct.store === 'MENY' ? 'border-red-800 bg-red-100' :
                              similarProduct.store === 'Spar' ? 'border-red-600 bg-red-100' :
                              'border-gray-300 bg-gray-100'
                            }`}></div>
                            {similarProduct.store_url ? (
                              <a 
                                href={similarProduct.store_url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="font-medium text-blue-600 hover:text-blue-800 hover:underline"
                              >
                                {similarProduct.store}
                              </a>
                            ) : (
                              <span className="font-medium">{similarProduct.store}</span>
                            )}
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-lg">
                              {similarProduct.is_on_sale ? (
                                <span className="text-red-600">{(similarProduct.price || 0).toFixed(2)} kr</span>
                              ) : (
                                <span>{(similarProduct.price || 0).toFixed(2)} kr</span>
                              )}
                            </div>
                            {similarProduct.is_on_sale && similarProduct.discount_percentage && (
                              <div className="text-xs text-green-600 font-semibold">
                                SPAR {similarProduct.discount_percentage}%
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    )}

                    {!similarLoading && similarProducts.length === 0 && (
                      <div className="text-sm text-gray-500">
                        Produktet blev ikke fundet i andre butikker
                      </div>
                    )}
                  </div>
                </div>

                {/* Andre størrelser af samme produkt */}
                {filteredOtherSizeProducts.length > 0 && (
                  <div className="pt-4 border-t border-gray-100">
                    <span className="text-gray-600">Andre størrelser af denne vare:</span>
                    <div className="mt-2 space-y-2">
                      {filteredOtherSizeProducts.map((p) => (
                        <Link
                          key={p.id}
                          href={`/dagligvarer/produkt/${p.id}`}
                          className="flex justify-between items-center text-sm hover:bg-gray-50 rounded-lg px-2 py-1 transition-colors"
                        >
                          <div className="flex flex-col">
                            <span className="font-medium text-gray-900">
                              {p.store} · {p.amount && p.unit ? `${p.amount} ${p.unit}` : 'Anden størrelse'}
                            </span>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold">
                              {p.is_on_sale ? (
                                <span className="text-red-600">{(p.price || 0).toFixed(2)} kr</span>
                              ) : (
                                <span>{(p.price || 0).toFixed(2)} kr</span>
                              )}
                            </div>
                            {p.is_on_sale && p.discount_percentage && (
                              <div className="text-xs text-green-600 font-semibold">
                                SPAR {p.discount_percentage}%
                              </div>
                            )}
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {product.available !== undefined && (
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-gray-600">Tilgængelig:</span>
                    <span className={`font-medium ${product.available ? 'text-green-600' : 'text-red-600'}`}>
                      {product.available ? 'Ja' : 'Nej'}
                    </span>
                  </div>
                )}
              </div>

              {/* Labels */}
              {product.labels && product.labels.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-2">Labels:</h3>
                  <div className="flex flex-wrap gap-2">
                    {product.labels.map((label, index) => (
                      <span 
                        key={index}
                        className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full"
                      >
                        {label}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-3 pt-4">
                <button className="flex-1 bg-green-600 text-white py-3 px-6 rounded-lg hover:bg-green-700 flex items-center justify-center gap-2">
                  <ShoppingCart size={20} />
                  Tilføj til kurv
                </button>
                {/* "Se i butik" knap fjernet - REMA 1000 links giver 404 fejl */}
              </div>
            </div>
          </div>

          {/* 🚀 STATE-OF-THE-ART PRICE HISTORY CHART */}
          {priceHistory.length > 0 && (
            <div className="p-6 border-t border-gray-200 bg-gradient-to-br from-blue-50 to-indigo-50">
              <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                <div className="p-2 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-white" />
                </div>
                Prisudvikling
                <span className="text-sm font-normal text-gray-500">
                  Sidste {priceHistory.length} opdateringer
                </span>
              </h3>
              
              <div className="bg-white rounded-2xl shadow-lg p-6 border border-white/50">
                <PriceChart 
                  data={priceHistory} 
                  currentPrice={product.price}
                  hoveredPoint={hoveredPoint}
                  onHover={setHoveredPoint}
                />
              </div>
            </div>
          )}

          {/* Nutrition info */}
          {product.nutrition_info && (
            <div className="p-6 border-t border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Næringsindhold</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(product.nutrition_info).map(([key, value]) => (
                  <div key={key} className="text-center">
                    <div className="text-sm text-gray-600 capitalize">{key.replace(/_/g, ' ')}</div>
                    <div className="font-medium">{value as string}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Metadata */}
          {product.metadata && (
            <div className="p-6 border-t border-gray-200 bg-gray-50">
              <h3 className="text-sm font-medium text-gray-900 mb-2">Produktdetaljer</h3>
              <div className="text-xs text-gray-600 space-y-1">
                <div>Kilde: {product.source}</div>
                <div>Sidst opdateret: {new Date(product.last_updated).toLocaleString('da-DK')}</div>
                {product.metadata.rema_id && <div>REMA ID: {product.metadata.rema_id}</div>}
                {product.metadata.brand && <div>Mærke: {product.metadata.brand}</div>}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
