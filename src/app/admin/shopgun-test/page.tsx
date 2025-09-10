'use client';

import { useState } from 'react';

interface NettoOffer {
  id: string;
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  currency: string;
  image: string;
  category: string;
  brand: string;
  validFrom: string;
  validTo: string;
  unit: string;
  size: { from: number; to: number };
  pieces: { from: number; to: number };
  source: string;
  sourceId: string;
}

export default function ShopGunTestPage() {
  const [offers, setOffers] = useState<NettoOffer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchOffers = async (endpoint: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/shopgun/netto-offers${endpoint}`);
      const data = await response.json();
      
      if (data.success) {
        setOffers(data.data.products);
      } else {
        setError(data.message || 'Failed to fetch offers');
      }
    } catch (err) {
      setError('Network error: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const searchOffers = async () => {
    if (!searchQuery.trim()) return;
    await fetchOffers(`?search=${encodeURIComponent(searchQuery)}`);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('da-DK', {
      style: 'currency',
      currency: 'DKK',
    }).format(price);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('da-DK');
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">ShopGun Netto Tilbud Test</h1>
      
      <div className="mb-8 space-y-4">
        <div className="flex gap-4">
          <button
            onClick={() => fetchOffers('')}
            disabled={loading}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Hent første side (50 tilbud)'}
          </button>
          
          <button
            onClick={() => fetchOffers('?all=true')}
            disabled={loading}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Hent alle tilbud'}
          </button>
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Søg efter produkter..."
            className="px-3 py-2 border border-gray-300 rounded flex-1"
            onKeyPress={(e) => e.key === 'Enter' && searchOffers()}
          />
          <button
            onClick={searchOffers}
            disabled={loading || !searchQuery.trim()}
            className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50"
          >
            Søg
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      <div className="mb-4">
        <p className="text-gray-600">
          {offers.length > 0 && `Viser ${offers.length} tilbud fra Netto`}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {offers.map((offer) => (
          <div key={offer.id} className="bg-white rounded-lg shadow-md overflow-hidden">
            {offer.image && (
              <img
                src={offer.image}
                alt={offer.name}
                className="w-full h-48 object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            )}
            
            <div className="p-4">
              <h3 className="font-semibold text-lg mb-2 line-clamp-2">{offer.name}</h3>
              
              {offer.description && (
                <p className="text-gray-600 text-sm mb-3 line-clamp-2">{offer.description}</p>
              )}
              
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl font-bold text-green-600">
                  {formatPrice(offer.price)}
                </span>
                {offer.originalPrice && (
                  <span className="text-lg text-gray-500 line-through">
                    {formatPrice(offer.originalPrice)}
                  </span>
                )}
              </div>
              
              <div className="text-sm text-gray-500 mb-2">
                <p>Enhed: {offer.unit}</p>
                {offer.size && (
                  <p>Størrelse: {offer.size.from}-{offer.size.to}</p>
                )}
                {offer.pieces && (
                  <p>Styk: {offer.pieces.from}-{offer.pieces.to}</p>
                )}
              </div>
              
              <div className="text-xs text-gray-400">
                <p>Gælder fra: {formatDate(offer.validFrom)}</p>
                <p>Gælder til: {formatDate(offer.validTo)}</p>
              </div>
              
              <div className="mt-2 text-xs text-blue-600">
                Kilde: {offer.source} (ID: {offer.sourceId})
              </div>
            </div>
          </div>
        ))}
      </div>

      {offers.length === 0 && !loading && (
        <div className="text-center py-12 text-gray-500">
          <p>Ingen tilbud fundet. Prøv at hente tilbud eller søge efter noget specifikt.</p>
        </div>
      )}
    </div>
  );
}

