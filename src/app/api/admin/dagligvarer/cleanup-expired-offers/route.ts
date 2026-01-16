import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({
        success: false,
        error: 'Missing Supabase credentials'
      }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey)
    const now = new Date().toISOString()

    console.log('🧹 Starting cleanup of expired offers...')
    console.log(`📅 Current time (UTC): ${now}`)

    // First, let's check how many offers are marked as on_sale with a sale_valid_to date
    const { count: totalOnSaleWithDate } = await supabase
      .from('product_offers')
      .select('*', { count: 'exact', head: true })
      .eq('is_on_sale', true)
      .not('sale_valid_to', 'is', null)

    console.log(`📊 Total offers with is_on_sale=true and sale_valid_to not null: ${totalOnSaleWithDate || 0}`)

    // Get a sample to see what dates we have - order by sale_valid_to ASC to see oldest first
    // Check BOTH is_on_sale=true AND is_on_sale=false to see all offers with dates
    const { data: sampleOffers } = await supabase
      .from('product_offers')
      .select('id, name_store, is_on_sale, sale_valid_to')
      .not('sale_valid_to', 'is', null)
      .order('sale_valid_to', { ascending: true })
      .limit(20)

    if (sampleOffers && sampleOffers.length > 0) {
      console.log('📋 Sample offers with sale_valid_to (including both is_on_sale=true and false):')
      sampleOffers.forEach(o => {
        const saleDate = new Date(o.sale_valid_to)
        const isExpired = saleDate < new Date(now)
        console.log(`  - ${o.name_store}: sale_valid_to=${o.sale_valid_to}, is_on_sale=${o.is_on_sale}, expired=${isExpired}`)
      })
      
      // Check specifically for marcipan offers
      const marcipanOffers = sampleOffers.filter(o => o.name_store?.toUpperCase().includes('MARCIPAN'))
      if (marcipanOffers.length > 0) {
        console.log(`🍫 Found ${marcipanOffers.length} marcipan offers in sample:`)
        marcipanOffers.forEach(o => {
          const saleDate = new Date(o.sale_valid_to)
          const isExpired = saleDate < new Date(now)
          console.log(`  - ${o.name_store}: sale_valid_to=${o.sale_valid_to}, is_on_sale=${o.is_on_sale}, expired=${isExpired}`)
        })
      }
    }
    
    // Specifically search for marcipan offers - check all marcipan offers regardless of date
    console.log('🔍 Searching for ALL marcipan offers to check their status...')
    const { data: marcipanSearch, error: marcipanError } = await supabase
      .from('product_offers')
      .select('id, name_store, is_on_sale, sale_valid_to, store_id, current_price')
      .ilike('name_store', '%marcipan%')
      .order('sale_valid_to', { ascending: true, nullsFirst: false })
      .limit(100)
    
    if (marcipanError) {
      console.error('❌ Error searching for marcipan:', marcipanError)
    } else if (marcipanSearch && marcipanSearch.length > 0) {
      console.log(`🍫 Found ${marcipanSearch.length} marcipan offers:`)
      const nowDate = new Date(now)
      let expiredCount = 0
      let activeCount = 0
      
      marcipanSearch.forEach(o => {
        const saleDate = o.sale_valid_to ? new Date(o.sale_valid_to) : null
        const isExpired = saleDate ? saleDate < nowDate : false
        const status = isExpired ? '❌ EXPIRED' : (o.is_on_sale ? '✅ ACTIVE' : '⏸️ INACTIVE')
        console.log(`  ${status} ${o.name_store}: sale_valid_to=${o.sale_valid_to || 'null'}, is_on_sale=${o.is_on_sale}, price=${o.current_price}`)
        
        if (isExpired && o.is_on_sale) {
          expiredCount++
        } else if (!isExpired && o.is_on_sale) {
          activeCount++
        }
      })
      
      if (expiredCount > 0) {
        console.log(`⚠️ Found ${expiredCount} marcipan offers that are EXPIRED but still marked is_on_sale=true`)
        console.log(`✅ Found ${activeCount} marcipan offers that are ACTIVE and correctly marked`)
      } else {
        console.log(`✅ All marcipan offers are correctly marked (${activeCount} active, ${marcipanSearch.length - activeCount - expiredCount} inactive)`)
      }
    } else {
      console.log('ℹ️ No marcipan offers found in database')
    }
    
    // Also check what the actual date format is for offers around Nov 29
    console.log('🔍 Checking offers with dates around Nov 29 (2024 or 2025)...')
    const { data: nov29Offers, error: nov29Error } = await supabase
      .from('product_offers')
      .select('id, name_store, is_on_sale, sale_valid_to, store_id')
      .or('sale_valid_to.lte.2025-11-30T23:59:59+00:00,sale_valid_to.gte.2024-11-28T00:00:00+00:00')
      .order('sale_valid_to', { ascending: true })
      .limit(20)
    
    if (!nov29Error && nov29Offers && nov29Offers.length > 0) {
      console.log(`📅 Found ${nov29Offers.length} offers with dates around Nov 29:`)
      nov29Offers.forEach(o => {
        const saleDate = new Date(o.sale_valid_to)
        const isExpired = saleDate < new Date(now)
        console.log(`  - ${o.name_store}: sale_valid_to=${o.sale_valid_to}, is_on_sale=${o.is_on_sale}, expired=${isExpired}`)
      })
    }

    // First, get the total count of expired offers
    const { count: totalCount, error: countError } = await supabase
      .from('product_offers')
      .select('*', { count: 'exact', head: true })
      .eq('is_on_sale', true)
      .not('sale_valid_to', 'is', null)
      .lt('sale_valid_to', now)

    if (countError) {
      console.error('❌ Error counting expired offers:', countError)
      return NextResponse.json({
        success: false,
        error: `Failed to count expired offers: ${countError.message}`
      }, { status: 500 })
    }

    if (!totalCount || totalCount === 0) {
      // Also try a different approach - check ALL offers where sale_valid_to is in the past
      // Order by sale_valid_to ASC to get oldest/expired ones first
      // Process in batches to handle all of them
      console.log('🔍 Trying alternative approach: checking all offers with JavaScript date comparison...')
      console.log('⚠️ Note: Only checking offers where is_on_sale=true. If expired offers are already marked as false, they won\'t be found.')
      
      const BATCH_SIZE = 1000
      let allExpiredOffers: any[] = []
      let offset = 0
      let hasMore = true
      const nowDate = new Date(now)
      
      while (hasMore) {
        const { data: batch, error: checkError } = await supabase
          .from('product_offers')
          .select('id, name_store, is_on_sale, sale_valid_to, store_id')
          .eq('is_on_sale', true)
          .not('sale_valid_to', 'is', null)
          .order('sale_valid_to', { ascending: true }) // Get oldest dates first
          .range(offset, offset + BATCH_SIZE - 1)
        
        if (checkError) {
          console.error('❌ Error fetching batch for JavaScript comparison:', checkError)
          break
        }
        
        if (!batch || batch.length === 0) {
          hasMore = false
          break
        }
        
        console.log(`📦 Batch ${Math.floor(offset/BATCH_SIZE) + 1}: Checking ${batch.length} offers, first date: ${batch[0]?.sale_valid_to}`)
        
        // Check each offer with JavaScript date comparison
        const expiredInBatch = batch.filter(o => {
          if (!o.sale_valid_to) return false
          const saleDate = new Date(o.sale_valid_to)
          return saleDate < nowDate
        })
        
        if (expiredInBatch.length > 0) {
          console.log(`  ✅ Found ${expiredInBatch.length} expired offers in this batch`)
          expiredInBatch.forEach(o => {
            console.log(`    - ${o.name_store}: ${o.sale_valid_to} (expired)`)
          })
        }
        
        allExpiredOffers.push(...expiredInBatch)
        
        // If we found expired offers, continue to check if there are more
        // If this batch has no expired, check if the first item is in the future
        if (expiredInBatch.length === 0 && batch.length > 0) {
          const firstDate = batch[0]?.sale_valid_to ? new Date(batch[0].sale_valid_to) : null
          if (firstDate && firstDate >= nowDate) {
            console.log(`✅ Reached offers that are not expired yet (first date: ${batch[0].sale_valid_to}), stopping search`)
            hasMore = false
            break
          }
        }
        
        offset += BATCH_SIZE
        hasMore = batch.length === BATCH_SIZE
      }

      console.log(`🔍 Found ${allExpiredOffers.length} expired offers using JavaScript date comparison`)

      if (allExpiredOffers.length > 0) {
          console.log('⚠️ Supabase date comparison might not be working - using JavaScript comparison instead')
          console.log(`📋 Sample expired offers: ${allExpiredOffers.slice(0, 5).map(o => `${o.name_store} (${o.sale_valid_to})`).join(', ')}`)
          
          // Process in batches to update
          let totalCleaned = 0
          const UPDATE_BATCH_SIZE = 1000
          
          for (let i = 0; i < allExpiredOffers.length; i += UPDATE_BATCH_SIZE) {
            const batch = allExpiredOffers.slice(i, i + UPDATE_BATCH_SIZE)
            const expiredIds = batch.map(o => o.id)
          
            const { error: updateError } = await supabase
              .from('product_offers')
              .update({
                is_on_sale: false,
                discount_percentage: null,
                updated_at: now
              })
              .in('id', expiredIds)

            if (updateError) {
              console.error(`❌ Error updating batch ${Math.floor(i/UPDATE_BATCH_SIZE) + 1}:`, updateError)
              return NextResponse.json({
                success: false,
                error: `Failed to update expired offers: ${updateError.message}`
              }, { status: 500 })
            }
            
            totalCleaned += batch.length
            console.log(`✅ Updated batch ${Math.floor(i/UPDATE_BATCH_SIZE) + 1}: ${batch.length} offers (total: ${totalCleaned})`)
          }

          // Group by store for summary
          const byStore = allExpiredOffers.reduce((acc, offer) => {
            const store = offer.store_id || 'unknown'
            acc[store] = (acc[store] || 0) + 1
            return acc
          }, {} as Record<string, number>)

          return NextResponse.json({
            success: true,
            message: `Cleaned up ${totalCleaned} expired offers (using JavaScript date comparison)`,
            cleaned: totalCleaned,
            totalFound: allExpiredOffers.length,
            byStore,
            note: 'Used JavaScript date comparison due to Supabase query limitation',
            sample: allExpiredOffers.slice(0, 10).map(o => ({
              name: o.name_store,
              expired_date: o.sale_valid_to,
              store: o.store_id
            }))
          })
        }

      return NextResponse.json({
        success: true,
        message: 'No expired offers found',
        cleaned: 0,
        expiredOffers: [],
        debug: {
          totalOnSaleWithDate,
          sampleOffers: sampleOffers?.map(o => ({
            name: o.name_store,
            sale_valid_to: o.sale_valid_to,
            is_expired: new Date(o.sale_valid_to) < new Date(now)
          }))
        }
      })
    }

    console.log(`🔍 Found ${totalCount} expired offers to clean up (will process in batches)`)

    // Process in batches to handle Supabase's 1000 row limit
    const BATCH_SIZE = 1000
    let totalCleaned = 0
    let allExpiredOffers: any[] = []
    let offset = 0
    let hasMore = true

    while (hasMore) {
      const { data: batch, error: fetchError } = await supabase
        .from('product_offers')
        .select('id, name_store, current_price, normal_price, sale_valid_to, store_id')
        .eq('is_on_sale', true)
        .not('sale_valid_to', 'is', null)
        .lt('sale_valid_to', now)
        .range(offset, offset + BATCH_SIZE - 1)

      if (fetchError) {
        console.error(`❌ Error fetching batch at offset ${offset}:`, fetchError)
        return NextResponse.json({
          success: false,
          error: `Failed to fetch expired offers: ${fetchError.message}`
        }, { status: 500 })
      }

      if (!batch || batch.length === 0) {
        hasMore = false
        break
      }

      allExpiredOffers.push(...batch)
      const batchIds = batch.map(o => o.id)
      
      // Update this batch
      const { error: updateError } = await supabase
        .from('product_offers')
        .update({
          is_on_sale: false,
          discount_percentage: null,
          updated_at: now
        })
        .in('id', batchIds)

      if (updateError) {
        console.error(`❌ Error updating batch at offset ${offset}:`, updateError)
        return NextResponse.json({
          success: false,
          error: `Failed to update expired offers: ${updateError.message}`
        }, { status: 500 })
      }

      totalCleaned += batch.length
      console.log(`✅ Cleaned up batch: ${batch.length} offers (total: ${totalCleaned}/${totalCount})`)

      // Check if there are more to process
      hasMore = batch.length === BATCH_SIZE
      offset += BATCH_SIZE
    }

    console.log(`✅ Successfully cleaned up ${totalCleaned} expired offers`)

    // Group by store for summary
    const byStore = allExpiredOffers.reduce((acc, offer) => {
      const store = offer.store_id || 'unknown'
      acc[store] = (acc[store] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return NextResponse.json({
      success: true,
      message: `Cleaned up ${totalCleaned} expired offers (processed in batches)`,
      cleaned: totalCleaned,
      totalFound: totalCount,
      byStore,
      sample: allExpiredOffers.slice(0, 10).map(o => ({
        name: o.name_store,
        price: o.current_price,
        normal_price: o.normal_price,
        expired_date: o.sale_valid_to,
        store: o.store_id
      }))
    })

  } catch (error) {
    console.error('❌ Error in cleanup expired offers:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

