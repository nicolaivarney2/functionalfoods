const fs = require('fs')

async function analyzeFridaStructure() {
  console.log('🔍 Analyzing Frida data structure in detail...')
  
  try {
    // Read a larger chunk to get more complete data
    const stream = fs.createReadStream('frida-nutritional-data.json', { 
      encoding: 'utf8',
      start: 0,
      end: 50000 // Read first 50KB
    })
    
    let data = ''
    stream.on('data', chunk => {
      data += chunk
    })
    
    stream.on('end', () => {
      try {
        // Find the complete JSON structure
        const jsonStart = data.indexOf('[')
        const jsonEnd = data.lastIndexOf(']') + 1
        const jsonData = data.substring(jsonStart, jsonEnd)
        
        const parsed = JSON.parse(jsonData)
        console.log('✅ Successfully parsed Frida data structure')
        console.log(`📊 Total items in sample: ${parsed.length}`)
        
        if (parsed.length > 0) {
          // Analyze the structure
          const sample = parsed[0]
          console.log('\n📋 Sample item structure:')
          console.log(JSON.stringify(sample, null, 2))
          
          // Group by FoodID to understand the structure
          const foodGroups = {}
          parsed.forEach(item => {
            if (!foodGroups[item.FoodID]) {
              foodGroups[item.FoodID] = {
                FoodID: item.FoodID,
                FødevareNavn: item.FødevareNavn,
                FoodName: item.FoodName,
                parameters: []
              }
            }
            foodGroups[item.FoodID].parameters.push({
              ParameterID: item.ParameterID,
              ParameterNavn: item.ParameterNavn,
              ParameterName: item.ParameterName,
              ResVal: item.ResVal,
              SortKey: item.SortKey
            })
          })
          
          console.log('\n🍎 Food items found:')
          Object.keys(foodGroups).forEach(foodId => {
            const food = foodGroups[foodId]
            console.log(`\n  Food ID: ${food.FoodID}`)
            console.log(`  Danish Name: ${food.FødevareNavn}`)
            console.log(`  English Name: ${food.FoodName}`)
            console.log(`  Parameters: ${food.parameters.length}`)
            
            // Show first few parameters
            food.parameters.slice(0, 5).forEach(param => {
              console.log(`    - ${param.ParameterNavn}: ${param.ResVal}`)
            })
          })
          
          // Analyze parameter types
          const parameterTypes = {}
          parsed.forEach(item => {
            const paramName = item.ParameterNavn
            if (!parameterTypes[paramName]) {
              parameterTypes[paramName] = {
                count: 0,
                englishName: item.ParameterName,
                sampleValue: item.ResVal
              }
            }
            parameterTypes[paramName].count++
          })
          
          console.log('\n📊 Parameter types found:')
          Object.keys(parameterTypes).slice(0, 10).forEach(paramName => {
            const param = parameterTypes[paramName]
            console.log(`  - ${paramName} (${param.englishName}): ${param.count} occurrences, sample: ${param.sampleValue}`)
          })
          
          // Look for key nutritional parameters
          const keyParams = [
            'Energi (kcal)',
            'Protein (g)',
            'Fedt (g)',
            'Kulhydrat (g)',
            'Fiber (g)',
            'Vitamin C (mg)',
            'Vitamin D (µg)',
            'Vitamin B12 (µg)',
            'Jern (mg)',
            'Kalcium (mg)'
          ]
          
          console.log('\n🔑 Key nutritional parameters:')
          keyParams.forEach(paramName => {
            if (parameterTypes[paramName]) {
              console.log(`  ✅ ${paramName}: ${parameterTypes[paramName].count} occurrences`)
            } else {
              console.log(`  ❌ ${paramName}: Not found`)
            }
          })
        }
        
      } catch (parseError) {
        console.error('❌ Error parsing JSON:', parseError.message)
      }
    })
    
    stream.on('error', (error) => {
      console.error('❌ Error reading file:', error)
    })
    
  } catch (err) {
    console.error('❌ Error analyzing Frida data:', err)
  }
}

analyzeFridaStructure().catch(console.error) 