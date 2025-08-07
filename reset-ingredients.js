const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://najaxycfjgultwdwffhv.supabase.co'
const supabaseAnonKey = 'sb_publishable_7Vz1i0EKTMPNw0ldFMIScQ_qX_iHMKI'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function resetIngredients() {
  console.log('🔄 Resetting ingredients table...')
  
  try {
    // Delete all ingredients
    const { error } = await supabase
      .from('ingredients')
      .delete()
      .neq('id', 'dummy') // Delete all rows
    
    if (error) {
      console.error('❌ Error deleting ingredients:', error)
      return
    }
    
    console.log('✅ All ingredients deleted')
    
    // Add back the unique ingredients
    const uniqueIngredients = [
      {
        id: 'portobellosvampe-1',
        name: 'portobellosvampe',
        category: 'andre',
        description: 'portobellosvampe - importeret fra opskrifter',
        exclusions: [],
        allergens: [],
        nutritionalinfo: null
      },
      {
        id: 'olivenolie-1',
        name: 'olivenolie',
        category: 'fedt',
        description: 'olivenolie - importeret fra opskrifter',
        exclusions: [],
        allergens: [],
        nutritionalinfo: null
      },
      {
        id: 'revet ost-1',
        name: 'revet ost',
        category: 'mejeri',
        description: 'revet ost - importeret fra opskrifter',
        exclusions: [],
        allergens: [],
        nutritionalinfo: null
      },
      {
        id: 'pepperoni-1',
        name: 'pepperoni',
        category: 'andre',
        description: 'pepperoni - importeret fra opskrifter',
        exclusions: [],
        allergens: [],
        nutritionalinfo: null
      },
      {
        id: 'tørret oregano-1',
        name: 'tørret oregano',
        category: 'andre',
        description: 'tørret oregano - importeret fra opskrifter',
        exclusions: [],
        allergens: [],
        nutritionalinfo: null
      }
    ]
    
    const { data, error: insertError } = await supabase
      .from('ingredients')
      .insert(uniqueIngredients)
    
    if (insertError) {
      console.error('❌ Error inserting ingredients:', insertError)
      return
    }
    
    console.log('✅ Reset complete! Added 5 unique ingredients')
    
  } catch (err) {
    console.error('❌ Error during reset:', err)
  }
}

resetIngredients() 