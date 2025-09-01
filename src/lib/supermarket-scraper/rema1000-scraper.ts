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
  public baseUrl = 'https://api.digital.rema1000.dk/api/v3'
  private storeName = 'REMA 1000'
  
  constructor() {
    // Initialize scraper
  }

  /**
   * Discover products by systematically searching through all categories
   * This will find hundreds of products instead of just a few
   * OPTIMIZED for Vercel serverless functions (10s timeout)
   */
  async discoverProducts(): Promise<SupermarketProduct[]> {
    const discoveredProducts: SupermarketProduct[] = []
    
    console.log('🔍 Discovering products systematically through all categories...')
    
    // Method 1: Sequential search around known working product IDs
    // OPTIMIZED: Use realistic ID ranges based on known products
    const searchRanges = [
      { name: 'Frugt & grønt', start: 304000, end: 305000, step: 50, limit: 100 },
      { name: 'Kød & fisk', start: 440000, end: 441000, step: 50, limit: 100 },
      { name: 'Køl', start: 410000, end: 411000, step: 50, limit: 100 },
      { name: 'Ost m.v.', start: 500000, end: 501000, step: 50, limit: 100 },
      { name: 'Frost', start: 600000, end: 601000, step: 50, limit: 100 },
      { name: 'Mejeri', start: 700000, end: 701000, step: 50, limit: 100 },
      { name: 'Kolonial', start: 800000, end: 801000, step: 50, limit: 100 }
    ]
    
    for (const range of searchRanges) {
      console.log(`🔍 Searching ${range.name} (IDs ${range.start}-${range.end})...`)
      const categoryProducts = await this.sequentialSearch(range.start, range.end, range.step, range.limit)
      discoveredProducts.push(...categoryProducts)
      
      // Reduced delay to avoid Vercel timeout
      await this.delay(50)
    }
    
    // Method 2: Fallback to known product IDs if sequential search finds too few
    if (discoveredProducts.length < 20) {
      console.log('🔄 Sequential search found too few products, adding known products...')
      
      for (const productId of KNOWN_PRODUCT_IDS) {
        try {
          const product = await this.fetchProduct(productId)
          if (product && !discoveredProducts.find(p => p.id === product.id)) {
            discoveredProducts.push(product)
            console.log(`✅ Added known product: ${product.name}`)
          }
          await this.delay(25)
        } catch (error) {
          console.log(`⚠️ Failed to fetch known product ${productId}:`, error)
        }
      }
    }
    
    console.log(`🎯 Discovery complete: Found ${discoveredProducts.length} unique products`)
    return discoveredProducts
  }

  /**
   * Sequential search through a range of product IDs
   */
  private async sequentialSearch(startId: number, endId: number, step: number, limit: number): Promise<SupermarketProduct[]> {
    const products: SupermarketProduct[] = []
    
    console.log(`🔍 Sequential search in (IDs ${startId}-${endId})...`)
    
    // Search through IDs in the range with the specified step
    for (let id = startId; id <= endId; id += step) {
      try {
        const product = await this.fetchProduct(id)
        if (product) {
          products.push(product)
          console.log(`✅ Found product: ${product.name} (ID: ${id})`)
        }
        
        // Add delay to be respectful to REMA's API
        // OPTIMIZED: Reduced delay to avoid Vercel timeout
        await this.delay(50)
        
        // Limit to 30 products per category to avoid overwhelming the API
        if (products.length >= limit) {
          console.log(`🎯 Reached limit of ${limit} products for this category`)
          break
        }
      } catch (error) {
        // Skip failed IDs silently
      }
    }
    
    console.log(`✅ Sequential search complete: ${products.length} products found`)
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
   * FIXED: Correctly maps REMA's two-price structure
   */
  private transformRemaProduct(remaProduct: RemaProductResponse['data']): SupermarketProduct {
    const prices = remaProduct.prices
    
    // 🔥 FIXED LOGIC: REMA always has 2 prices in specific order
    // Price[0] = Campaign price (tilbudspris) - is_campaign: true
    // Price[1] = Regular price (normalpris) - is_campaign: false
    
    if (prices.length >= 2) {
      const campaignPrice = prices[0]  // First price is always campaign
      const regularPrice = prices[1]   // Second price is always regular
      
      // Check if first price is actually a campaign
      const isFirstPriceCampaign = (campaignPrice as any).is_campaign === true || 
                                  (campaignPrice as any).is_campaign === 'true' || 
                                  (campaignPrice as any).is_campaign === 1
      
      if (isFirstPriceCampaign) {
        // ✅ CORRECT MAPPING:
        const salePrice = campaignPrice.price        // 20 kr (tilbudspris)
        const originalPrice = regularPrice.price     // 21.95 kr (normalpris)
        
        // 🔥 CHECK IF CAMPAIGN HAS ENDED
        const now = new Date()
        const campaignEndDate = campaignPrice.ending_at ? new Date(campaignPrice.ending_at) : null
        
        let isOnSale = true
        let finalPrice = salePrice
        let finalOriginalPrice = originalPrice
        
        if (campaignEndDate && now > campaignEndDate) {
          // 🚨 CAMPAIGN HAS ENDED - use regular price
          console.log(`⚠️ Campaign ended for ${remaProduct.name}, using regular price`)
          isOnSale = false
          finalPrice = regularPrice.price
          finalOriginalPrice = regularPrice.price
        }
        
        console.log(`🏷️ CORRECT PRICE MAPPING for ${remaProduct.name}:`)
        console.log(`   Campaign Price (tilbud): ${salePrice} kr`)
        console.log(`   Regular Price (normal): ${originalPrice} kr`)
        console.log(`   Campaign End: ${campaignEndDate}`)
        console.log(`   Is On Sale: ${isOnSale}`)
        console.log(`   Final Price: ${finalPrice} kr`)
        
        return {
          id: `rema-${remaProduct.id}`,
          name: remaProduct.name,
          description: remaProduct.description,
          category: remaProduct.department.name,
          subcategory: this.getSubcategory(remaProduct.department.name),
          price: finalPrice,           // Current active price
          originalPrice: finalOriginalPrice, // Original price
          unit: campaignPrice.compare_unit || regularPrice.compare_unit || 'stk',
          unitPrice: campaignPrice.compare_unit_price || regularPrice.compare_unit_price || 0,
          isOnSale: isOnSale,        // true/false based on campaign status
          saleEndDate: campaignPrice.ending_at || null,
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
    }
    
    // Fallback for products with only one price or no campaign
    const singlePrice = prices[0]?.price || 0
    
    console.log(`⚠️ Fallback for ${remaProduct.name}: Single price ${singlePrice} kr`)

    return {
      id: `rema-${remaProduct.id}`,
      name: remaProduct.name,
      description: remaProduct.description,
      category: remaProduct.department.name,
      subcategory: this.getSubcategory(remaProduct.department.name),
      price: singlePrice,
      originalPrice: singlePrice,
      unit: prices[0]?.compare_unit || 'stk',
      unitPrice: prices[0]?.compare_unit_price || 0,
      isOnSale: false,
      saleEndDate: null,
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

  /**
   * Investigate REMA's API for delta update capabilities
   * This will help us find smart endpoints for price updates
   * OPTIMIZED for Vercel serverless functions (10s timeout)
   */
  async investigateDeltaEndpoints(): Promise<{
    hasDeltaUpdates: boolean
    endpoints: string[]
    lastModifiedSupport: boolean
    changeTracking: boolean
  }> {
    console.log('🔍 Investigating REMA API for delta update capabilities...')
    
    // Only test the most promising endpoints to avoid Vercel timeout
    const endpoints = [
      '/products/changes',
      '/prices/changes',
      '/campaigns/active'
    ]
    
    const results = {
      hasDeltaUpdates: false,
      endpoints: [] as string[],
      lastModifiedSupport: false,
      changeTracking: false
    }
    
    for (const endpoint of endpoints) {
      try {
        const url = `${this.baseUrl}${endpoint}`
        console.log(`🔍 Testing endpoint: ${endpoint}`)
        
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
          console.log(`✅ Endpoint ${endpoint} works:`, data)
          
          results.endpoints.push(endpoint)
          
          // Check if this endpoint provides change tracking
          if (endpoint.includes('changes') || endpoint.includes('updated')) {
            results.hasDeltaUpdates = true
            results.changeTracking = true
          }
          
          // Check if it supports last-modified headers
          const lastModified = response.headers.get('last-modified')
          if (lastModified) {
            results.lastModifiedSupport = true
          }
          
        } else {
          console.log(`❌ Endpoint ${endpoint} failed: ${response.status}`)
        }
        
        // Reduced delay to avoid Vercel timeout
        await this.delay(100)
        
      } catch (error) {
        console.log(`⚠️ Error testing ${endpoint}:`, error)
      }
    }
    
    // Quick test for last-modified support on main products endpoint
    try {
      const testUrl = `${this.baseUrl}/products/1`
      const testResponse = await fetch(testUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      })
      
      const lastModified = testResponse.headers.get('last-modified')
      if (lastModified) {
        results.lastModifiedSupport = true
        console.log('✅ REMA supports last-modified headers')
      }
    } catch (error) {
      console.log('⚠️ Could not test last-modified support')
    }
    
    console.log('🎯 Delta update investigation complete:', results)
    return results
  }

  /**
   * Smart delta update - only fetch products that have changed
   */
  async smartDeltaUpdate(existingProducts: SupermarketProduct[]): Promise<{
    updated: SupermarketProduct[]
    new: SupermarketProduct[]
    unchanged: SupermarketProduct[]
    totalChanges: number
  }> {
    console.log('🧠 Starting smart delta update...')
    
    // First, investigate if REMA has delta endpoints
    const deltaCapabilities = await this.investigateDeltaEndpoints()
    
    if (deltaCapabilities.hasDeltaUpdates) {
      console.log('🎉 REMA has delta update endpoints! Using smart updates...')
      return await this.useDeltaEndpoints(existingProducts)
    } else if (deltaCapabilities.lastModifiedSupport) {
      console.log('📅 REMA supports last-modified headers. Using conditional requests...')
      return await this.useConditionalRequests(existingProducts)
    } else {
      console.log('🔄 No delta support found. Using intelligent batch updates...')
      return await this.intelligentBatchUpdate(existingProducts)
    }
  }

  /**
   * Use REMA's delta endpoints for smart updates
   */
  private async useDeltaEndpoints(existingProducts: SupermarketProduct[]): Promise<any> {
    // Implementation depends on what endpoints REMA actually provides
    console.log('🚀 Using REMA delta endpoints (implementation depends on API structure)')
    return { updated: [], new: [], unchanged: existingProducts, totalChanges: 0 }
  }

  /**
   * Use conditional requests with last-modified headers
   */
  private async useConditionalRequests(existingProducts: SupermarketProduct[]): Promise<any> {
    console.log('📅 Using conditional requests with last-modified headers')
    
    const updated: SupermarketProduct[] = []
    const unchanged: SupermarketProduct[] = []
    
    for (const product of existingProducts) {
      if (product.source === 'rema1000') {
        const productId = product.id.replace('rema-', '')
        const lastModified = new Date(product.lastUpdated).toUTCString()
        
        try {
          const url = `${this.baseUrl}/products/${productId}`
          const response = await fetch(url, {
            headers: {
              'If-Modified-Since': lastModified,
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
          })
          
          if (response.status === 304) {
            // Not modified - keep existing
            unchanged.push(product)
            console.log(`✅ Product ${product.name} unchanged`)
          } else if (response.ok) {
            // Modified - update
            const updatedProduct = await this.fetchProduct(parseInt(productId))
            if (updatedProduct) {
              updated.push(updatedProduct)
              console.log(`🔄 Product ${product.name} updated`)
            }
          }
          
          await this.delay(200)
          
        } catch (error) {
          console.log(`⚠️ Error checking ${product.name}:`, error)
          unchanged.push(product)
        }
      } else {
        unchanged.push(product)
      }
    }
    
    return {
      updated,
      new: [],
      unchanged,
      totalChanges: updated.length
    }
  }

  /**
   * Simple batch update - checks REMA products in batches of 100
   */
  private async intelligentBatchUpdate(existingProducts: SupermarketProduct[]): Promise<any> {
    console.log('🔄 Starting simple batch update - checking REMA products in batches of 100')
    console.log('🔧 TEST: This method is being called!')
    
    // Filter to only REMA products
    const remaProducts = existingProducts.filter(p => p.source === 'rema1000')
    console.log(`📊 Found ${remaProducts.length} REMA products to check`)
    
    // Debug: Check what sources we actually have
    const sources = Array.from(new Set(existingProducts.map(p => p.source)))
    console.log(`🔍 Available sources in database:`, sources)
    console.log(`📊 Total products: ${existingProducts.length}, REMA products: ${remaProducts.length}`)
    
    if (remaProducts.length === 0) {
      console.log(`⚠️ No REMA products found! Check source field.`)
      console.log(`🔍 Sample product sources:`, existingProducts.slice(0, 5).map(p => ({ id: p.id, name: p.name, source: p.source })))
      return { updated: [], new: [], unchanged: existingProducts, totalChanges: 0 }
    }
    
    const updated: SupermarketProduct[] = []
    const unchanged: SupermarketProduct[] = []
    const batchSize = 100
    
    // Process in batches of 100
    for (let batchStart = 0; batchStart < remaProducts.length; batchStart += batchSize) {
      const batchEnd = Math.min(batchStart + batchSize, remaProducts.length)
      const batch = remaProducts.slice(batchStart, batchEnd)
      
      console.log(`📦 Processing batch ${Math.floor(batchStart / batchSize) + 1}: products ${batchStart + 1}-${batchEnd}`)
      
      // Process each product in the batch
      for (let i = 0; i < batch.length; i++) {
        const existingProduct = batch[i]
        const productId = existingProduct.id.replace('rema-', '')
        
                 try {
           const freshProduct = await this.fetchProduct(parseInt(productId))
           
           // Debug: Log first few products to see what's happening
           if (batchStart === 0 && i < 3) {
             console.log(`🔍 Debug product ${i + 1}: ${existingProduct.name}`)
             console.log(`   Existing: price=${existingProduct.price}, isOnSale=${existingProduct.isOnSale}, originalPrice=${existingProduct.originalPrice}`)
             if (freshProduct) {
               console.log(`   Fresh: price=${freshProduct.price}, isOnSale=${freshProduct.isOnSale}, originalPrice=${freshProduct.originalPrice}`)
             } else {
               console.log(`   Fresh: null (not found)`)
             }
           }
           
           if (freshProduct) {
             // Check if there are any changes
             const hasPriceChange = freshProduct.price !== existingProduct.price
             const hasOfferChange = freshProduct.isOnSale !== existingProduct.isOnSale
             const hasOriginalPriceChange = freshProduct.originalPrice !== existingProduct.originalPrice
             
             if (hasPriceChange || hasOfferChange || hasOriginalPriceChange) {
               const enhancedProduct = this.enhanceProductWithOfferLogic(existingProduct, freshProduct)
               updated.push(enhancedProduct)
               
               // Log changes
               if (hasOfferChange) {
                 console.log(`🏷️ Offer change: ${existingProduct.name} - ${existingProduct.isOnSale} → ${freshProduct.isOnSale}`)
               }
               if (hasPriceChange) {
                 console.log(`💰 Price change: ${existingProduct.name} - ${existingProduct.price} → ${freshProduct.price}`)
               }
               if (hasOriginalPriceChange && existingProduct.isOnSale) {
                 console.log(`🔧 Original price fix: ${existingProduct.name} - ${existingProduct.originalPrice} → ${freshProduct.originalPrice}`)
               }
             } else {
               unchanged.push(existingProduct)
             }
           } else {
             unchanged.push(existingProduct)
           }
          
          // Small delay between requests
          await this.delay(50)
          
        } catch (error) {
          console.log(`⚠️ Error checking ${existingProduct.name}:`, error)
          unchanged.push(existingProduct)
          await this.delay(100)
        }
      }
      
      console.log(`✅ Batch ${Math.floor(batchStart / batchSize) + 1} completed: ${updated.length} total updates so far`)
      
      // Longer delay between batches
      if (batchEnd < remaProducts.length) {
        console.log(`⏳ Waiting 2 seconds before next batch...`)
        await this.delay(2000)
      }
    }
    
    console.log(`🎉 All batches completed! Total updates: ${updated.length}`)
    
    return {
      updated,
      new: [],
      unchanged: existingProducts.filter(p => !updated.find(u => u.id === p.id)),
      totalChanges: updated.length
    }
  }

  /**
   * Enhanced offer logic to properly handle original prices and offers
   * SPECIAL FOCUS: Fix missing original prices for existing offers
   */
  private enhanceProductWithOfferLogic(existingProduct: SupermarketProduct, freshProduct: SupermarketProduct): SupermarketProduct {
    // Start with fresh product data
    let enhancedProduct = { ...freshProduct }
    
    // 🎯 SPECIAL CASE: Existing offer has missing original price (common after bulk import)
    const existingHasMissingOriginalPrice = existingProduct.isOnSale && existingProduct.originalPrice === existingProduct.price
    const freshHasValidOriginalPrice = freshProduct.originalPrice > freshProduct.price
    
    if (existingHasMissingOriginalPrice && freshProduct.isOnSale && freshHasValidOriginalPrice) {
      console.log(`🔧 ${freshProduct.name}: FIXING missing original price! ${existingProduct.originalPrice} → ${freshProduct.originalPrice}`)
      enhancedProduct.price = freshProduct.price // Keep sale price
      enhancedProduct.originalPrice = freshProduct.originalPrice // Fix original price from REMA
      enhancedProduct.isOnSale = true
      return enhancedProduct
    }
    
    // SCENARIO 1: Product WAS on sale, now is NOT on sale
    if (existingProduct.isOnSale && !freshProduct.isOnSale) {
      console.log(`🔄 ${freshProduct.name}: Offer ended, updating to regular price`)
      // Product is back to regular price
      enhancedProduct.price = freshProduct.price
      enhancedProduct.originalPrice = freshProduct.price // Reset original price
      enhancedProduct.isOnSale = false
      enhancedProduct.saleEndDate = null
    }
    
    // SCENARIO 2: Product was NOT on sale, now IS on sale  
    else if (!existingProduct.isOnSale && freshProduct.isOnSale) {
      console.log(`🔥 ${freshProduct.name}: New offer detected!`)
      // New offer detected - preserve the old price as original price
      enhancedProduct.price = freshProduct.price // Sale price
      enhancedProduct.originalPrice = existingProduct.price // Previous regular price
      enhancedProduct.isOnSale = true
    }
    
    // SCENARIO 3: Product WAS on sale, still IS on sale
    else if (existingProduct.isOnSale && freshProduct.isOnSale) {
      console.log(`🏷️ ${freshProduct.name}: Offer continues`)
      // Use fresh original price if it's better, otherwise keep existing
      if (freshProduct.originalPrice > freshProduct.price && freshProduct.originalPrice > existingProduct.originalPrice) {
        enhancedProduct.originalPrice = freshProduct.originalPrice // Better original price from REMA
      } else if (existingProduct.originalPrice > freshProduct.price) {
        enhancedProduct.originalPrice = existingProduct.originalPrice // Keep existing if valid
      }
      enhancedProduct.price = freshProduct.price // Updated sale price
      enhancedProduct.isOnSale = true
    }
    
    // SCENARIO 4: Product was NOT on sale, still NOT on sale
    else {
      // Regular price change - just update the price
      enhancedProduct.price = freshProduct.price
      enhancedProduct.originalPrice = freshProduct.price
      enhancedProduct.isOnSale = false
    }
    
    return enhancedProduct
  }
}

// Export the scraper instance
export const rema1000Scraper = new Rema1000Scraper()
