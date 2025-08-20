import { SupermarketProduct, SupermarketAPI, ScrapingResult, StoreConfig } from './types'
import { rema1000Scraper } from './rema1000-scraper'

// Store configurations
const STORE_CONFIGS: Record<string, StoreConfig> = {
  rema1000: {
    name: 'REMA 1000',
    enabled: true,
    baseUrl: 'https://api.digital.rema1000.dk/api/v3',
    categories: ['Frugt & grønt', 'Kød, fisk & fjerkræ', 'Køl', 'Ost m.v.', 'Frost', 'Mejeri', 'Kolonial'],
    scrapingConfig: {
      enabled: true,
      schedule: '0 2 * * *', // Every night at 2 AM
      delayBetweenRequests: 1000, // 1 second delay
      maxRetries: 3,
      timeout: 30000 // 30 seconds
    }
  }
  // Add more stores here as we implement them
}

export class SupermarketScraperManager {
  private scrapers: Map<string, SupermarketAPI> = new Map()
  private configs: Map<string, StoreConfig> = new Map()

  constructor() {
    this.initializeScrapers()
  }

  /**
   * Initialize all enabled scrapers
   */
  private initializeScrapers(): void {
    // Initialize REMA 1000 scraper
    if (STORE_CONFIGS.rema1000.enabled) {
      this.scrapers.set('rema1000', rema1000Scraper)
      this.configs.set('rema1000', STORE_CONFIGS.rema1000)
    }

    console.log(`Initialized ${this.scrapers.size} scrapers`)
  }

  /**
   * Get all enabled scrapers
   */
  getEnabledScrapers(): string[] {
    return Array.from(this.scrapers.keys())
  }

  /**
   * Get store configuration
   */
  getStoreConfig(storeId: string): StoreConfig | undefined {
    return this.configs.get(storeId)
  }

  /**
   * Fetch products from a specific store
   */
  async fetchProductsFromStore(storeId: string): Promise<SupermarketProduct[]> {
    const scraper = this.scrapers.get(storeId)
    if (!scraper) {
      throw new Error(`Scraper not found for store: ${storeId}`)
    }

    console.log(`Fetching products from ${storeId}...`)
    return await scraper.fetchAllProducts()
  }

  /**
   * Fetch products from all enabled stores
   */
  async fetchProductsFromAllStores(): Promise<Record<string, SupermarketProduct[]>> {
    const results: Record<string, SupermarketProduct[]> = {}
    
    for (const [storeId, scraper] of this.scrapers) {
      try {
        console.log(`Fetching products from ${storeId}...`)
        const products = await scraper.fetchAllProducts()
        results[storeId] = products
        
        // Add delay between stores to be respectful
        if (storeId !== Array.from(this.scrapers.keys()).slice(-1)[0]) {
          await this.delay(2000)
        }
      } catch (error) {
        console.error(`Error fetching products from ${storeId}:`, error)
        results[storeId] = []
      }
    }
    
    return results
  }

  /**
   * Update prices for existing products
   */
  async updatePricesForStore(storeId: string, existingProducts: SupermarketProduct[]): Promise<SupermarketProduct[]> {
    const scraper = this.scrapers.get(storeId)
    if (!scraper) {
      throw new Error(`Scraper not found for store: ${storeId}`)
    }

    console.log(`Updating prices for ${storeId}...`)
    return await scraper.updatePrices(existingProducts)
  }

  /**
   * Get scraping results from all stores
   */
  async getScrapingResults(): Promise<Record<string, ScrapingResult>> {
    const results: Record<string, ScrapingResult> = {}
    
    for (const [storeId, scraper] of this.scrapers) {
      try {
        const result = await scraper.getScrapingResult()
        results[storeId] = result
      } catch (error) {
        console.error(`Error getting scraping result from ${storeId}:`, error)
        results[storeId] = {
          success: false,
          storeName: storeId,
          productsCount: 0,
          timestamp: new Date().toISOString(),
          duration: 0,
          errors: [error instanceof Error ? error.message : 'Unknown error']
        }
      }
    }
    
    return results
  }

  /**
   * Run a complete scraping session
   */
  async runFullScrapingSession(): Promise<{
    products: Record<string, SupermarketProduct[]>
    results: Record<string, ScrapingResult>
    summary: {
      totalProducts: number
      totalStores: number
      successCount: number
      errorCount: number
    }
  }> {
    const startTime = Date.now()
    console.log('Starting full scraping session...')
    
    try {
      // Fetch products from all stores
      const products = await this.fetchProductsFromAllStores()
      
      // Get scraping results
      const results = await this.getScrapingResults()
      
      // Calculate summary
      const totalProducts = Object.values(products).reduce((sum, storeProducts) => sum + storeProducts.length, 0)
      const totalStores = Object.keys(products).length
      const successCount = Object.values(results).filter(r => r.success).length
      const errorCount = totalStores - successCount
      
      const summary = {
        totalProducts,
        totalStores,
        successCount,
        errorCount
      }
      
      console.log(`Scraping session completed in ${Date.now() - startTime}ms`)
      console.log(`Summary: ${totalProducts} products from ${totalStores} stores`)
      
      return { products, results, summary }
    } catch (error) {
      console.error('Error during scraping session:', error)
      throw error
    }
  }

  /**
   * Test a specific scraper
   */
  async testScraper(storeId: string): Promise<{
    success: boolean
    products: SupermarketProduct[]
    result: ScrapingResult
  }> {
    const scraper = this.scrapers.get(storeId)
    if (!scraper) {
      throw new Error(`Scraper not found for store: ${storeId}`)
    }

    console.log(`Testing scraper for ${storeId}...`)
    
    try {
      // Test with a small sample (first few products)
      const products = await scraper.fetchAllProducts()
      const result = await scraper.getScrapingResult()
      
      return {
        success: result.success,
        products: products.slice(0, 5), // Just first 5 products for testing
        result
      }
    } catch (error) {
      console.error(`Error testing scraper for ${storeId}:`, error)
      throw error
    }
  }

  /**
   * Helper method to add delays
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

// Export the manager instance
export const scraperManager = new SupermarketScraperManager()

// Export individual scrapers for direct use
export { rema1000Scraper } from './rema1000-scraper'

// Export types
export * from './types'
