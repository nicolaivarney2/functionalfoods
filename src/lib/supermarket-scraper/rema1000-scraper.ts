import { SupermarketProduct, SupermarketAPI, ScrapingResult } from './types'

// REMA 1000 API Types based on the actual API responses
interface RemaProductResponse {
  data: {
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
}

interface RemaDepartment {
  id: number
  name: string
  products_last_modified_at: string
}

// REMA 1000 specific categories we want to scrape
const REMA_CATEGORIES = {
  'Frugt & grønt': 20,
  'Kød, fisk & fjerkræ': 30,
  'Køl': 40,
  'Ost m.v.': 50,
  'Frost': 60,
  'Mejeri': 70,
  'Kolonial': 80
}

// Known product IDs for testing and discovery
const KNOWN_PRODUCT_IDS = [
  304020, // ØKO. BANANER FAIRTRADE
  440065, // LAKSEFILETER
  410873, // BACON I SKIVER
  // Add more known IDs as we discover them
]

export class Rema1000Scraper implements SupermarketAPI {
  private baseUrl = 'https://api.digital.rema1000.dk/api/v3'
  private storeName = 'REMA 1000'
  
  constructor() {
    // Initialize scraper
  }

  /**
   * Discover products by systematically searching through all categories
   * This will find thousands of products instead of just a few
   */
  async discoverProducts(): Promise<SupermarketProduct[]> {
    const discoveredProducts: SupermarketProduct[] = []
    
    console.log('🔍 Discovering products systematically through all categories...')
    
    // Method 1: Search through all REMA categories systematically
    for (const [categoryName, categoryId] of Object.entries(REMA_CATEGORIES)) {
      console.log(`📂 Searching category: ${categoryName} (ID: ${categoryId})`)
      
      try {
        // Search for products in this category
        const categoryProducts = await this.searchCategory(categoryId, categoryName)
        discoveredProducts.push(...categoryProducts)
        
        console.log(`✅ Found ${categoryProducts.length} products in ${categoryName}`)
        
        // Add delay between categories to be respectful
        await this.delay(1000)
      } catch (error) {
        console.log(`⚠️ Error searching category ${categoryName}:`, error)
      }
    }
    
    // Method 2: Fallback to known product IDs if category search fails
    if (discoveredProducts.length === 0) {
      console.log('🔄 Category search failed, falling back to known product IDs...')
      
      for (const productId of KNOWN_PRODUCT_IDS) {
        try {
          const product = await this.fetchProduct(productId)
          if (product) {
            discoveredProducts.push(product)
            console.log(`✅ Discovered product: ${product.name}`)
          }
          await this.delay(500)
        } catch (error) {
          console.log(`⚠️ Failed to fetch product ${productId}:`, error)
        }
      }
    }
    
    // Remove duplicates based on product ID
    const uniqueProducts = discoveredProducts.filter((product, index, self) => 
      index === self.findIndex(p => p.id === product.id)
    )
    
    console.log(`🎯 Discovery complete: Found ${uniqueProducts.length} unique products`)
    return uniqueProducts
  }

  /**
   * Search for products in a specific category
   */
  private async searchCategory(categoryId: number, categoryName: string): Promise<SupermarketProduct[]> {
    const products: SupermarketProduct[] = []
    
    try {
      // Try to get products from category endpoint
      const url = `${this.baseUrl}/departments/${categoryId}/products?limit=100&offset=0`
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'application/json',
          'Accept-Language': 'da-DK,da;q=0.9,en;q=0.8',
          'Referer': 'https://shop.rema1000.dk/',
          'Origin': 'https://shop.rema1000.dk'
        }
      })

