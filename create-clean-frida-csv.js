/**
 * Create a clean CSV that matches the exact Supabase table structure
 */

const XLSX = require('xlsx');
const fs = require('fs');

// Simple CSV parser that handles quoted values properly
function parseCSV(content) {
  const lines = content.split('\n');
  const result = [];
  
  for (let i = 0; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    
    const row = [];
    let current = '';
    let inQuotes = false;
    
    for (let j = 0; j < lines[i].length; j++) {
      const char = lines[i][j];
      
      if (char === '"' && (j === 0 || lines[i][j-1] === ',')) {
        inQuotes = true;
      } else if (char === '"' && inQuotes && (j === lines[i].length - 1 || lines[i][j+1] === ',')) {
        inQuotes = false;
      } else if (char === ',' && !inQuotes) {
        row.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    row.push(current.trim());
    result.push(row);
  }
  
  return result;
}

function createCleanFridaCSV() {
  try {
    console.log('🔄 Creating clean CSV for Supabase upload...');
    
    // Convert Excel to CSV first (just first 1000 rows for testing)
    const workbook = XLSX.readFile('Frida_Dataset_May2025.xlsx');
    const worksheet = workbook.Sheets['Data_Normalised'];
    const csv = XLSX.utils.sheet_to_csv(worksheet);
    
    // Parse the CSV
    const rows = parseCSV(csv);
    const headers = rows[0];
    
    console.log(`📋 Processing first 1000 rows for testing...`);
    
    // Convert to objects (limit to 1000 for testing)
    const rawData = [];
    for (let i = 1; i < Math.min(1001, rows.length); i++) {
      const row = {};
      headers.forEach((header, index) => {
        row[header] = rows[i][index] || '';
      });
      rawData.push(row);
    }
    
    console.log(`✅ Parsed ${rawData.length} rows`);
    
    // Group by food and aggregate nutrition
    const foodsMap = new Map();
    
    rawData.forEach((row) => {
      const foodId = row.FoodID;
      const foodNameEn = row.FoodName || '';
      const foodNameDa = row.FødevareNavn || '';
      const parameterName = row.ParameterName || row.ParameterNavn || '';
      const value = parseFloat(row.ResVal);
      
      if (!foodId || !parameterName) return;
      
      if (!foodsMap.has(foodId)) {
        foodsMap.set(foodId, {
          id: `frida-${foodId}`,
          name: foodNameEn || foodNameDa,
          category: 'andre',
          description: `${foodNameEn || foodNameDa} fra Frida DTU database`,
          calories: null,
          protein: null,
          carbs: null,
          fat: null,
          fiber: null,
          vitamins: {},
          minerals: {},
          source: 'frida_dtu',
          frida_id: foodId,
          is_active: true
        });
      }
      
      const food = foodsMap.get(foodId);
      
      if (isNaN(value) || value < 0) return;
      
      const paramLower = parameterName.toLowerCase();
      
      // Map nutrition parameters
      if (paramLower.includes('energy (kcal)')) {
        food.calories = Math.round(value * 100) / 100;
      } else if (paramLower === 'protein') {
        food.protein = Math.round(value * 100) / 100;
      } else if (paramLower.includes('carbohydrate by difference') || paramLower.includes('available carbohydrate')) {
        food.carbs = Math.round(value * 100) / 100;
      } else if (paramLower === 'fat') {
        food.fat = Math.round(value * 100) / 100;
      } else if (paramLower.includes('dietary fiber')) {
        food.fiber = Math.round(value * 100) / 100;
      }
      
      // Vitamins
      else if (paramLower.includes('vitamin a')) {
        food.vitamins.A = Math.round(value * 100) / 100;
      } else if (paramLower.includes('vitamin c')) {
        food.vitamins.C = Math.round(value * 100) / 100;
      } else if (paramLower.includes('vitamin d')) {
        food.vitamins.D = Math.round(value * 100) / 100;
      } else if (paramLower.includes('vitamin e')) {
        food.vitamins.E = Math.round(value * 100) / 100;
      } else if (paramLower.includes('thiamin')) {
        food.vitamins.B1 = Math.round(value * 1000) / 1000;
      } else if (paramLower.includes('riboflavin')) {
        food.vitamins.B2 = Math.round(value * 1000) / 1000;
      } else if (paramLower.includes('niacin')) {
        food.vitamins.B3 = Math.round(value * 100) / 100;
      } else if (paramLower.includes('folate')) {
        food.vitamins.Folate = Math.round(value * 100) / 100;
      }
      
      // Minerals  
      else if (paramLower.includes('calcium')) {
        food.minerals.calcium = Math.round(value);
      } else if (paramLower.includes('iron')) {
        food.minerals.iron = Math.round(value * 100) / 100;
      } else if (paramLower.includes('magnesium')) {
        food.minerals.magnesium = Math.round(value);
      } else if (paramLower.includes('phosphorus')) {
        food.minerals.phosphor = Math.round(value);
      } else if (paramLower.includes('potassium')) {
        food.minerals.potassium = Math.round(value);
      } else if (paramLower.includes('sodium')) {
        food.minerals.sodium = Math.round(value);
      } else if (paramLower.includes('zinc')) {
        food.minerals.zinc = Math.round(value * 100) / 100;
      } else if (paramLower.includes('selenium')) {
        food.minerals.selenium = Math.round(value * 100) / 100;
      }
    });
    
    // Convert to array
    const ingredients = Array.from(foodsMap.values());
    console.log(`✅ Processed ${ingredients.length} unique foods`);
    
    // Create CSV matching EXACT Supabase table structure
    const csvLines = [
      // Header that matches the table exactly
      'id,name,category,description,calories,protein,carbs,fat,fiber,vitamins,minerals,source,frida_id,is_active'
    ];
    
    ingredients.forEach(ing => {
      // Format vitamins and minerals as proper JSON (escaped for CSV)
      const vitaminsJson = JSON.stringify(ing.vitamins).replace(/"/g, '""');
      const mineralsJson = JSON.stringify(ing.minerals).replace(/"/g, '""');
      
      // Create clean CSV line
      const line = [
        ing.id,
        ing.name.replace(/"/g, '""'),
        ing.category,
        ing.description.replace(/"/g, '""'),
        ing.calories || '',
        ing.protein || '',
        ing.carbs || '',
        ing.fat || '',
        ing.fiber || '',
        `"${vitaminsJson}"`,
        `"${mineralsJson}"`,
        ing.source,
        ing.frida_id,
        ing.is_active
      ];
      
      csvLines.push(line.join(','));
    });
    
    // Write clean CSV
    const cleanContent = csvLines.join('\n');
    fs.writeFileSync('frida_ingredients_clean.csv', cleanContent);
    
    console.log(`✅ Created frida_ingredients_clean.csv`);
    console.log(`📊 Contains ${ingredients.length} ingredients with proper JSON formatting`);
    
    // Show sample
    console.log('\n📋 Sample lines:');
    csvLines.slice(0, 3).forEach(line => {
      console.log(line.substring(0, 120) + '...');
    });
    
    return ingredients.length;
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  }
}

// Run it
try {
  const count = createCleanFridaCSV();
  console.log(`\n🎉 Ready to upload! ${count} ingredients in clean format`);
} catch (error) {
  console.error('💥 Failed:', error);
}