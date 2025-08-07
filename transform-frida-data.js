const fs = require('fs')

// Key nutritional parameters we want to extract
const KEY_PARAMETERS = {
  'Energi (kcal)': 'calories',
  'Protein (g)': 'protein',
  'Fedt (g)': 'fat',
  'Kulhydrat (g)': 'carbs',
  'Fiber (g)': 'fiber',
  'Vitamin C (mg)': 'vitaminC',
  'Vitamin D (µg)': 'vitaminD',
  'Vitamin B12 (µg)': 'vitaminB12',
  'Jern (mg)': 'iron',
  'Kalcium (mg)': 'calcium',
  'Magnesium (mg)': 'magnesium',
  'Zink (mg)': 'zinc',
  'Natrium (mg)': 'sodium',
  'Kalium (mg)': 'potassium'
}

async function transformFridaData() {
  console.log('🔄 Transforming Frida data to usable format...')
  
  try {
    // Read the file in chunks
    const readStream = fs.createReadStream('frida-nutritional-data.json', {
      encoding: 'utf8',
      highWaterMark: 1024 * 1024 // 1MB chunks
    })
    
    let buffer = ''
    let processedCount = 0
    const maxItems = 10000 // Process first 10k items for testing
    
    readStream.on('data', (chunk) => {
      buffer += chunk
    })
    
    readStream.on('end', () => {
      try {
        // Parse the JSON
        const data = JSON.parse(buffer)
        console.log(`📊 Total items in file: ${data.length}`)
        
        // Group by FoodID
        const foodGroups = {}
        
        data.forEach(item => {
          if (!foodGroups[item.FoodID]) {
            foodGroups[item.FoodID] = {
              id: item.FoodID,
              danishName: item.FødevareNavn,
              englishName: item.FoodName,
              nutrition: {}
            }
          }
          
          // Add nutritional data if it's a key parameter
          const paramName = item.ParameterNavn
          if (KEY_PARAMETERS[paramName]) {
            const key = KEY_PARAMETERS[paramName]
            foodGroups[item.FoodID].nutrition[key] = {
              value: item.ResVal,
              unit: extractUnit(paramName),
              parameterName: paramName,
              englishName: item.ParameterName
            }
          }
        })
        
        console.log(`🍎 Processed ${Object.keys(foodGroups).length} food items`)
        
        // Convert to array and filter items with nutritional data
        const transformedData = Object.values(foodGroups).filter(food => 
          Object.keys(food.nutrition).length > 0
        )
        
        console.log(`✅ ${transformedData.length} items have nutritional data`)
        
        // Show sample of transformed data
        console.log('\n📋 Sample transformed item:')
        console.log(JSON.stringify(transformedData[0], null, 2))
        
        // Save transformed data
        const outputPath = 'frida-transformed.json'
        fs.writeFileSync(outputPath, JSON.stringify(transformedData, null, 2))
        console.log(`💾 Saved transformed data to ${outputPath}`)
        
        // Show statistics
        const nutritionStats = {}
        transformedData.forEach(food => {
          Object.keys(food.nutrition).forEach(nutKey => {
            if (!nutritionStats[nutKey]) {
              nutritionStats[nutKey] = 0
            }
            nutritionStats[nutKey]++
          })
        })
        
        console.log('\n📊 Nutrition data coverage:')
        Object.keys(nutritionStats).forEach(nutKey => {
          const percentage = ((nutritionStats[nutKey] / transformedData.length) * 100).toFixed(1)
          console.log(`  - ${nutKey}: ${nutritionStats[nutKey]} items (${percentage}%)`)
        })
        
        // Show some sample food items
        console.log('\n🍎 Sample food items:')
        transformedData.slice(0, 5).forEach(food => {
          console.log(`  - ${food.danishName} (${food.englishName})`)
          Object.keys(food.nutrition).forEach(nutKey => {
            const nut = food.nutrition[nutKey]
            console.log(`    ${nutKey}: ${nut.value} ${nut.unit}`)
          })
        })
        
      } catch (parseError) {
        console.error('❌ Error parsing JSON:', parseError.message)
      }
    })
    
    readStream.on('error', (error) => {
      console.error('❌ Error reading file:', error)
    })
    
  } catch (err) {
    console.error('❌ Error transforming Frida data:', err)
  }
}

function extractUnit(paramName) {
  if (paramName.includes('(kcal)')) return 'kcal'
  if (paramName.includes('(g)')) return 'g'
  if (paramName.includes('(mg)')) return 'mg'
  if (paramName.includes('(µg)')) return 'µg'
  return 'unknown'
}

transformFridaData().catch(console.error) 