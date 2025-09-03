#!/usr/bin/env node

/**
 * Local REMA 1000 Scraper
 * 
 * This script bypasses anti-bot protection by running locally from Cursor.
 * It scrapes REMA 1000 data and saves it as JSON files that can be uploaded
 * to the admin interface.
 * 
 * Usage:
 *   node scripts/scrape-rema-local.js
 * 
 * Output:
 *   - rema-products-YYYY-MM-DD-HH-mm.json (full product data)
 *   - rema-stats-YYYY-MM-DD-HH-mm.json (scraping statistics)
 */

const fs = require('fs')
const path = require('path')

// Configuration
const MAX_PAGES = 50 // Prevent infinite loops
const DELAY_MS = 100 // Delay between requests to be respectful
const BATCH_SIZE = 20 // Products per batch for processing

// REMA 1000 API endpoints (these work from local environment)
const BASE_URL = 'https://shop.rema1000.dk'
const ENDPOINTS = {
  categories: `${BASE_URL}/api/categories`,
  products: `${BASE_URL}/api/products`,
  graphql: `${BASE_URL}/api/graphql`,
  search: `${BASE_URL}/api/search`
}

// Headers to mimic a real browser
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'da-DK,da;q=0.9,en;q=0.8',
  'Accept-Encoding': 'gzip, deflate, br',
  'Referer': 'https://shop.rema1000.dk/',
  'Origin': 'https://shop.rema1000.dk',
  'Connection': 'keep-alive',
  'Sec-Fetch-Dest': 'empty',
  'Sec-Fetch-Mode': 'cors',
  'Sec-Fetch-Site': 'same-origin'
}

// Utility functions
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function getTimestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-').slice(0, 16)
}

function log(message, ...args) {
  console.log(`[${new Date().toISOString()}] ${message}`, ...args)
}

async function fetchWithRetry(url, options = {}, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, {
        ...options,
        headers: { ...HEADERS, ...options.headers }
      })
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      return response
    } catch (error) {
      log(`❌ Attempt ${i + 1}/${maxRetries} failed for ${url}:`, error.message)
      if (i === maxRetries - 1) throw error
      await delay(1000 * (i + 1)) // Exponential backoff
    }
  }
}

async function testEndpoints() {
  log('🔍 Testing REMA endpoints...')
  
  const testUrls = [
    `${BASE_URL}/api/products?page=1&limit=10`,
    `${BASE_URL}/api/categories`,
    `${BASE_URL}/api/search?q=mælk&limit=5`,
    `${BASE_URL}/webapi/products`,
    `${BASE_URL}/api/v1/products?page=1`
  ]
  
  for (const url of testUrls) {
    try {
      const response = await fetchWithRetry(url)
      const contentType = response.headers.get('content-type')
      const text = await response.text()
      
      log(`✅ ${url}:`, {
        status: response.status,
        contentType,
        isJSON: contentType?.includes('application/json'),
        length: text.length,
        preview: text.substring(0, 100) + '...'
      })
      
      // If we find a working JSON endpoint, use it
      if (contentType?.includes('application/json')) {
        try {
          const data = JSON.parse(text)
          log(`🎯 Found working JSON endpoint: ${url}`)
          return { url, data }
        } catch (e) {
          log(`⚠️ JSON parse failed for ${url}`)
        }
      }
      
    } catch (error) {
      log(`❌ ${url}:`, error.message)
    }
    
    await delay(DELAY_MS)
  }
  
  return null
}

async function scrapeCategories() {
  log('📂 Attempting to scrape categories...')
  
  const categoryUrls = [
    `${BASE_URL}/api/categories`,
    `${BASE_URL}/webapi/categories`,
    `${BASE_URL}/api/v1/categories`
  ]
  
  for (const url of categoryUrls) {
    try {
      const response = await fetchWithRetry(url)
      const contentType = response.headers.get('content-type')
      
      if (contentType?.includes('application/json')) {
        const data = await response.json()
        log(`✅ Categories found from ${url}:`, Array.isArray(data) ? data.length : Object.keys(data).length)
        return data
      }
    } catch (error) {
      log(`❌ Categories failed from ${url}:`, error.message)
    }
    
    await delay(DELAY_MS)
  }
  
  // Fallback: try common category IDs
  log('🔄 Trying fallback category approach...')
  const commonCategories = [
    { id: 1, name: 'Frugt & Grønt' },
    { id: 2, name: 'Kød & Fisk' },
    { id: 3, name: 'Mejeriprodukter' },
    { id: 4, name: 'Brød & Kager' },
    { id: 5, name: 'Frost' },
    { id: 6, name: 'Drikkevarer' },
    { id: 7, name: 'Snacks & Slik' },
    { id: 8, name: 'Konserves' },
    { id: 9, name: 'Husholdning' },
    { id: 10, name: 'Personlig Pleje' }
  ]
  
  return commonCategories
}

