import axios from 'axios';

export interface ShopGunOffer {
  id: string;
  ern: string;
  heading: string;
  description: string;
  catalog_page: number;
  catalog_view_id: string | null;
  pricing: {
    price: number;
    pre_price: number | null;
    currency: string;
  };
  quantity: {
    unit: {
      symbol: string;
      si: {
        symbol: string;
        factor: number;
      };
    };
    size: {
      from: number;
      to: number;
    };
    pieces: {
      from: number;
      to: number;
    };
  };
  images: {
    thumb: string;
    view: string;
  };
  run_from: string;
  run_till: string;
  publish: string;
  dealer_url: string;
  dealer_id: string;
  dealer: {
    id: string;
    ern: string;
    graph_id: string | null;
    name: string;
    website: string;
  };
}

export interface ShopGunResponse {
  offers: ShopGunOffer[];
  pagination?: {
    page: number;
    per_page: number;
    total: number;
  };
}

export class ShopGunAPI {
  private baseUrl = 'https://api.etilbudsavis.dk/v2';
  private nettoDealerId = '9ba51';

  async getNettoOffers(page: number = 1, perPage: number = 50): Promise<ShopGunResponse> {
    try {
      console.log(`Fetching Netto offers - page ${page}, per page ${perPage}`);
      
      const response = await axios.get(`${this.baseUrl}/offers`, {
        params: {
          dealer: this.nettoDealerId,
          page,
          per_page: perPage,
        },
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json',
        },
        timeout: 10000,
      });

      return {
        offers: response.data,
        pagination: {
          page,
          per_page: perPage,
          total: response.data.length,
        },
      };
    } catch (error) {
      console.error('Error fetching Netto offers from ShopGun:', error);
      throw new Error(`Failed to fetch Netto offers: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getAllNettoOffers(): Promise<ShopGunOffer[]> {
    const allOffers: ShopGunOffer[] = [];
    let page = 1;
    const perPage = 50;
    let hasMore = true;

    while (hasMore) {
      try {
        const response = await this.getNettoOffers(page, perPage);
        allOffers.push(...response.offers);
        
        // Check if we got fewer offers than requested, indicating last page
        hasMore = response.offers.length === perPage;
        page++;
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`Error fetching page ${page}:`, error);
        hasMore = false;
      }
    }

    return allOffers;
  }

  async searchNettoOffers(query: string): Promise<ShopGunOffer[]> {
    try {
      console.log(`Searching Netto offers for: ${query}`);
      
      const response = await axios.get(`${this.baseUrl}/offers`, {
        params: {
          dealer: this.nettoDealerId,
          q: query,
        },
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json',
        },
        timeout: 10000,
      });

      return response.data;
    } catch (error) {
      console.error('Error searching Netto offers:', error);
      throw new Error(`Failed to search Netto offers: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Convert ShopGun offer to our internal product format
  convertToProduct(offer: ShopGunOffer) {
    return {
      id: offer.id,
      name: offer.heading,
      description: offer.description,
      price: offer.pricing.price / 100, // Convert from øre to kroner
      originalPrice: offer.pricing.pre_price ? offer.pricing.pre_price / 100 : null,
      currency: offer.pricing.currency,
      image: offer.images.thumb,
      category: 'Tilbud', // ShopGun offers are all on sale
      brand: 'Netto',
      validFrom: new Date(offer.run_from),
      validTo: new Date(offer.run_till),
      unit: offer.quantity.unit.symbol,
      size: offer.quantity.size,
      pieces: offer.quantity.pieces,
      source: 'shopgun',
      sourceId: offer.id,
    };
  }
}

export const shopGunAPI = new ShopGunAPI();

