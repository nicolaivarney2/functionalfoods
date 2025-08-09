/**
 * Prepare Full Frida DTU Database for Supabase Upload
 * This script processes all 130k+ Frida ingredients and prepares them for upload
 */

const fs = require('fs')
const path = require('path')

// Configuration
const INPUT_FILES = {
  // Update these paths to your actual Frida files
  FOODS: './frida_foods.csv',                    // Main foods database  
  NUTRITION: './frida_nutrition_values.csv',     // Nutritional values
  // Add more files as needed
}

const OUTPUT_FILE = './frida-for-supabase.json'
const BATCH_SIZE = 1000 // Upload in batches of 1000

class FridaDataProcessor {
  constructor() {
    this.processedIngredients = new Map()
    this.categories = new Set()
    this.duplicates = new Set()
  }

  /**
   * Main processing function
   */
  async processAllData() {
    console.log('🔄 Starting Frida data processing...')
    
    try {
      // Step 1: Load and parse foods
      console.log('📋 Step 1: Loading foods database...')
      await this.loadFoodsDatabase()
      
      // Step 2: Load and merge nutrition data
      console.log('🥗 Step 2: Loading nutrition values...')
      await this.loadNutritionData()
      
      // Step 3: Clean and normalize
      console.log('🧹 Step 3: Cleaning and normalizing data...')
      this.cleanAndNormalize()
      
      // Step 4: Generate upload files
      console.log('📦 Step 4: Generating upload files...')
      this.generateUploadFiles()
      
      // Step 5: Generate statistics
      console.log('📊 Step 5: Generating statistics...')
      this.generateStatistics()
      
      console.log('✅ Processing complete!')
      
    } catch (error) {
      console.error('❌ Error during processing:', error)
      throw error
    }
  }

  /**
   * Load the main foods database
   */
  async loadFoodsDatabase() {
    if (!fs.existsSync(INPUT_FILES.FOODS)) {
      throw new Error(`Foods file not found: ${INPUT_FILES.FOODS}`)
    }

    const csvData = fs.readFileSync(INPUT_FILES.FOODS, 'utf-8')
    const lines = csvData.split('\n')
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
    
    console.log(`📝 Found ${lines.length - 1} food entries`)
    console.log(`📋 Headers: ${headers.join(', ')}`)

    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue
      
      try {
        const values = this.parseCSVLine(lines[i])
        if (values.length !== headers.length) continue
        
        const food = {}
        headers.forEach((header, index) => {
          food[header] = values[index]
        })
        
        // Create standardized ingredient entry
        const ingredient = this.createStandardizedIngredient(food, 'food')
        if (ingredient) {
          this.processedIngredients.set(ingredient.id, ingredient)
        }
        
      } catch (error) {
        console.warn(`⚠️ Error processing line ${i}:`, error.message)
      }
    }
    
