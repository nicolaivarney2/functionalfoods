// Core interfaces for supermarket scraping system

export interface SupermarketProduct {
  id: string | number
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
  source: string // 'rema1000', 'netto', etc.
}

export interface SupermarketAPI {
  fetchProduct(productId: number): Promise<SupermarketProduct | null>
  fetchAllProducts(): Promise<SupermarketProduct[]>
  updatePrices(existingProducts: SupermarketProduct[]): Promise<SupermarketProduct[]>
  getScrapingResult(): Promise<ScrapingResult>
}

export interface ScrapingResult {
  success: boolean
  storeName: string
  productsCount: number
  timestamp: string
  duration: number
  errors: string[]
}

// REMA 1000 specific types
export interface RemaProduct {
  id: number
  name: string
  underline: string
  department: {
    id: number
    name: string
    products_last_modified_at: string
  }
  description: string
  info: string
  declaration: string
  images: Array<{
    small: string
    medium: string
    large: string
  }>
  prices: Array<{
    price: number
    price_over_max_quantity: number | null
    max_quantity: number | null
    is_advertised: boolean
    is_campaign: boolean
    starting_at: string
    ending_at: string
    compare_unit: string
    compare_unit_price: number
  }>
  nutrition_info: Array<{
    name: string
    value: string
  }>
  labels: Array<{
    id: number
    name: string
    image: string
  }>
  temperature_zone: string | null
  is_available_in_all_stores: boolean
}

// Database storage types
export interface StoredProduct extends SupermarketProduct {
  databaseId?: string
  createdAt: string
  updatedAt: string
}

export interface PriceHistory {
  productId: string
  price: number
  originalPrice: number
  isOnSale: boolean
  saleEndDate: string | null
  timestamp: string
}

// Scraping configuration
export interface ScrapingConfig {
  enabled: boolean
  schedule: string // Cron expression for nightly updates
  delayBetweenRequests: number // Milliseconds
  maxRetries: number
  timeout: number
}

// Store configuration
export interface StoreConfig {
  name: string
  enabled: boolean
  baseUrl: string
  categories: string[]
  scrapingConfig: ScrapingConfig
}
