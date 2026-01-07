const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')
require('dotenv').config({ path: '.env.local' })

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'

// Funktion til at hente OpenAI config (samme som i openai-config.ts)
function getOpenAIConfig() {
  try {
    const CONFIG_FILE = path.join(process.cwd(), '.openai-config.json')
    
    if (fs.existsSync(CONFIG_FILE)) {
      const configData = fs.readFileSync(CONFIG_FILE, 'utf-8')
      const config = JSON.parse(configData)
      
      if (config.apiKey) {
        return config
      }
    }
    
    // Fallback til env variabel hvis fil ikke findes
    if (process.env.OPENAI_API_KEY) {
      return { apiKey: process.env.OPENAI_API_KEY }
    }
  } catch (error) {
    console.error('Error reading OpenAI config:', error)
  }
  
  return null
}

async function processDraftsWithAITips() {
  console.log('🤖 Behandler kladder med AI tips og udgiver dem...\n')
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Mangler environment variables')
    process.exit(1)
  }
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  
  try {
    // Hent alle kladder (status = 'draft')
    console.log('📊 Henter alle kladder...')
    const { data: drafts, error: draftsError } = await supabase
      .from('recipes')
      .select('id, title, description, slug, difficulty, preparationTime, cookingTime, dietaryCategories, personalTips')
      .eq('status', 'draft')
      .order('createdAt', { ascending: true })
    
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
    
    let processed = 0
    let errors = 0
    
    // Behandl én kladde ad gangen
    for (let i = 0; i < drafts.length; i++) {
      const draft = drafts[i]
      console.log(`\n📝 [${i + 1}/${totalDrafts}] Behandler: ${draft.title}`)
      
      try {
        // 1. Generer AI tips hvis de ikke allerede findes
        let aiTips = draft.personalTips || ''
        
        if (!aiTips || aiTips.trim() === '') {
          console.log('  💡 Genererer AI tips...')
          
          const totalTime = (draft.preparationTime || 0) + (draft.cookingTime || 0)
          const dietaryCategories = draft.dietaryCategories || []
          
          try {
            const config = getOpenAIConfig()
            const openaiApiKey = config?.apiKey
            
            if (!openaiApiKey) {
              console.log('  ⚠️ OpenAI API key mangler, springer over')
            } else {
              const prompt = `Generer personlige tips til denne opskrift:

Opskrift: ${draft.title}
Beskrivelse: ${draft.description || ''}
Sværhedsgrad: ${draft.difficulty || 'medium'}
Total tid: ${totalTime || 45} minutter
Kategori: ${dietaryCategories.join(', ') || 'Generel'}

Skriv 3-4 personlige, menneskelige tips som om du har lavet denne ret mange gange.`
              
              const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${openaiApiKey}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  model: "gpt-4o",
                  messages: [
                    {
                      role: "system",
                      content: `Du er en erfaren kok der skal give personlige tips til opskrifter. Skriv altid på dansk.

Skriv 3-4 personlige, menneskelige tips som om du har lavet denne ret mange gange.

Formatér tips sådan:
- Første tip her
- Andet tip her  
- Tredje tip her
- Fjerde tip her

Brug bindestreg (-) foran hvert tip.`
                    },
                    {
                      role: "user",
                      content: prompt
                    }
                  ],
                  temperature: 0.8,
                  max_tokens: 1000
                })
              })
              
              if (response.ok) {
                const data = await response.json()
                aiTips = data.choices[0]?.message?.content || ''
                console.log('  ✅ AI tips genereret')
              } else {
                const errorData = await response.json().catch(() => ({}))
                console.log('  ⚠️ Kunne ikke generere AI tips:', errorData.error?.message || 'Unknown error')
              }
            }
          } catch (tipsError) {
            console.log('  ⚠️ Fejl ved generering af AI tips:', tipsError.message)
          }
        } else {
          console.log('  ℹ️ Kladden har allerede tips, springer over generering')
        }
        
        // 2. Opdater kladden med tips
        if (aiTips && aiTips.trim() !== '') {
          const { error: updateError } = await supabase
            .from('recipes')
            .update({ 
              personalTips: aiTips,
              updatedAt: new Date().toISOString()
            })
            .eq('id', draft.id)
          
          if (updateError) {
            console.error(`  ❌ Fejl ved opdatering af tips:`, updateError)
            errors++
            continue
          }
          console.log('  ✅ Tips gemt')
        }
        
        // 3. Udgiv opskriften (sæt status til 'published')
        const { error: publishError } = await supabase
          .from('recipes')
          .update({ 
            status: 'published',
            publishedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          })
          .eq('id', draft.id)
        
        if (publishError) {
          console.error(`  ❌ Fejl ved udgivelse:`, publishError)
          errors++
          continue
        }
        
        console.log('  ✅ Opskrift udgivet')
        processed++
        
        // Vent lidt mellem hver opskrift for at undgå rate limiting
        if (i < drafts.length - 1) {
          const waitTime = 6000 // 6 sekunder - giver OpenAI tid til at processere
          console.log(`  ⏳ Vent ${waitTime / 1000} sekunder før næste...`)
          await new Promise(resolve => setTimeout(resolve, waitTime))
        }
        
      } catch (error) {
        console.error(`  ❌ Fejl ved behandling af ${draft.title}:`, error.message)
        errors++
      }
    }
    
    console.log(`\n✅ Behandling færdig!`)
    console.log(`  Behandlet: ${processed}/${totalDrafts}`)
    console.log(`  Fejl: ${errors}`)
    
  } catch (error) {
    console.error('❌ Uventet fejl:', error)
    process.exit(1)
  }
}

processDraftsWithAITips()