async function scrapeProducts(categories = []) {
  log('🛒 Starting product scraping...')
  
  const allProducts = []
  const errors = []
  let totalProcessed = 0
  
  // Strategy 1: Try different product endpoints
  const productUrls = [
    `${BASE_URL}/api/products`,
    `${BASE_URL}/webapi/products`,
    `${BASE_URL}/api/v1/products`,
    `${BASE_URL}/api/v2/products`
  ]
  
  for (const baseUrl of productUrls) {
    log(`🔍 Trying product endpoint: ${baseUrl}`)
    
    try {
      // Try pagination
      for (let page = 1; page <= MAX_PAGES; page++) {
        const url = `${baseUrl}?page=${page}&limit=50`
        
        try {
          const response = await fetchWithRetry(url)
          const contentType = response.headers.get('content-type')
          
          if (contentType?.includes('application/json')) {
            const data = await response.json()
            
            // Handle different response structures
            let products = []
            if (Array.isArray(data)) {
              products = data
            } else if (data.products && Array.isArray(data.products)) {
              products = data.products
            } else if (data.data && Array.isArray(data.data)) {
              products = data.data
            } else if (data.items && Array.isArray(data.items)) {
              products = data.items
            }
            
            if (products.length === 0) {
              log(`📄 Page ${page}: No more products, stopping pagination`)
              break
            }
            
            // Transform and add products
            for (const product of products) {
              const transformed = transformProduct(product)
              if (transformed) {
                allProducts.push(transformed)
                totalProcessed++
              }
            }
            
            log(`📄 Page ${page}: Found ${products.length} products (Total: ${allProducts.length})`)
            
            // If we got fewer than expected, we might be at the end
            if (products.length < 50) {
              log(`📄 Got ${products.length} products (less than 50), assuming end of data`)
              break
            }
            
          } else {
            log(`⚠️ Non-JSON response from ${url}`)
            break
          }
          
        } catch (error) {
          log(`❌ Error on page ${page}:`, error.message)
          errors.push({ page, error: error.message })
          break
        }
        
        await delay(DELAY_MS)
      }
      
      // If we found products with this endpoint, we're done
      if (allProducts.length > 0) {
        log(`✅ Successfully scraped ${allProducts.length} products from ${baseUrl}`)
        break
      }
      
    } catch (error) {
      log(`❌ Endpoint ${baseUrl} failed:`, error.message)
      errors.push({ endpoint: baseUrl, error: error.message })
    }
  }
  
  // Strategy 2: Try search-based scraping if direct endpoints failed
  if (allProducts.length === 0) {
    log('🔍 Trying search-based scraping...')
    
    const searchTerms = [
      'mælk', 'brød', 'ost', 'kød', 'fisk', 'frugt', 'grøntsager', 
      'pasta', 'ris', 'kartofler', 'øl', 'vin', 'juice', 'yoghurt',
      'smør', 'æg', 'kylling', 'svin', 'oksekød', 'laks'
    ]
    
    for (const term of searchTerms) {
      try {
        const url = `${BASE_URL}/api/search?q=${encodeURIComponent(term)}&limit=100`
        const response = await fetchWithRetry(url)
        const contentType = response.headers.get('content-type')
        
        if (contentType?.includes('application/json')) {
          const data = await response.json()
          
          let products = []
          if (Array.isArray(data)) {
            products = data
          } else if (data.results && Array.isArray(data.results)) {
            products = data.results
          } else if (data.products && Array.isArray(data.products)) {
            products = data.products
          }
          
          for (const product of products) {
            const transformed = transformProduct(product)
            if (transformed && !allProducts.find(p => p.external_id === transformed.external_id)) {
              allProducts.push(transformed)
              totalProcessed++
            }
          }
          
          log(`🔍 Search "${term}": Found ${products.length} products (Unique total: ${allProducts.length})`)
        }
        
      } catch (error) {
        log(`❌ Search for "${term}" failed:`, error.message)
        errors.push({ search: term, error: error.message })
      }
      
      await delay(DELAY_MS)
    }
  }
  
  return { products: allProducts, totalProcessed, errors }
}