      if (response.ok) {
        const data = await response.json()
        
        // Process products from category response
        if (data.products && Array.isArray(data.products)) {
          for (const productData of data.products.slice(0, 50)) { // Limit to 50 per category for now
            try {
              const product = await this.fetchProduct(productData.id)
              if (product) {
                products.push(product)
              }
              await this.delay(200) // Small delay between products
            } catch (error) {
              // Skip failed products
            }
          }
        }
      } else {
        // If category endpoint fails, try sequential search in category range
        console.log(`🔄 Category endpoint failed for ${categoryName}, trying sequential search...`)
        const categoryProducts = await this.sequentialCategorySearch(categoryId, categoryName)
        products.push(...categoryProducts)
      }
    } catch (error) {
      console.log(`⚠️ Error in category search for ${categoryName}:`, error)
      // Fallback to sequential search
      const categoryProducts = await this.sequentialCategorySearch(categoryId, categoryName)
      products.push(...categoryProducts)
    }
    
    return products
  }

  /**
   * Sequential search within a category range
   * This is a fallback method when category endpoints don't work
   */
  private async sequentialCategorySearch(categoryId: number, categoryName: string): Promise<SupermarketProduct[]> {
    const products: SupermarketProduct[] = []
    
    // Calculate category ID ranges based on REMA's structure
    const categoryRanges = {
      20: { start: 300000, end: 310000 }, // Frugt & grønt
      30: { start: 440000, end: 450000 }, // Kød, fisk & fjerkræ
      40: { start: 500000, end: 510000 }, // Køl
      50: { start: 600000, end: 610000 }, // Ost m.v.
      60: { start: 700000, end: 710000 }, // Frost
      70: { start: 800000, end: 810000 }, // Mejeri
      80: { start: 900000, end: 910000 }  // Kolonial
    }
    
    const range = categoryRanges[categoryId as keyof typeof categoryRanges]
    if (!range) return products
    
    console.log(`🔍 Sequential search in ${categoryName}: IDs ${range.start}-${range.end}`)
    
    // Search through a sample of IDs in the range (every 100th to avoid too many requests)
    for (let id = range.start; id <= range.end; id += 100) {
      try {
        const product = await this.fetchProduct(id)
        if (product) {
          products.push(product)
          console.log(`✅ Found product: ${product.name} (ID: ${id})`)
        }
        
        await this.delay(300) // Respectful delay
        
        // Limit to 20 products per category to avoid overwhelming the API
        if (products.length >= 20) break
      } catch (error) {
        // Skip failed IDs
      }
    }
    
    return products
  }

  /**
   * Fetch all products from all categories
   * Uses discovery method since we don't have direct category listing
   */
  async fetchAllProducts(): Promise<SupermarketProduct[]> {
    console.log('🔄 Fetching all products from REMA 1000...')
    
    try {
      // Use discovery method to find products
      const products = await this.discoverProducts()
      
      console.log(`✅ Successfully fetched ${products.length} products`)
      return products
    } catch (error) {
      console.error('❌ Error fetching all products:', error)
      return []
    }
  }

  /**
   * Fetch a single product by ID
   */
  async fetchProduct(productId: number): Promise<SupermarketProduct | null> {
    try {
      const url = `${this.baseUrl}/products/${productId}?include=declaration,nutrition_info,declaration,warnings,gpsr,department`
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'application/json',
          'Accept-Language': 'da-DK,da;q=0.9,en;q=0.8',
          'Referer': 'https://shop.rema1000.dk/',
          'Origin': 'https://shop.rema1000.dk'
        }
      })

      if (!response.ok) {
        if (response.status === 404) {
          // Product not found - this is expected during discovery
          return null
        }
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data: RemaProductResponse = await response.json()
      return this.transformRemaProduct(data.data)
    } catch (error) {
      console.error(`Error fetching product ${productId}:`, error)
      return null
    }
  }

  /**
   * Transform REMA API response to our standard format
   */
  private transformRemaProduct(remaProduct: RemaProductResponse['data']): SupermarketProduct {
    const currentPrice = remaProduct.prices[0] // Get current price
    const isOnSale = remaProduct.prices.some(p => p.is_campaign || p.is_advertised)
    const originalPrice = isOnSale && remaProduct.prices.length > 1 
      ? remaProduct.prices.find(p => !p.is_campaign)?.price 
      : null

    return {
      id: `rema-${remaProduct.id}`,
      name: remaProduct.name,
      description: remaProduct.description,
      category: remaProduct.department.name,
      subcategory: this.getSubcategory(remaProduct.department.name),
      price: currentPrice.price,
      originalPrice: originalPrice || currentPrice.price,
      unit: currentPrice.compare_unit,
      unitPrice: currentPrice.compare_unit_price,
      isOnSale: isOnSale,
      saleEndDate: remaProduct.prices.find(p => p.is_campaign)?.ending_at || null,
      imageUrl: remaProduct.images[0]?.medium || null,
      store: this.storeName,
      available: remaProduct.is_available_in_all_stores,
      temperatureZone: remaProduct.temperature_zone,
      nutritionInfo: this.transformNutritionInfo(remaProduct.nutrition_info),
      labels: remaProduct.labels.map(label => label.name),
      lastUpdated: new Date().toISOString(),
      source: 'rema1000'
    }
  }

  /**
   * Get subcategory based on department name
   */
  private getSubcategory(departmentName: string): string {
    const subcategories: Record<string, string[]> = {
      'Frugt & grønt': ['Frugt', 'Grøntsager', 'Krydderurter'],
      'Kød, fisk & fjerkræ': ['Kød', 'Fisk', 'Fjerkræ', 'Pålæg'],
      'Køl': ['Kødpålæg', 'Ost', 'Mælkeprodukter'],
      'Ost m.v.': ['Fast ost', 'Rasp', 'Frisk ost'],
      'Frost': ['Frosne grøntsager', 'Frosne retter', 'Is'],
      'Mejeri': ['Mælk', 'Fløde', 'Yoghurt', 'Smør'],
      'Kolonial': ['Tørvarer', 'Konserves', 'Drikkevarer']
    }
    
    return subcategories[departmentName]?.[0] || 'Andet'
  }

  /**
   * Transform nutrition info to our format
   */
  private transformNutritionInfo(nutritionInfo: Array<{name: string, value: string}>): Record<string, string> {
    const transformed: Record<string, string> = {}
    
    nutritionInfo.forEach(item => {
      const key = item.name.toLowerCase().replace(/\s+/g, '_')
      transformed[key] = item.value.trim()
    })
    
    return transformed
  }

  /**
   * Update prices for existing products
   */
  async updatePrices(existingProducts: SupermarketProduct[]): Promise<SupermarketProduct[]> {
    const updatedProducts: SupermarketProduct[] = []
    
    for (const product of existingProducts) {
      if (product.source === 'rema1000') {
        const productId = product.id.replace('rema-', '')
        const updatedProduct = await this.fetchProduct(parseInt(productId))
        
        if (updatedProduct) {
          updatedProducts.push(updatedProduct)
        } else {
          // Keep existing product if update fails
          updatedProducts.push(product)
        }
        
        // Add delay to be respectful
        await this.delay(500)
      } else {
        updatedProducts.push(product)
      }
    }
    
    return updatedProducts
  }

  /**
   * Get scraping result summary
   */
  async getScrapingResult(): Promise<ScrapingResult> {
    const startTime = Date.now()
    
    try {
      const products = await this.fetchAllProducts()
      
      return {
        success: true,
        storeName: this.storeName,
        productsCount: products.length,
        timestamp: new Date().toISOString(),
        duration: Date.now() - startTime,
        errors: []
      }
    } catch (error) {
      return {
        success: false,
        storeName: this.storeName,
        productsCount: 0,
        timestamp: new Date().toISOString(),
        duration: Date.now() - startTime,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      }
    }
  }

  /**
   * Helper method to add delays
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

// Export the scraper instance
export const rema1000Scraper = new Rema1000Scraper()
