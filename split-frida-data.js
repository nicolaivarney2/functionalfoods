const fs = require('fs')

async function splitFridaData() {
  try {
    console.log('📊 Splitting large Frida data into smaller chunks...')
    
    const fridaData = JSON.parse(fs.readFileSync('public/frida-nutritional-data.json', 'utf8'))
    console.log(`📋 Total entries: ${fridaData.length}`)
    
    // Split into chunks of 1000 entries each
    const chunkSize = 1000
    const chunks = []
    
    for (let i = 0; i < fridaData.length; i += chunkSize) {
      chunks.push(fridaData.slice(i, i + chunkSize))
    }
    
    console.log(`🔢 Created ${chunks.length} chunks of max ${chunkSize} entries`)
    
    // Save chunks
    if (!fs.existsSync('public/frida-chunks')) {
      fs.mkdirSync('public/frida-chunks')
    }
    
    chunks.forEach((chunk, index) => {
      const filename = `public/frida-chunks/chunk-${index.toString().padStart(3, '0')}.json`
      fs.writeFileSync(filename, JSON.stringify(chunk))
      console.log(`💾 Saved ${filename} (${chunk.length} entries, ${(fs.statSync(filename).size / 1024).toFixed(1)}KB)`)
    })
    
    // Create index file
    const index = {
      totalChunks: chunks.length,
      totalEntries: fridaData.length,
      chunkSize: chunkSize,
      chunks: chunks.map((chunk, i) => ({
        id: i,
        filename: `chunk-${i.toString().padStart(3, '0')}.json`,
        entries: chunk.length,
        firstEntry: chunk[0]?.Name || 'Unknown',
        lastEntry: chunk[chunk.length - 1]?.Name || 'Unknown'
      }))
    }
    
    fs.writeFileSync('public/frida-chunks/index.json', JSON.stringify(index, null, 2))
    console.log(`📋 Created index.json with ${chunks.length} chunk references`)
    
    console.log('✅ Frida data split completed!')
    console.log('🗑️ You can now delete the large frida-nutritional-data.json file')
    
  } catch (error) {
    console.error('❌ Error splitting Frida data:', error)
  }
}

splitFridaData()