    console.log(`✅ Processed ${this.processedIngredients.size} food ingredients`)
  }

  /**
   * Load nutrition values and merge with foods
   */
  async loadNutritionData() {
    if (!fs.existsSync(INPUT_FILES.NUTRITION)) {
      console.warn(`⚠️ Nutrition file not found: ${INPUT_FILES.NUTRITION}`)
      return
    }

    const csvData = fs.readFileSync(INPUT_FILES.NUTRITION, 'utf-8')
    const lines = csvData.split('\n')
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
    
    console.log(`📝 Found ${lines.length - 1} nutrition entries`)

    let mergedCount = 0
    
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue
      
      try {
        const values = this.parseCSVLine(lines[i])
        if (values.length !== headers.length) continue
        
        const nutrition = {}
        headers.forEach((header, index) => {
          nutrition[header] = values[index]
        })
        
        // Find matching food and merge nutrition data
        const foodId = this.findMatchingFoodId(nutrition)
        if (foodId && this.processedIngredients.has(foodId)) {
          this.mergeNutritionData(foodId, nutrition)
          mergedCount++
        }
        
      } catch (error) {
        console.warn(`⚠️ Error processing nutrition line ${i}:`, error.message)
      }
    }
    
    console.log(`✅ Merged nutrition data for ${mergedCount} ingredients`)
  }

  /**
   * Create standardized ingredient entry
   */
  createStandardizedIngredient(rawData, source) {
    // Extract name (adjust field names based on your CSV structure)
    const name = rawData['FoodName'] || rawData['name'] || rawData['Name'] || ''
    if (!name || name.trim() === '') return null
    
    // Generate unique ID
    const id = this.generateIngredientId(name)
    
    // Determine category
    const category = this.determineCategory(rawData)
    
    // Create standardized structure
    return {
      id,
      name: name.trim(),
      category,
      description: `${name.trim()} fra Frida DTU database`,
      
      // Nutritional data (will be filled from nutrition file)
      calories: null,
      protein: null,
      carbs: null,
      fat: null,
      fiber: null,
      
      // Vitamins (per 100g)
      vitamins: {},
      
      // Minerals (per 100g)  
      minerals: {},
      
      // Metadata
      source,
      fridaId: rawData['FoodID'] || rawData['id'] || null,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      
      // Additional fields for matching
      normalizedName: this.normalizeForMatching(name),
      searchTerms: this.generateSearchTerms(name),
      exclusions: [],
      allergens: [],
      commonNames: []
    }
  }

  /**
   * Parse CSV line handling quoted values
   */
  parseCSVLine(line) {
    const values = []
    let current = ''
    let inQuotes = false
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      
      if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }
    
    values.push(current.trim())
    return values.map(v => v.replace(/"/g, ''))
  }

  /**
   * Generate unique ingredient ID
   */
  generateIngredientId(name) {
    const normalized = name.toLowerCase()
      .replace(/[^a-zæøå0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
    
    return `frida-${normalized}-${Date.now()}`
  }

  /**
   * Determine ingredient category
   */
  determineCategory(rawData) {
    // Map Frida categories to our categories
    const categoryMapping = {
      'meat': 'kød',
      'fish': 'fisk',
      'dairy': 'mejeriprodukter',
      'vegetables': 'grøntsager',
      'fruits': 'frugt',
      'nuts': 'nødder',
      'grains': 'kornprodukter',
      'oils': 'fedtstoffer',
      'spices': 'krydderier'
    }
    
    // Try to extract category from Frida data
    const fridaCategory = rawData['Category'] || rawData['category'] || rawData['FoodGroup'] || ''
    
    // Map to our categories or use 'andre' as default
    for (const [eng, dan] of Object.entries(categoryMapping)) {
      if (fridaCategory.toLowerCase().includes(eng)) {
        return dan
      }
    }
    
    return 'andre'
  }

  /**
   * Normalize name for matching
   */
  normalizeForMatching(name) {
    return name.toLowerCase()
      .replace(/[,\.]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
  }

  /**
   * Generate search terms for better matching
   */
  generateSearchTerms(name) {
    const terms = new Set()
    
    // Add original name
    terms.add(name.toLowerCase())
    
    // Add without commas and periods
    terms.add(name.replace(/[,\.]/g, '').toLowerCase())
    
    // Add individual words
    name.split(/[\s,]+/).forEach(word => {
      if (word.length > 2) {
        terms.add(word.toLowerCase())
      }
    })
    
    return Array.from(terms)
  }

  /**
   * Find matching food ID for nutrition data
   */
  findMatchingFoodId(nutrition) {
    // This depends on your data structure
    // You might match by FoodID, name, or other identifier
    const fridaId = nutrition['FoodID'] || nutrition['id']
    
    for (const [id, ingredient] of this.processedIngredients) {
      if (ingredient.fridaId === fridaId) {
        return id
      }
    }
    
    return null
  }

  /**
   * Merge nutrition data into ingredient
   */
  mergeNutritionData(ingredientId, nutrition) {
    const ingredient = this.processedIngredients.get(ingredientId)
    if (!ingredient) return
    
    // Map nutrition fields (adjust based on your CSV structure)
    ingredient.calories = this.parseNumeric(nutrition['Energy_kcal'] || nutrition['calories'])
    ingredient.protein = this.parseNumeric(nutrition['Protein'] || nutrition['protein'])
    ingredient.carbs = this.parseNumeric(nutrition['Carbohydrates'] || nutrition['carbs'])
    ingredient.fat = this.parseNumeric(nutrition['Fat'] || nutrition['fat'])
    ingredient.fiber = this.parseNumeric(nutrition['Fiber'] || nutrition['fiber'])
    
    // Vitamins
    const vitaminFields = {
      'A': nutrition['VitaminA'] || nutrition['vitamin_a'],
      'C': nutrition['VitaminC'] || nutrition['vitamin_c'],
      'D': nutrition['VitaminD'] || nutrition['vitamin_d'],
      'E': nutrition['VitaminE'] || nutrition['vitamin_e'],
      'B1': nutrition['Thiamine'] || nutrition['vitamin_b1'],
      'B2': nutrition['Riboflavin'] || nutrition['vitamin_b2'],
      'B3': nutrition['Niacin'] || nutrition['vitamin_b3'],
      'B6': nutrition['VitaminB6'] || nutrition['vitamin_b6'],
      'B12': nutrition['VitaminB12'] || nutrition['vitamin_b12'],
      'Folate': nutrition['Folate'] || nutrition['folate']
    }
    
    for (const [vitamin, value] of Object.entries(vitaminFields)) {
      const numValue = this.parseNumeric(value)
      if (numValue !== null) {
        ingredient.vitamins[vitamin] = numValue
      }
    }
    
    // Minerals
    const mineralFields = {
      'calcium': nutrition['Calcium'] || nutrition['calcium'],
      'iron': nutrition['Iron'] || nutrition['iron'],
      'magnesium': nutrition['Magnesium'] || nutrition['magnesium'],
      'phosphor': nutrition['Phosphorus'] || nutrition['phosphor'],
      'potassium': nutrition['Potassium'] || nutrition['potassium'],
      'sodium': nutrition['Sodium'] || nutrition['sodium'],
      'zinc': nutrition['Zinc'] || nutrition['zinc']
    }
    
    for (const [mineral, value] of Object.entries(mineralFields)) {
      const numValue = this.parseNumeric(value)
      if (numValue !== null) {
        ingredient.minerals[mineral] = numValue
      }
    }
  }

  /**
   * Parse numeric value safely
   */
  parseNumeric(value) {
    if (!value || value === '' || value === 'N/A') return null
    const num = parseFloat(value)
    return isNaN(num) ? null : num
  }

  /**
   * Clean and normalize data
   */
  cleanAndNormalize() {
    console.log('🧹 Removing duplicates and invalid entries...')
    
    const validIngredients = new Map()
    const namesSeen = new Set()
    
    for (const [id, ingredient] of this.processedIngredients) {
      // Skip if no name
      if (!ingredient.name || ingredient.name.trim() === '') continue
      
      // Check for duplicates by normalized name
      const normalizedName = ingredient.normalizedName
      if (namesSeen.has(normalizedName)) {
        this.duplicates.add(ingredient.name)
        continue
      }
      
      namesSeen.add(normalizedName)
      validIngredients.set(id, ingredient)
      this.categories.add(ingredient.category)
    }
    
    this.processedIngredients = validIngredients
    
    console.log(`✅ Cleaned data: ${validIngredients.size} valid ingredients`)
    console.log(`🗑️ Removed ${this.duplicates.size} duplicates`)
    console.log(`📂 Found ${this.categories.size} categories: ${Array.from(this.categories).join(', ')}`)
  }

  /**
   * Generate upload files
   */
  generateUploadFiles() {
    const allIngredients = Array.from(this.processedIngredients.values())
    
    // Save complete dataset
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(allIngredients, null, 2))
    console.log(`💾 Saved complete dataset: ${OUTPUT_FILE} (${allIngredients.length} ingredients)`)
    
    // Create batched files for easier upload
    const batchDir = './frida-upload-batches/'
    if (!fs.existsSync(batchDir)) {
      fs.mkdirSync(batchDir)
    }
    
    for (let i = 0; i < allIngredients.length; i += BATCH_SIZE) {
      const batch = allIngredients.slice(i, i + BATCH_SIZE)
      const batchNumber = Math.floor(i / BATCH_SIZE) + 1
      const batchFile = path.join(batchDir, `batch-${batchNumber.toString().padStart(3, '0')}.json`)
      
      fs.writeFileSync(batchFile, JSON.stringify(batch, null, 2))
      console.log(`📦 Created batch ${batchNumber}: ${batch.length} ingredients`)
    }
    
    // Create upload instructions
    this.createUploadInstructions(Math.ceil(allIngredients.length / BATCH_SIZE))
  }

  /**
   * Create upload instructions for user
   */
  createUploadInstructions(batchCount) {
    const instructions = `
# Frida Database Upload Instructions

## 📊 Data Summary
- Total ingredients: ${this.processedIngredients.size}
- Categories: ${this.categories.size}
- Batches created: ${batchCount}
- Batch size: ${BATCH_SIZE} ingredients each

## 📂 Files Created
1. \`${OUTPUT_FILE}\` - Complete dataset (for reference)
2. \`./frida-upload-batches/\` - Batched files for upload

## 🚀 Upload Process

### Step 1: Prepare Supabase Table
Make sure your Supabase table has these columns:
- id (text, primary key)
- name (text)
- category (text)
- description (text)
- calories (numeric)
- protein (numeric)
- carbs (numeric)
- fat (numeric)
- fiber (numeric)
- vitamins (jsonb)
- minerals (jsonb)
- source (text)
- frida_id (text)
- is_active (boolean)
- created_at (timestamp)
- updated_at (timestamp)
- normalized_name (text)
- search_terms (text[])
- exclusions (text[])
- allergens (text[])
- common_names (text[])

### Step 2: Upload Batches
Upload each batch file to Supabase using:
1. Supabase Dashboard (for smaller batches)
2. SQL INSERT statements (for larger batches)
3. Node.js script with Supabase client

### Step 3: Verify Upload
After upload, verify with:
\`SELECT COUNT(*) FROM ingredients WHERE source = 'food';\`

Expected result: ${this.processedIngredients.size} rows

## 🔧 SQL Upload Example
\`\`\`sql
-- For each batch file, convert JSON to INSERT statements
-- Use a tool like jq or custom script to convert JSON to SQL
\`\`\`

## 📞 Next Steps
1. Review the generated files
2. Upload to Supabase (ask for help if needed)
3. Test the ingredient matching system
4. Update recipe import to use new matching system
`

    fs.writeFileSync('./FRIDA_UPLOAD_INSTRUCTIONS.md', instructions)
    console.log('📋 Created upload instructions: FRIDA_UPLOAD_INSTRUCTIONS.md')
  }

  /**
   * Generate statistics
   */
  generateStatistics() {
    const stats = {
      totalIngredients: this.processedIngredients.size,
      categoriesFound: Array.from(this.categories),
      duplicatesRemoved: this.duplicates.size,
      
      // Nutrition data completeness
      withCalories: 0,
      withProtein: 0,
      withVitamins: 0,
      withMinerals: 0
    }
    
    for (const ingredient of this.processedIngredients.values()) {
      if (ingredient.calories !== null) stats.withCalories++
      if (ingredient.protein !== null) stats.withProtein++
      if (Object.keys(ingredient.vitamins).length > 0) stats.withVitamins++
      if (Object.keys(ingredient.minerals).length > 0) stats.withMinerals++
    }
    
    console.log('\n📊 Final Statistics:')
    console.log(`   • Total ingredients: ${stats.totalIngredients}`)
    console.log(`   • Categories: ${stats.categoriesFound.length}`)
    console.log(`   • Duplicates removed: ${stats.duplicatesRemoved}`)
    console.log(`   • With calories: ${stats.withCalories} (${Math.round(stats.withCalories/stats.totalIngredients*100)}%)`)
    console.log(`   • With protein: ${stats.withProtein} (${Math.round(stats.withProtein/stats.totalIngredients*100)}%)`)
    console.log(`   • With vitamins: ${stats.withVitamins} (${Math.round(stats.withVitamins/stats.totalIngredients*100)}%)`)
    console.log(`   • With minerals: ${stats.withMinerals} (${Math.round(stats.withMinerals/stats.totalIngredients*100)}%)`)
    
    fs.writeFileSync('./frida-processing-stats.json', JSON.stringify(stats, null, 2))
  }
}

// Main execution
async function main() {
  console.log('🍽️ Frida DTU Database Processor')
  console.log('================================')
  
  // Check if input files exist
  let hasFiles = false
  for (const [name, path] of Object.entries(INPUT_FILES)) {
    if (fs.existsSync(path)) {
      console.log(`✅ Found ${name}: ${path}`)
      hasFiles = true
    } else {
      console.log(`❌ Missing ${name}: ${path}`)
    }
  }
  
  if (!hasFiles) {
    console.log('\n⚠️ No Frida CSV files found!')
    console.log('\n📋 To use this script:')
    console.log('   1. Download Frida DTU CSV files')
    console.log('   2. Place them in the project root:')
    console.log('      • frida_foods.csv')
    console.log('      • frida_nutrition_values.csv')
    console.log('   3. Run this script again')
    return
  }
  
  const processor = new FridaDataProcessor()
  await processor.processAllData()
  
  console.log('\n🎉 Processing complete!')
  console.log('👀 Check FRIDA_UPLOAD_INSTRUCTIONS.md for next steps')
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error)
}

module.exports = { FridaDataProcessor }