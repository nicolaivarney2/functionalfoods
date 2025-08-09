/**
 * Better CSV parsing for Frida data with proper handling of quoted values
 */

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

function transformFridaDataBetter() {
  try {
    console.log('🔄 Better parsing of Frida data...');
    
    // Read raw CSV
    const csvContent = fs.readFileSync('frida_sample_1000.csv', 'utf8');
    const rows = parseCSV(csvContent);
    
    if (rows.length === 0) {
      throw new Error('No data found in CSV');
    }
    
    const headers = rows[0];
    console.log('📋 Headers:', headers);
    
    // Convert to objects
    const rawData = [];
    for (let i = 1; i < rows.length; i++) {
      const row = {};
      headers.forEach((header, index) => {
        row[header] = rows[i][index] || '';
      });
      rawData.push(row);
    }
    
    console.log(`✅ Parsed ${rawData.length} rows`);
    console.log('📋 Sample row:', rawData[0]);
    
    // Group by food and aggregate nutrition
    const foodsMap = new Map();
    
    rawData.forEach(row => {
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
          name_da: foodNameDa,
          name_en: foodNameEn,
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
      
      if (isNaN(value) || value < 0) return; // Skip invalid values
      
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
      } else if (paramLower.includes('dietary fiber') || paramLower.includes('dietary fibre')) {
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
      } else if (paramLower.includes('thiamin') || paramLower.includes('vitamin b-1')) {
        food.vitamins.B1 = Math.round(value * 1000) / 1000;
      } else if (paramLower.includes('riboflavin') || paramLower.includes('vitamin b-2')) {
        food.vitamins.B2 = Math.round(value * 1000) / 1000;
      } else if (paramLower.includes('niacin')) {
        food.vitamins.B3 = Math.round(value * 100) / 100;
      } else if (paramLower.includes('vitamin b-6')) {
        food.vitamins.B6 = Math.round(value * 1000) / 1000;
      } else if (paramLower.includes('vitamin b-12')) {
        food.vitamins.B12 = Math.round(value * 1000) / 1000;
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
    
    // Convert to array and improve categories
    const ingredients = Array.from(foodsMap.values()).map(food => {
      const nameLower = food.name.toLowerCase();
      
      // Better category mapping
      if (nameLower.includes('strawberry') || nameLower.includes('jordbær') || 
          nameLower.includes('apple') || nameLower.includes('æble') || 
          nameLower.includes('banana') || nameLower.includes('banan')) {
        food.category = 'frugt';
      } else if (nameLower.includes('potato') || nameLower.includes('kartoffel')) {
        food.category = 'grøntsager';
      } else if (nameLower.includes('milk') || nameLower.includes('mælk')) {
        food.category = 'mejeriprodukter';
      }
      
      return food;
    });
    
    console.log(`✅ Transformed to ${ingredients.length} unique foods`);
    
    // Show better sample
    console.log('\n📋 Sample ingredients:');
    ingredients.slice(0, 5).forEach(ing => {
      console.log(`   ${ing.name} (${ing.category}): ${ing.calories || 'N/A'} kcal, ${ing.protein || 'N/A'}g protein`);
    });
    
    // Save as better JSON
    fs.writeFileSync('frida_ingredients_better.json', JSON.stringify(ingredients, null, 2));
    console.log('✅ Saved as frida_ingredients_better.json');
    
    // Create simple CSV for Supabase
    const simpleCsv = [
      'id,name,category,description,calories,protein,carbs,fat,fiber,vitamins,minerals,source,frida_id,is_active',
      ...ingredients.map(ing => 
        `"${ing.id}","${ing.name}","${ing.category}","${ing.description}",${ing.calories||'NULL'},${ing.protein||'NULL'},${ing.carbs||'NULL'},${ing.fat||'NULL'},${ing.fiber||'NULL'},"${JSON.stringify(ing.vitamins).replace(/"/g, "'")}","${JSON.stringify(ing.minerals).replace(/"/g, "'")}","${ing.source}","${ing.frida_id}",${ing.is_active}`
      )
    ].join('\n');
    
    fs.writeFileSync('frida_ingredients_simple.csv', simpleCsv);
    console.log('✅ Saved as frida_ingredients_simple.csv');
    
    return ingredients;
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  }
}

// Run it
try {
  const ingredients = transformFridaDataBetter();
  
  console.log('\n🎉 Better parsing completed!');
  console.log('\n📋 Files created:');
  console.log('   • frida_ingredients_better.json (for review)');
  console.log('   • frida_ingredients_simple.csv (for Supabase upload)');
  console.log('\n📋 Upload frida_ingredients_simple.csv to Supabase frida_ingredients table');
  
} catch (error) {
  console.error('💥 Failed:', error);
}