'use client'

import { useState, useEffect } from 'react'
import { useAdminAuth } from '@/hooks/useAdminAuth'

interface NettoStore {
  id: string
  name: string
  address: string
  city: string
  postalCode: string
  brand: string
}

interface NettoProduct {
  external_id: string
  name: string
  description: string
  price: number
  original_price: number
  is_on_sale: boolean
  ean: string
  unit: string
  unit_price: number
  campaign?: {
    display_text: string
    from_date: string
    to_date: string
    quantity: number
    price: number
  }
  deposit?: {
    price: number
    text: string
  }
}

export default function NettoAdminPage() {
  const { isAdmin, checking } = useAdminAuth()
  const [stores, setStores] = useState<NettoStore[]>([])
  const [selectedStore, setSelectedStore] = useState<string>('')
  const [query, setQuery] = useState<string>('')
  const [method, setMethod] = useState<string>('relevant')
  const [product, setProduct] = useState<NettoProduct | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')

  useEffect(() => {
    loadStores()
  }, [])

  const loadStores = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/dagligvarer/netto-stores')
      const data = await response.json()
      
      if (data.success) {
        setStores(data.data.stores)
        if (data.data.stores.length > 0) {
          setSelectedStore(data.data.stores[0].id)
        }
      } else {
        setError(data.message)
      }
    } catch (err) {
      setError('Failed to load stores')
    } finally {
      setLoading(false)
    }
  }

  const searchProducts = async () => {
    if (!query || !selectedStore) {
      setError('Please enter search query and select a store')
      return
    }

    try {
      setLoading(true)
      setError('')
      setProduct(null)
      
      const response = await fetch('/api/admin/dagligvarer/netto-suggestions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query: query,
          storeId: selectedStore,
          method: method,
          limit: 10
        })
      })
      
      const data = await response.json()
      
      if (data.success) {
        setProduct(data.products[0]) // Show first result
        console.log(`Found ${data.products.length} products`)
      } else {
        setError(data.message)
      }
    } catch (err) {
      setError('Failed to search products')
    } finally {
      setLoading(false)
    }
  }

  if (checking) {
    return <div className="p-8">Loading...</div>
  }

  if (!isAdmin) {
    return <div className="p-8">Access denied</div>
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Netto Product Lookup</h1>
      
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Lookup Product by EAN</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-2">Search Query</label>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Enter search query or EAN"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Search Method</label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="relevant">Relevant Products</option>
              <option value="similar">Similar Products</option>
              <option value="frequently-bought">Frequently Bought Together</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Netto Store</label>
            <select
              value={selectedStore}
              onChange={(e) => setSelectedStore(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {stores.map((store) => (
                <option key={store.id} value={store.id}>
                  {store.name} - {store.address}, {store.city}
                </option>
              ))}
            </select>
          </div>
        </div>
        
        <button
          onClick={searchProducts}
          disabled={loading || !query || !selectedStore}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Searching...' : 'Search Products'}
        </button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      {product && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Product Found</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="font-medium text-gray-700">Basic Info</h3>
              <p><strong>Name:</strong> {product.name}</p>
              <p><strong>EAN:</strong> {product.ean}</p>
              <p><strong>Description:</strong> {product.description || 'N/A'}</p>
              <p><strong>Unit:</strong> {product.unit || 'N/A'}</p>
            </div>
            
            <div>
              <h3 className="font-medium text-gray-700">Pricing</h3>
              <p><strong>Price:</strong> {product.price} DKK</p>
              <p><strong>Unit Price:</strong> {product.unit_price} DKK</p>
              <p><strong>Original Price:</strong> {product.original_price} DKK</p>
              <p><strong>On Sale:</strong> {product.is_on_sale ? 'Yes' : 'No'}</p>
            </div>
          </div>
          
          {product.campaign && (
            <div className="mt-4 p-4 bg-yellow-50 rounded-md">
              <h3 className="font-medium text-gray-700 mb-2">Campaign</h3>
              <p><strong>Display Text:</strong> {product.campaign.display_text}</p>
              <p><strong>Valid From:</strong> {new Date(product.campaign.from_date).toLocaleDateString()}</p>
              <p><strong>Valid To:</strong> {new Date(product.campaign.to_date).toLocaleDateString()}</p>
              <p><strong>Quantity:</strong> {product.campaign.quantity}</p>
              <p><strong>Price:</strong> {product.campaign.price} DKK</p>
            </div>
          )}
          
          {product.deposit && (
            <div className="mt-4 p-4 bg-green-50 rounded-md">
              <h3 className="font-medium text-gray-700 mb-2">Deposit</h3>
              <p><strong>Price:</strong> {product.deposit.price} DKK</p>
              <p><strong>Text:</strong> {product.deposit.text}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
