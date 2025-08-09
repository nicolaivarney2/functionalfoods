import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    console.log('🔍 Fetching Frida ingredients from database...')
    
    // Fetch all Frida ingredients with pagination to bypass Supabase 1000 row limit
    let allIngredients = []
    let from = 0
    const pageSize = 1000
    
    while (true) {
      const { data: pageData, error: pageError } = await supabase
        .from('frida_ingredients')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true })
        .range(from, from + pageSize - 1)
      
      if (pageError) {
        console.error('❌ Error fetching page:', pageError)
        break
      }
      
      if (!pageData || pageData.length === 0) {
        break // No more data
      }
      
      allIngredients.push(...pageData)
      
      if (pageData.length < pageSize) {
        break // Last page
      }
      
      from += pageSize
    }
    
    const fridaIngredients = allIngredients
    const error = null
    
    if (error) {
      console.error('❌ Error fetching Frida ingredients:', error)
      console.error('Details:', error.message)
      
      // Return mock data for now (until full database is uploaded)
      console.log('📋 Returning mock Frida data for testing...')
      return NextResponse.json(getMockFridaData())
    }
    
    console.log(`✅ Found ${fridaIngredients?.length || 0} Frida ingredients`)
    console.log(`🔢 EXPECTED: ~1370 ingredients, GOT: ${fridaIngredients?.length || 0}`)
    
    if ((fridaIngredients?.length || 0) < 1200) {
      console.log('⚠️  WARNING: Less than expected ingredients returned!')
      console.log('🔍 Checking query with explicit count...')
      
      // Get count to debug
      const { count } = await supabase
        .from('frida_ingredients')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true)
      
      console.log(`📊 Total rows in database: ${count}`)
    }
    
    return NextResponse.json(fridaIngredients || [])
    
  } catch (error) {
    console.error('❌ Unexpected error in /api/frida-ingredients:', error)
    
    // Return mock data as fallback
    console.log('📋 Returning mock Frida data as fallback...')
    return NextResponse.json(getMockFridaData())
  }
}

/**
 * Mock Frida data for testing (until full database is uploaded)
 */