function transformProduct(productData) {
  try {
    // Handle different possible data structures
    const product = productData.product || productData
    
    // Skip if essential data is missing
    if (!product.id && !product.productId && !product.barcode) {
      return null
    }
    
    // Extract price information
    let currentPrice = null
    let originalPrice = null
    let onSale = false
    
    if (product.price) {
      currentPrice = parseFloat(product.price)
    } else if (product.currentPrice) {
      currentPrice = parseFloat(product.currentPrice)
    } else if (product.salePrice) {
      currentPrice = parseFloat(product.salePrice)
    }
    
    if (product.originalPrice || product.listPrice) {
      originalPrice = parseFloat(product.originalPrice || product.listPrice)
      onSale = currentPrice < originalPrice
    }
    
    return {
      external_id: String(product.id || product.productId || product.barcode || Math.random()),
      name: product.name || product.title || product.displayName || 'Unknown Product',
      category: product.category || product.categoryName || 'Uncategorized',
      price: currentPrice,
      original_price: originalPrice,
      on_sale: onSale,
      description: product.description || product.shortDescription || null,
      brand: product.brand || product.manufacturer || null,
      image_url: product.imageUrl || product.image || product.thumbnail || null,
      available: product.available !== false && product.inStock !== false,
      last_updated: new Date().toISOString(),
      source: 'rema1000'
    }
  } catch (error) {
    log('❌ Transform error:', error)
    return null
  }
}

async function main() {
  log('🚀 Starting REMA 1000 local scraper...')
  const startTime = Date.now()
  
  try {
    // Test endpoints first
    const workingEndpoint = await testEndpoints()
    if (workingEndpoint) {
      log('✅ Found working endpoint, proceeding with scraping...')
    } else {
      log('⚠️ No working JSON endpoints found, will try multiple strategies...')
    }
    
    // Scrape categories
    const categories = await scrapeCategories()
    log(`📂 Found ${categories.length} categories`)
    
    // Scrape products
    const { products, totalProcessed, errors } = await scrapeProducts(categories)
    
    // Generate statistics
    const stats = {
      timestamp: new Date().toISOString(),
      scrapeTime: Date.now() - startTime,
      totalProducts: products.length,
      totalProcessed,
      productsOnSale: products.filter(p => p.on_sale).length,
      categories: [...new Set(products.map(p => p.category))].length,
      averagePrice: products.length > 0 ? products.reduce((sum, p) => sum + (p.price || 0), 0) / products.length : 0,
      errors: errors.length,
      errorDetails: errors
    }
    
    // Save files
    const timestamp = getTimestamp()
    const productsFile = `rema-products-${timestamp}.json`
    const statsFile = `rema-stats-${timestamp}.json`
    
    // Ensure output directory exists
    const outputDir = path.join(process.cwd(), 'scraped-data')
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true })
    }
    
    // Write files
    fs.writeFileSync(path.join(outputDir, productsFile), JSON.stringify(products, null, 2))
    fs.writeFileSync(path.join(outputDir, statsFile), JSON.stringify(stats, null, 2))
    
    // Results
    log('✅ Scraping completed!')
    log(`📊 Results:`)
    log(`   • Products: ${stats.totalProducts}`)
    log(`   • On Sale: ${stats.productsOnSale}`)
    log(`   • Categories: ${stats.categories}`)
    log(`   • Average Price: ${stats.averagePrice.toFixed(2)} DKK`)
    log(`   • Scrape Time: ${(stats.scrapeTime / 1000).toFixed(1)}s`)
    log(`   • Errors: ${stats.errors}`)
    log(`📁 Files saved:`)
    log(`   • ${path.join(outputDir, productsFile)}`)
    log(`   • ${path.join(outputDir, statsFile)}`)
    
    if (products.length === 0) {
      log('❌ No products were scraped. Check the error details above.')
      process.exit(1)
    }
    
  } catch (error) {
    log('❌ Scraping failed:', error)
    process.exit(1)
  }
}

// Run the scraper
if (require.main === module) {
  main()
}

module.exports = { main, transformProduct }
