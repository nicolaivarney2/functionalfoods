import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { SupermarketProduct, StoredProduct, PriceHistory } from './types'

// Create Supabase client dynamically to avoid build-time issues
function createSupabaseServerClient() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing required Supabase environment variables')
    }
    
    return createServerClient(
      supabaseUrl,
      supabaseKey,
      {
        cookies: {
          get(name: string) {
            return undefined // Placeholder during build
          },
          set(name: string, value: string, options: any) {
            // Placeholder during build
          },
          remove(name: string, options: any) {
            // Placeholder during build
          },
        },
      }
    )
  } catch (error) {
    console.warn('Supabase client creation failed:', error)
    return null
  }
}

export class SupermarketDatabaseService {
  
  /**
   * Get Supabase client with proper cookies context
   */
  private async getSupabaseClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing required Supabase environment variables')
    }
    
    const cookieStore = await cookies()
    
    return createServerClient(
      supabaseUrl,
      supabaseKey,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: any) {
            cookieStore.set({ name, value, ...options })
          },
          remove(name: string, options: any) {
            cookieStore.set({ name, value: '', ...options })
          },
        },
      }
    )
  }
  
  /**
   * Store or update products in the database
   */
  async storeProducts(products: SupermarketProduct[]): Promise<{
    newProducts: number
    updatedProducts: number
    errors: string[]
  }> {
    const result = {
      newProducts: 0,
      updatedProducts: 0,
      errors: [] as string[]
    }

    try {
      const supabase = await this.getSupabaseClient()

      for (const product of products) {
        try {
          // Check if product already exists
          const { data: existingProduct } = await supabase
            .from('supermarket_products')
            .select('id, price, original_price, is_on_sale, sale_end_date')
            .eq('external_id', product.id)
            .single()

          if (existingProduct) {
            // Update existing product
            const { error: updateError } = await supabase
              .from('supermarket_products')
              .update({
                name: product.name,
                description: product.description,
                category: product.category,
                subcategory: product.subcategory,
                price: product.price,
                original_price: product.originalPrice,
                unit: product.unit,
                unit_price: product.unitPrice,
                is_on_sale: product.isOnSale,
                sale_end_date: product.saleEndDate,
                image_url: product.imageUrl,
                available: product.available,
                temperature_zone: product.temperatureZone,
                nutrition_info: product.nutritionInfo,
                labels: product.labels,
                last_updated: new Date().toISOString(),
                updated_at: new Date().toISOString()
              })
              .eq('external_id', product.id)

            if (updateError) {
              result.errors.push(`Failed to update ${product.name}: ${updateError.message}`)
            } else {
              result.updatedProducts++
              
              // Check if price changed and add to price history
              if (existingProduct.price !== product.price || 
                  existingProduct.original_price !== product.originalPrice ||
                  existingProduct.is_on_sale !== product.isOnSale) {
                await this.addPriceHistory(product.id, {
                  price: product.price,
                  originalPrice: product.originalPrice,
                  isOnSale: product.isOnSale,
                  saleEndDate: product.saleEndDate,
                  timestamp: new Date().toISOString()
                })
              }
            }
          } else {
            // Insert new product
            const { error: insertError } = await supabase
              .from('supermarket_products')
              .insert({
                external_id: product.id,
                name: product.name,
                description: product.description,
                category: product.category,
                subcategory: product.subcategory,
                price: product.price,
                original_price: product.originalPrice,
                unit: product.unit,
                unit_price: product.unitPrice,
                is_on_sale: product.isOnSale,
                sale_end_date: product.saleEndDate,
                image_url: product.imageUrl,
                store: product.store,
                available: product.available,
                temperature_zone: product.temperatureZone,
                nutrition_info: product.nutritionInfo,
                labels: product.labels,
                source: product.source,
                last_updated: new Date().toISOString(),
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              })

            if (insertError) {
              result.errors.push(`Failed to insert ${product.name}: ${insertError.message}`)
            } else {
              result.newProducts++
              
              // Add initial price history entry
              await this.addPriceHistory(product.id, {
                price: product.price,
                originalPrice: product.originalPrice,
                isOnSale: product.isOnSale,
                saleEndDate: product.saleEndDate,
                timestamp: new Date().toISOString()
              })
            }
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          result.errors.push(`Failed to process ${product.name}: ${errorMessage}`)
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      result.errors.push(`Database connection failed: ${errorMessage}`)
    }

    return result
  }

  /**
   * Add price history entry
   */
  private async addPriceHistory(productId: string, priceData: {
    price: number
    originalPrice: number
    isOnSale: boolean
    saleEndDate: string | null
    timestamp: string
  }): Promise<void> {
    try {
      const supabase = await this.getSupabaseClient()
      
      await supabase
        .from('supermarket_price_history')
        .insert({
          product_external_id: productId,
          price: priceData.price,
          original_price: priceData.originalPrice,
          is_on_sale: priceData.isOnSale,
          sale_end_date: priceData.saleEndDate,
          timestamp: priceData.timestamp
        })
    } catch (error) {
      console.error('Failed to add price history:', error)
    }
  }

  /**
   * Get all products from database
   */
  async getAllProducts(): Promise<StoredProduct[]> {
    const supabase = await this.getSupabaseClient()
    
    const { data, error } = await supabase
      .from('supermarket_products')
      .select('*')
      .order('name')

    if (error) {
      throw new Error(`Failed to fetch products: ${error.message}`)
    }

    return data || []
  }

  /**
   * Get products by category
   */
  async getProductsByCategory(category: string): Promise<StoredProduct[]> {
    const supabase = await this.getSupabaseClient()
    
    const { data, error } = await supabase
      .from('supermarket_products')
      .select('*')
      .eq('category', category)
      .order('name')

    if (error) {
      throw new Error(`Failed to fetch products by category: ${error.message}`)
    }

    return data || []
  }

  /**
   * Get products on sale
   */
  async getProductsOnSale(): Promise<StoredProduct[]> {
    const supabase = await this.getSupabaseClient()
    
    const { data, error } = await supabase
      .from('supermarket_products')
      .select('*')
      .eq('is_on_sale', true)
      .order('price')

    if (error) {
      throw new Error(`Failed to fetch products on sale: ${error.message}`)
    }

    return data || []
  }

  /**
   * Get price history for a product
   */
  async getPriceHistory(productId: string): Promise<PriceHistory[]> {
    const supabase = await this.getSupabaseClient()
    
    const { data, error } = await supabase
      .from('supermarket_price_history')
      .select('*')
      .eq('product_external_id', productId)
      .order('timestamp', { ascending: false })

    if (error) {
      throw new Error(`Failed to fetch price history: ${error.message}`)
    }

    return data || []
  }

  /**
   * Search products by name
   */
  async searchProducts(query: string): Promise<StoredProduct[]> {
    const supabase = await this.getSupabaseClient()
    
    const { data, error } = await supabase
      .from('supermarket_products')
      .select('*')
      .ilike('name', `%${query}%`)
      .order('name')

    if (error) {
      throw new Error(`Failed to search products: ${error.message}`)
    }

    return data || []
  }

  /**
   * Get scraping statistics
   */
  async getScrapingStats(): Promise<{
    totalProducts: number
    productsOnSale: number
    categories: string[]
    lastUpdate: string | null
    averagePrice: number
  }> {
    const supabase = await this.getSupabaseClient()
    
    const { data: products, error } = await supabase
      .from('supermarket_products')
      .select('*')

    if (error) {
      throw new Error(`Failed to fetch scraping stats: ${error.message}`)
    }

    const totalProducts = products?.length || 0
    const productsOnSale = products?.filter(p => p.is_on_sale).length || 0
    const categories = [...new Set(products?.map(p => p.category) || [])]
    const lastUpdate = products?.length > 0 
      ? Math.max(...products.map(p => new Date(p.last_updated).getTime()))
      : null
    const averagePrice = products?.length > 0
      ? products.reduce((sum, p) => sum + p.price, 0) / products.length
      : 0

    return {
      totalProducts,
      productsOnSale,
      categories,
      lastUpdate: lastUpdate ? new Date(lastUpdate).toISOString() : null,
      averagePrice: Math.round(averagePrice * 100) / 100
    }
  }

  /**
   * Clean up old price history (keep last 30 days)
   */
  async cleanupOldPriceHistory(): Promise<void> {
    const supabase = await this.getSupabaseClient()
    
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const { error } = await supabase
      .from('supermarket_price_history')
      .delete()
      .lt('timestamp', thirtyDaysAgo.toISOString())

    if (error) {
      console.error('Failed to cleanup old price history:', error)
    }
  }
}

// Export singleton instance
export const supermarketDB = new SupermarketDatabaseService()
