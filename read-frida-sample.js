const fs = require('fs')

async function readFridaSample() {
  console.log('🔍 Reading Frida data sample...')
  
  try {
    // Read the file in chunks to find the structure
    const readStream = fs.createReadStream('frida-nutritional-data.json', {
      encoding: 'utf8',
      highWaterMark: 1024 * 1024 // 1MB chunks
    })
    
    let buffer = ''
    let lineCount = 0
    const maxLines = 100 // Read first 100 lines
    
    readStream.on('data', (chunk) => {
      buffer += chunk
      
      // Count lines and stop when we have enough
      const lines = buffer.split('\n')
      lineCount += lines.length - 1
      
      if (lineCount >= maxLines) {
        readStream.destroy()
      }
    })
    
    readStream.on('end', () => {
      console.log('📄 File sample read successfully')
      
      // Find the JSON array start and end
      const startIndex = buffer.indexOf('[')
      const endIndex = buffer.lastIndexOf(']')
      
      if (startIndex !== -1 && endIndex !== -1) {
        const jsonSample = buffer.substring(startIndex, endIndex + 1)
        
        try {
          const parsed = JSON.parse(jsonSample)
          console.log(`✅ Parsed ${parsed.length} items from sample`)
          
          if (parsed.length > 0) {
            console.log('\n📋 First item structure:')
            console.log(JSON.stringify(parsed[0], null, 2))
            
            // Group by FoodID
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
            
            console.log('\n🍎 Food items in sample:')
            Object.keys(foodGroups).forEach(foodId => {
              const food = foodGroups[foodId]
              console.log(`\n  Food ID: ${food.FoodID}`)
              console.log(`  Danish Name: ${food.FødevareNavn}`)
              console.log(`  English Name: ${food.FoodName}`)
              console.log(`  Parameters: ${food.parameters.length}`)
              
              // Show all parameters for this food
              food.parameters.forEach(param => {
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
            
            console.log('\n📊 Parameter types in sample:')
            Object.keys(parameterTypes).forEach(paramName => {
              const param = parameterTypes[paramName]
              console.log(`  - ${paramName} (${param.englishName}): ${param.count} occurrences, sample: ${param.sampleValue}`)
            })
          }
          
        } catch (parseError) {
          console.error('❌ Error parsing JSON sample:', parseError.message)
          console.log('\n📄 Raw sample preview:')
          console.log(buffer.substring(0, 2000))
        }
      } else {
        console.error('❌ Could not find JSON array structure')
      }
    })
    
    readStream.on('error', (error) => {
      console.error('❌ Error reading file:', error)
    })
    
  } catch (err) {
    console.error('❌ Error reading Frida data:', err)
  }
}

readFridaSample().catch(console.error) 