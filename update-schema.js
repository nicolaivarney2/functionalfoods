const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://najaxycfjgultwdwffhv.supabase.co'
const supabaseAnonKey = 'sb_publishable_7Vz1i0EKTMPNw0ldFMIScQ_qX_iHMKI'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function updateSchema() {
  console.log('🔧 Updating database schema...')
  
  try {
    // Update recipes table
    console.log('📝 Adding missing columns to recipes table...')
    const { error: recipesError } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE recipes 
        ADD COLUMN IF NOT EXISTS cookTimeISO TEXT,
        ADD COLUMN IF NOT EXISTS prepTimeISO TEXT,
        ADD COLUMN IF NOT EXISTS totalTimeISO TEXT;
      `
    })
    
    if (recipesError) {
      console.error('❌ Error updating recipes table:', recipesError)
    } else {
      console.log('✅ Recipes table updated successfully')
    }
    
    // Update ingredients table
    console.log('📝 Adding missing columns to ingredients table...')
    const { error: ingredientsError } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE ingredients 
        ADD COLUMN IF NOT EXISTS commonNames JSONB;
      `
    })
    
    if (ingredientsError) {
      console.error('❌ Error updating ingredients table:', ingredientsError)
    } else {
      console.log('✅ Ingredients table updated successfully')
    }
    
    console.log('🎉 Schema update completed!')
    
  } catch (err) {
    console.error('❌ Schema update failed:', err)
  }
}

updateSchema().catch(console.error) 