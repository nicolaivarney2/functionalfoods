const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

async function addKetoTagToDrafts() {
  console.log('🏷️ Tilføjer Keto tag til alle kladder...\n')
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Mangler environment variables:')
    console.error('  NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✅' : '❌')
    console.error('  SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✅' : '❌')
    process.exit(1)
  }
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  
  try {
    // Hent alle kladder (status = 'draft')
    console.log('📊 Henter alle kladder...')
    const { data: drafts, error: draftsError } = await supabase
      .from('recipes')
      .select('id, title, dietaryCategories, status')
      .eq('status', 'draft')
    
    if (draftsError) {
      console.error('❌ Fejl ved hentning af kladder:', draftsError)
      process.exit(1)
    }
    
    const totalDrafts = drafts?.length || 0
    console.log(`✅ Fundet ${totalDrafts} kladder\n`)
    
    if (totalDrafts === 0) {
      console.log('⚠️ Ingen kladder fundet. Stopper.')
      return
    }
    
    // Tjek hvor mange allerede har Keto tag
    const hasKeto = drafts.filter(r => {
      const cats = r.dietaryCategories || []
      return cats.some(c => {
        const catStr = String(c || '')
        return catStr.includes('Keto') || catStr.includes('[Keto]')
      })
    }).length
    
    console.log(`📊 Eksisterende Keto tags: ${hasKeto}/${totalDrafts}\n`)
    
    // Opdater kladder
    let updated = 0
    
    console.log('🔄 Opdaterer kladder...')
    
    for (const draft of drafts) {
      const currentCategories = draft.dietaryCategories || []
      
      // Tjek om Keto allerede findes
      const hasKetoTag = currentCategories.some(c => {
        const catStr = String(c || '')
        return catStr.includes('Keto') || catStr.includes('[Keto]')
      })
      
      if (!hasKetoTag) {
        const newCategories = [...currentCategories, 'Keto']
        
        const { error: updateError } = await supabase
          .from('recipes')
          .update({ dietaryCategories: newCategories })
          .eq('id', draft.id)
        
        if (updateError) {
          console.error(`❌ Fejl ved opdatering af ${draft.title}:`, updateError)
        } else {
          updated++
          console.log(`  ✅ ${draft.title}`)
        }
      }
    }
    
    console.log(`\n✅ Opdatering færdig!`)
    console.log(`  Tilføjet Keto tag: ${updated} kladder`)
    console.log(`  Allerede havde Keto: ${hasKeto} kladder`)
    
  } catch (error) {
    console.error('❌ Uventet fejl:', error)
    process.exit(1)
  }
}

addKetoTagToDrafts()