function getMockFridaData() {
  return [
    {
      id: 'frida-mandel-raa',
      name: 'Mandel, rå',
      category: 'nødder',
      description: 'Rå mandler fra Frida DTU database',
      calories: 579,
      protein: 21.15,
      carbs: 21.55,
      fat: 49.93,
      fiber: 12.5,
      vitamins: { 
        E: 25.63, 
        B3: 3.618,
        B2: 1.138,
        B1: 0.211
      },
      minerals: { 
        calcium: 269, 
        magnesium: 270,
        phosphor: 481,
        potassium: 733,
        iron: 3.71
      },
      source: 'frida_dtu',
      frida_id: 'mandel_raa_001',
      is_active: true,
      created_at: '2024-01-01T00:00:00.000Z',
      updated_at: '2024-01-01T00:00:00.000Z'
    },
    {
      id: 'frida-olie-oliven',
      name: 'Olie, oliven',
      category: 'fedtstoffer',
      description: 'Olivenolie fra Frida DTU database',
      calories: 884,
      protein: 0,
      carbs: 0,
      fat: 100,
      fiber: 0,
      vitamins: { 
        E: 14.35,
        K: 60.2
      },
      minerals: {},
      source: 'frida_dtu',
      frida_id: 'olie_oliven_001',
      is_active: true,
      created_at: '2024-01-01T00:00:00.000Z',
      updated_at: '2024-01-01T00:00:00.000Z'
    },
    {
      id: 'frida-kyllingebryst-kogt',
      name: 'Kyllingebryst, kogt',
      category: 'kød',
      description: 'Kogt kyllingebryst fra Frida DTU database',
      calories: 165,
      protein: 31.02,
      carbs: 0,
      fat: 3.57,
      fiber: 0,
      vitamins: { 
        B3: 14.772, 
        B6: 0.6,
        B12: 0.34,
        B1: 0.07
      },
      minerals: { 
        phosphor: 220,
        potassium: 256,
        sodium: 74,
        selenium: 27.4
      },
      source: 'frida_dtu',
      frida_id: 'kyllingebryst_kogt_001',
      is_active: true,
      created_at: '2024-01-01T00:00:00.000Z',
      updated_at: '2024-01-01T00:00:00.000Z'
    },
    {
      id: 'frida-tomat-raa',
      name: 'Tomat, rå',
      category: 'grøntsager',
      description: 'Friske tomater fra Frida DTU database',
      calories: 18,
      protein: 0.88,
      carbs: 3.89,
      fat: 0.2,
      fiber: 1.2,
      vitamins: { 
        C: 14,
        A: 833,
        K: 7.9,
        B6: 0.08
      },
      minerals: { 
        potassium: 237,
        phosphor: 24,
        calcium: 10,
        magnesium: 11
      },
      source: 'frida_dtu',
      frida_id: 'tomat_raa_001',
      is_active: true,
      created_at: '2024-01-01T00:00:00.000Z',
      updated_at: '2024-01-01T00:00:00.000Z'
    },
    {
      id: 'frida-ost-cheddar',
      name: 'Ost, cheddar',
      category: 'mejeriprodukter',
      description: 'Cheddar ost fra Frida DTU database',
      calories: 403,
      protein: 24.9,
      carbs: 1.28,
      fat: 33.14,
      fiber: 0,
      vitamins: { 
        A: 1242, 
        B12: 0.83,
        B2: 0.375,
        B6: 0.066
      },
      minerals: { 
        calcium: 721,
        phosphor: 512,
        sodium: 621,
        zinc: 3.11
      },
      source: 'frida_dtu',
      frida_id: 'ost_cheddar_001',
      is_active: true,
      created_at: '2024-01-01T00:00:00.000Z',
      updated_at: '2024-01-01T00:00:00.000Z'
    },
    {
      id: 'frida-hvidloeg-raa',
      name: 'Hvidløg, rå',
      category: 'grøntsager',
      description: 'Frisk hvidløg fra Frida DTU database',
      calories: 149,
      protein: 6.36,
      carbs: 33.06,
      fat: 0.5,
      fiber: 2.1,
      vitamins: { 
        C: 31.2,
        B6: 1.235,
        B1: 0.2
      },
      minerals: { 
        potassium: 401,
        phosphor: 153,
        calcium: 181,
        magnesium: 25
      },
      source: 'frida_dtu',
      frida_id: 'hvidloeg_raa_001',
      is_active: true,
      created_at: '2024-01-01T00:00:00.000Z',
      updated_at: '2024-01-01T00:00:00.000Z'
    },
    {
      id: 'frida-aeble-raa',
      name: 'Æble, rå, med skræl',
      category: 'frugt',
      description: 'Friske æbler med skræl fra Frida DTU database',
      calories: 52,
      protein: 0.26,
      carbs: 13.81,
      fat: 0.17,
      fiber: 2.4,
      vitamins: { 
        C: 4.6,
        A: 54,
        K: 2.2
      },
      minerals: { 
        potassium: 107,
        phosphor: 11,
        calcium: 6,
        magnesium: 5
      },
      source: 'frida_dtu',
      frida_id: 'aeble_raa_001',
      is_active: true,
      created_at: '2024-01-01T00:00:00.000Z',
      updated_at: '2024-01-01T00:00:00.000Z'
    },
    {
      id: 'frida-basilikum-frisk',
      name: 'Basilikum, frisk',
      category: 'krydderier',
      description: 'Frisk basilikum fra Frida DTU database',
      calories: 22,
      protein: 3.15,
      carbs: 2.65,
      fat: 0.64,
      fiber: 1.6,
      vitamins: { 
        C: 18.0,
        A: 5275,
        K: 414.8,
        B6: 0.155
      },
      minerals: { 
        potassium: 295,
        calcium: 177,
        magnesium: 64,
        iron: 3.17
      },
      source: 'frida_dtu',
      frida_id: 'basilikum_frisk_001',
      is_active: true,
      created_at: '2024-01-01T00:00:00.000Z',
      updated_at: '2024-01-01T00:00:00.000Z'
    },
    {
      id: 'frida-spinat-raa',
      name: 'Spinat, rå',
      category: 'grøntsager',
      description: 'Frisk spinat fra Frida DTU database',
      calories: 23,
      protein: 2.86,
      carbs: 3.63,
      fat: 0.39,
      fiber: 2.2,
      vitamins: { 
        C: 28.1,
        A: 9377,
        K: 482.9,
        Folate: 194
      },
      minerals: { 
        potassium: 558,
        calcium: 99,
        magnesium: 79,
        iron: 2.71
      },
      source: 'frida_dtu',
      frida_id: 'spinat_raa_001',
      is_active: true,
      created_at: '2024-01-01T00:00:00.000Z',
      updated_at: '2024-01-01T00:00:00.000Z'
    },
    {
      id: 'frida-laks-raa',
      name: 'Laks, rå',
      category: 'fisk',
      description: 'Rå laks fra Frida DTU database',
      calories: 208,
      protein: 25.44,
      carbs: 0,
      fat: 12.35,
      fiber: 0,
      vitamins: { 
        D: 11.0,
        B12: 2.8,
        B3: 8.042,
        B6: 0.8
      },
      minerals: { 
        potassium: 363,
        phosphor: 371,
        selenium: 36.5,
        calcium: 9
      },
      source: 'frida_dtu',
      frida_id: 'laks_raa_001',
      is_active: true,
      created_at: '2024-01-01T00:00:00.000Z',
      updated_at: '2024-01-01T00:00:00.000Z'
    }
  ]
}