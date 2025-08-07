const fs = require('fs')

async function analyzeFridaData() {
  console.log('🔍 Analyzing Frida nutritional data structure...')
  
  try {
    // Read just the first part of the file to understand structure
    const stream = fs.createReadStream('frida-nutritional-data.json', { 
      encoding: 'utf8',
      start: 0,
      end: 10000 // Read first 10KB
    })
    
    let data = ''
    stream.on('data', chunk => {
      data += chunk
    })
    
    stream.on('end', () => {
      try {
        // Try to parse as much as we can
        const jsonStart = data.indexOf('[')
        const jsonEnd = data.lastIndexOf(']') + 1
        const jsonData = data.substring(jsonStart, jsonEnd)
        
        const parsed = JSON.parse(jsonData)
        console.log('✅ Successfully parsed Frida data structure')
        console.log(`📊 Total items: ${parsed.length}`)
        
        if (parsed.length > 0) {
          console.log('\n📋 Sample item structure:')
          console.log(JSON.stringify(parsed[0], null, 2))
          
          // Analyze the structure
          const sample = parsed[0]
          console.log('\n🔍 Available fields:')
          Object.keys(sample).forEach(key => {
            console.log(`  - ${key}: ${typeof sample[key]} (${Array.isArray(sample[key]) ? 'array' : typeof sample[key]})`)
          })
          
          // Look for nutritional fields
          const nutritionalFields = Object.keys(sample).filter(key => 
            key.toLowerCase().includes('nutrition') || 
            key.toLowerCase().includes('calorie') || 
            key.toLowerCase().includes('protein') || 
            key.toLowerCase().includes('fat') || 
            key.toLowerCase().includes('carb') ||
            key.toLowerCase().includes('fiber') ||
            key.toLowerCase().includes('vitamin') ||
            key.toLowerCase().includes('mineral')
          )
          
          console.log('\n🍎 Nutritional fields found:')
          nutritionalFields.forEach(field => {
            console.log(`  - ${field}: ${typeof sample[field]}`)
          })
          
          // Look for ingredient name fields
          const nameFields = Object.keys(sample).filter(key => 
            key.toLowerCase().includes('name') || 
            key.toLowerCase().includes('title') || 
            key.toLowerCase().includes('food') ||
            key.toLowerCase().includes('ingredient')
          )
          
          console.log('\n🏷️  Name/identifier fields found:')
          nameFields.forEach(field => {
            console.log(`  - ${field}: ${typeof sample[field]}`)
          })
        }
        
      } catch (parseError) {
        console.error('❌ Error parsing JSON:', parseError.message)
        console.log('\n📄 Raw data preview:')
        console.log(data.substring(0, 1000))
      }
    })
    
    stream.on('error', (error) => {
      console.error('❌ Error reading file:', error)
    })
    
  } catch (err) {
    console.error('❌ Error analyzing Frida data:', err)
  }
}

analyzeFridaData().catch(console.error) 