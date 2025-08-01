const fs = require('fs')
const path = require('path')
const { downloadBulkImages } = require('../src/lib/image-downloader')

async function downloadExistingImages() {
  try {
    console.log('Loading existing recipes...')
    
    // Load imported recipes
    const importedRecipesPath = path.join(process.cwd(), 'data', 'imported-recipes.json')
    if (!fs.existsSync(importedRecipesPath)) {
      console.log('No imported recipes found.')
      return
    }
    
    const importedRecipes = JSON.parse(fs.readFileSync(importedRecipesPath, 'utf8'))
    console.log(`Found ${importedRecipes.length} imported recipes`)
    
    // Download images for imported recipes
    console.log('Downloading images for imported recipes...')
    const updatedRecipes = await downloadBulkImages(importedRecipes)
    
    // Save updated recipes back to file
    fs.writeFileSync(importedRecipesPath, JSON.stringify(updatedRecipes, null, 2))
    
    console.log('✅ Successfully downloaded images for all recipes')
    console.log('Updated recipes saved to data/imported-recipes.json')
    
  } catch (error) {
    console.error('❌ Error downloading images:', error)
  }
}

// Run the script
downloadExistingImages() 