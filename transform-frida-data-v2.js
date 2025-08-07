const fs = require('fs')

// Key nutritional parameters with correct Danish names from Frida data
const KEY_PARAMETERS = {
  'Energi (kcal)': 'calories',
  'Protein': 'protein',
  'Fedt': 'fat',
  'Kulhydrat': 'carbs',
  'Fiber': 'fiber',
  'C-vitamin': 'vitaminC',
  'D-vitamin': 'vitaminD',
  'B12-vitamin': 'vitaminB12',
  'Jern': 'iron',
  'Kalcium': 'calcium',
  'Magnesium': 'magnesium',
  'Zink': 'zinc',
  'Natrium': 'sodium',
  'Kalium': 'potassium',
  'A-vitamin': 'vitaminA',
  'E-vitamin': 'vitaminE',
  'K-vitamin': 'vitaminK',
  'B1-vitamin': 'vitaminB1',
  'B2-vitamin': 'vitaminB2',
  'B3-vitamin': 'vitaminB3',
  'B6-vitamin': 'vitaminB6',
  'Folat': 'folate',
  'Biotin': 'biotin',
  'Pantotensyre': 'pantothenicAcid'
}

async function transformFridaDataV2() {
  console.log('🔄 Transforming Frida data to usable format (v2)...')
  
  try {
    // Read the file in chunks
    const readStream = fs.createReadStream('frida-nutritional-data.json', {
      encoding: 'utf8',
      highWaterMark: 1024 * 1024 // 1MB chunks
    })
    
    let buffer = ''
    
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
        const outputPath = 'frida-transformed-v2.json'
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
        
        // Show some sample food items with more nutrition data
        console.log('\n🍎 Sample food items with nutrition data:')
        transformedData.slice(0, 5).forEach(food => {
          console.log(`\n  - ${food.danishName} (${food.englishName})`)
          Object.keys(food.nutrition).forEach(nutKey => {
            const nut = food.nutrition[nutKey]
            console.log(`    ${nutKey}: ${nut.value} ${nut.unit}`)
          })
        })
        
        // Find items with the most nutrition data
        const itemsWithMostNutrition = transformedData
          .sort((a, b) => Object.keys(b.nutrition).length - Object.keys(a.nutrition).length)
          .slice(0, 3)
        
        console.log('\n🏆 Items with most nutrition data:')
        itemsWithMostNutrition.forEach(food => {
          console.log(`\n  - ${food.danishName} (${food.englishName})`)
          console.log(`    Nutrition parameters: ${Object.keys(food.nutrition).length}`)
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
  if (paramName.includes('Energi')) return 'kcal'
  if (paramName.includes('Protein') || paramName.includes('Fedt') || paramName.includes('Kulhydrat') || paramName.includes('Fiber')) return 'g'
  if (paramName.includes('Jern') || paramName.includes('Kalcium') || paramName.includes('Magnesium') || paramName.includes('Zink') || paramName.includes('Natrium') || paramName.includes('Kalium') || paramName.includes('C-vitamin')) return 'mg'
  if (paramName.includes('D-vitamin') || paramName.includes('B12-vitamin') || paramName.includes('A-vitamin') || paramName.includes('E-vitamin') || paramName.includes('K-vitamin') || paramName.includes('B1-vitamin') || paramName.includes('B2-vitamin') || paramName.includes('B3-vitamin') || paramName.includes('B6-vitamin') || paramName.includes('Folat') || paramName.includes('Biotin') || paramName.includes('Pantotensyre')) return 'µg'
  return 'unknown'
}

transformFridaDataV2().catch(console.error) 