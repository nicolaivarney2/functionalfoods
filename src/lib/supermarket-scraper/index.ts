// Supermarket Scraper Framework
// This will handle all supermarket APIs and provide a unified interface

export interface SupermarketProduct {
  id: string
  externalId: string
  supermarketId: number
  categoryId: number
  name: string
  description?: string
  brand?: string
  unit: string
  unitPrice: number
  currentPrice: number
  originalPrice?: number
  discountPercentage?: number
  isOnSale: boolean
  saleStartDate?: Date
  saleEndDate?: Date
  imageUrl?: string
  nutritionInfo?: any
  ingredients?: string[]
  allergens?: string[]
  isOrganic: boolean
  isAnimalOrganic: boolean
  isAvailable: boolean
  lastUpdated: Date
}

export interface SupermarketAPI {
  name: string
  baseUrl: string
  apiKey?: string
  headers?: Record<string, string>
  rateLimit?: number // requests per minute
}

export interface ScrapingResult {
  success: boolean
  products: SupermarketProduct[]
  errors: string[]
  metadata: {
    totalProducts: number
    newProducts: number
    updatedProducts: number
    scrapingTime: number
  }
}

export abstract class BaseSupermarketScraper {
  protected api: SupermarketAPI
  protected isRunning: boolean = false

  constructor(api: SupermarketAPI) {
    this.api = api
  }

  abstract scrapeProducts(): Promise<SupermarketProduct[]>
  abstract scrapeCategories(): Promise<any[]>
  abstract scrapeOffers(): Promise<any[]>

  protected async makeRequest(endpoint: string, options: RequestInit = {}): Promise<Response> {
    const url = `${this.api.baseUrl}${endpoint}`
    const headers = {
      'User-Agent': 'FunctionalFoods-Scraper/1.0',
      'Accept': 'application/json',
      ...this.api.headers,
      ...options.headers
    }

    return fetch(url, {
      ...options,
      headers
    })
  }

  protected async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  public async startScraping(): Promise<ScrapingResult> {
    if (this.isRunning) {
      throw new Error('Scraper is already running')
    }

    this.isRunning = true
    const startTime = Date.now()

    try {
      console.log(`🚀 Starting ${this.api.name} scraper...`)
      
      const products = await this.scrapeProducts()
      const categories = await this.scrapeCategories()
      const offers = await this.scrapeOffers()

      const scrapingTime = Date.now() - startTime

      return {
        success: true,
        products,
        errors: [],
        metadata: {
          totalProducts: products.length,
          newProducts: 0, // Will be calculated when saving to DB
          updatedProducts: 0, // Will be calculated when saving to DB
          scrapingTime
        }
      }
    } catch (error) {
      console.error(`❌ Error scraping ${this.api.name}:`, error)
      return {
        success: false,
        products: [],
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        metadata: {
          totalProducts: 0,
          newProducts: 0,
          updatedProducts: 0,
          scrapingTime: Date.now() - startTime
        }
      }
    } finally {
      this.isRunning = false
    }
  }

  public stopScraping(): void {
    this.isRunning = false
  }
}

// Rema 1000 Scraper Implementation
export class Rema1000Scraper extends BaseSupermarketScraper {
  constructor() {
    super({
      name: 'REMA 1000',
      baseUrl: 'https://api.digital.rema1000.dk/api/v3',
      rateLimit: 60 // 60 requests per minute
    })
  }

  async scrapeProducts(): Promise<SupermarketProduct[]> {
    const products: SupermarketProduct[] = []
    
    // This is a placeholder - will be implemented when we have the full API structure
    console.log('🔄 Scraping Rema 1000 products...')
    
    // Mock data for now
    const mockProducts = [
      {
        id: '1',
        externalId: '304420',
        supermarketId: 1, // REMA 1000
        categoryId: 1, // Frugt og grønt
        name: 'Appelsin Sydafrika',
        unit: 'stk',
        unitPrice: 3.50,
        currentPrice: 3.50,
        isOnSale: false,
        isOrganic: false,
        isAnimalOrganic: false,
        isAvailable: true,
        lastUpdated: new Date()
      }
    ]

    return mockProducts.map(p => ({
      ...p,
      description: undefined,
      brand: undefined,
      originalPrice: undefined,
      discountPercentage: undefined,
      saleStartDate: undefined,
      saleEndDate: undefined,
      imageUrl: undefined,
      nutritionInfo: undefined,
      ingredients: undefined,
      allergens: undefined
    }))
  }

  async scrapeCategories(): Promise<any[]> {
    // Will be implemented when we have the full API structure
    return []
  }

  async scrapeOffers(): Promise<any[]> {
    // Will be implemented when we have the full API structure
    return []
  }
}

// Scraper Manager
export class SupermarketScraperManager {
  private scrapers: Map<string, BaseSupermarketScraper> = new Map()
  private isRunning: boolean = false

  constructor() {
    // Initialize scrapers
    this.scrapers.set('rema1000', new Rema1000Scraper())
    // Add other scrapers when we have their APIs
  }

  async scrapeAll(): Promise<Map<string, ScrapingResult>> {
    if (this.isRunning) {
      throw new Error('Scraper manager is already running')
    }

    this.isRunning = true
    const results = new Map<string, ScrapingResult>()

    try {
      console.log('🚀 Starting all supermarket scrapers...')
      
      const scraperEntries = Array.from(this.scrapers.entries())
      for (let i = 0; i < scraperEntries.length; i++) {
        const [name, scraper] = scraperEntries[i]
        console.log(`🔄 Scraping ${name}...`)
        const result = await scraper.startScraping()
        results.set(name, result)
        
        // Add delay between scrapers to be respectful
        if (i < scraperEntries.length - 1) {
          await this.delay(5000) // 5 second delay
        }
      }
    } finally {
      this.isRunning = false
    }

    return results
  }

  async scrapeSpecific(supermarketName: string): Promise<ScrapingResult | null> {
    const scraper = this.scrapers.get(supermarketName)
    if (!scraper) {
      throw new Error(`Scraper for ${supermarketName} not found`)
    }

    return await scraper.startScraping()
  }

  public getScrapers(): string[] {
    return Array.from(this.scrapers.keys())
  }

  public addScraper(name: string, scraper: BaseSupermarketScraper): void {
    this.scrapers.set(name, scraper)
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

// Export singleton instance
export const scraperManager = new SupermarketScraperManager()
