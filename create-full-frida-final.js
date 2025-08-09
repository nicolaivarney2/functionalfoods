/**
 * Create the FULL Frida dataset with proper JSON formatting
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

function createFullFridaFinal() {
  try {
    console.log('🔄 Creating FULL Frida dataset with vitamins/minerals...');
    
    // Convert Excel to CSV first (FULL dataset)
    const workbook = XLSX.readFile('Frida_Dataset_May2025.xlsx');
    const worksheet = workbook.Sheets['Data_Normalised'];
    const csv = XLSX.utils.sheet_to_csv(worksheet);
    
    // Parse the full CSV
    const rows = parseCSV(csv);
    const headers = rows[0];
    
    console.log(`📋 Processing ${rows.length - 1} rows...`);
    
    // Convert to objects
    const rawData = [];
    for (let i = 1; i < rows.length; i++) {
      if (i % 20000 === 0) {
        console.log(`   Processed ${i}/${rows.length} rows (${Math.round(i/(rows.length)*100)}%)`);
      }
      
      const row = {};
      headers.forEach((header, index) => {
        row[header] = rows[i][index] || '';
      });
      rawData.push(row);
    }
    
    console.log(`✅ Parsed ${rawData.length} rows`);
    
    // Group by food and aggregate nutrition
    const foodsMap = new Map();
    
    rawData.forEach((row, index) => {
      if (index % 30000 === 0) {
        console.log(`   Aggregating: ${index}/${rawData.length} (${Math.round(index/rawData.length*100)}%)`);
      }
      
      const foodId = row.FoodID;
      const foodNameEn = row.FoodName || '';
      const foodNameDa = row.FødevareNavn || '';
      const parameterName = row.ParameterName || row.ParameterNavn || '';
      const value = parseFloat(row.ResVal);
      
      if (!foodId || !parameterName) return;
      
      if (!foodsMap.has(foodId)) {
        foodsMap.set(foodId, {
          id: `frida-${foodId}`,
          name: (foodNameEn || foodNameDa).replace(/"/g, ''),
          category: 'andre',
          description: `${foodNameEn || foodNameDa} fra Frida DTU database`.replace(/"/g, ''),
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
    
    console.log('🏷️ Categorizing foods...');
    
    // Convert to array and improve categories
    const ingredients = Array.from(foodsMap.values()).map(food => {
      const nameLower = food.name.toLowerCase();
      
      // Enhanced category mapping
      if (nameLower.includes('strawberry') || nameLower.includes('jordbær') || 
          nameLower.includes('apple') || nameLower.includes('æble') || 
          nameLower.includes('banana') || nameLower.includes('banan') ||
          nameLower.includes('berry') || nameLower.includes('bær') ||
          nameLower.includes('fruit') || nameLower.includes('frugt') ||
          nameLower.includes('orange') || nameLower.includes('appelsin') ||
          nameLower.includes('grape') || nameLower.includes('drue') ||
          nameLower.includes('pear') || nameLower.includes('pære')) {
        food.category = 'frugt';
      } else if (nameLower.includes('potato') || nameLower.includes('kartoffel') ||
                 nameLower.includes('carrot') || nameLower.includes('gulerod') ||
                 nameLower.includes('onion') || nameLower.includes('løg') ||
                 nameLower.includes('tomato') || nameLower.includes('tomat') ||
                 nameLower.includes('pepper') || nameLower.includes('peber') ||
                 nameLower.includes('lettuce') || nameLower.includes('salat') ||
                 nameLower.includes('spinach') || nameLower.includes('spinat') ||
                 nameLower.includes('cabbage') || nameLower.includes('kål') ||
                 nameLower.includes('vegetable') || nameLower.includes('grøntsag')) {
        food.category = 'grøntsager';
      } else if (nameLower.includes('milk') || nameLower.includes('mælk') ||
                 nameLower.includes('cheese') || nameLower.includes('ost') ||
                 nameLower.includes('yogurt') || nameLower.includes('yoghurt') ||
                 nameLower.includes('cream') || nameLower.includes('fløde') ||
                 nameLower.includes('butter') || nameLower.includes('smør')) {
        food.category = 'mejeriprodukter';
      } else if (nameLower.includes('beef') || nameLower.includes('oksekød') ||
                 nameLower.includes('pork') || nameLower.includes('svinekød') ||
                 nameLower.includes('chicken') || nameLower.includes('kylling') ||
                 nameLower.includes('turkey') || nameLower.includes('kalkun') ||
                 nameLower.includes('lamb') || nameLower.includes('lam') ||
                 nameLower.includes('meat') || nameLower.includes('kød')) {
        food.category = 'kød';
      } else if (nameLower.includes('fish') || nameLower.includes('fisk') ||
                 nameLower.includes('salmon') || nameLower.includes('laks') ||
                 nameLower.includes('cod') || nameLower.includes('torsk') ||
                 nameLower.includes('tuna') || nameLower.includes('tune') ||
                 nameLower.includes('mackerel') || nameLower.includes('makrel')) {
        food.category = 'fisk';
      } else if (nameLower.includes('oil') || nameLower.includes('olie') ||
                 nameLower.includes('fat') || nameLower.includes('fedt')) {
        food.category = 'fedtstoffer';
      } else if (nameLower.includes('almond') || nameLower.includes('mandel') ||
                 nameLower.includes('walnut') || nameLower.includes('valnød') ||
                 nameLower.includes('peanut') || nameLower.includes('jordnød') ||
                 nameLower.includes('hazelnut') || nameLower.includes('hasselnød') ||
                 nameLower.includes('nuts') || nameLower.includes('nødder')) {
        food.category = 'nødder';
      } else if (nameLower.includes('bread') || nameLower.includes('brød') ||
                 nameLower.includes('flour') || nameLower.includes('mel') ||
                 nameLower.includes('rice') || nameLower.includes('ris') ||
                 nameLower.includes('pasta') || nameLower.includes('pasta') ||
                 nameLower.includes('cereal') || nameLower.includes('morgenmad') ||
                 nameLower.includes('oats') || nameLower.includes('havre')) {
        food.category = 'kornprodukter';
      } else if (nameLower.includes('beans') || nameLower.includes('bønner') ||
                 nameLower.includes('lentils') || nameLower.includes('linser') ||
                 nameLower.includes('peas') || nameLower.includes('ærter')) {
        food.category = 'bælgfrugter';
      }
      
      return food;
    });
    
    console.log(`✅ Processed ${ingredients.length} unique foods`);
    
    // Show category breakdown
    const categoryCount = {};
    ingredients.forEach(ing => {
      categoryCount[ing.category] = (categoryCount[ing.category] || 0) + 1;
    });
    
    console.log('\n📊 Category breakdown:');
    Object.entries(categoryCount).forEach(([cat, count]) => {
      console.log(`   ${cat}: ${count} foods`);
    });
    
    // Create batched CSV files with proper JSON formatting
    const batchSize = 200; // Smaller batches for easier upload
    const batches = [];
    
    for (let i = 0; i < ingredients.length; i += batchSize) {
      batches.push(ingredients.slice(i, i + batchSize));
    }
    
    console.log(`\n📦 Creating ${batches.length} batch files...`);
    
    batches.forEach((batch, index) => {
      const csvLines = [
        // Header that includes vitamins and minerals as JSONB
        'id,name,category,description,calories,protein,carbs,fat,fiber,vitamins,minerals,source,frida_id,is_active'
      ];
      
      batch.forEach(ing => {
        // Create clean CSV line with proper JSON escaping
        const vitaminsJson = JSON.stringify(ing.vitamins).replace(/"/g, '""');
        const mineralsJson = JSON.stringify(ing.minerals).replace(/"/g, '""');
        
        const csvLine = `${ing.id},"${ing.name}",${ing.category},"${ing.description}",${ing.calories||''},${ing.protein||''},${ing.carbs||''},${ing.fat||''},${ing.fiber||''},"${vitaminsJson}","${mineralsJson}",${ing.source},${ing.frida_id},${ing.is_active}`;
        csvLines.push(csvLine);
      });
      
      const filename = `frida_final_batch_${(index + 1).toString().padStart(2, '0')}.csv`;
      const csvContent = csvLines.join('\n');
      fs.writeFileSync(filename, csvContent);
      
      console.log(`   Created ${filename} (${batch.length} ingredients)`);
    });
    
    console.log(`\n🎉 Full dataset ready!`);
    console.log(`📊 Total: ${ingredients.length} unique foods`);
    console.log(`📂 Created ${batches.length} batch files`);
    console.log(`🚀 Start uploading with frida_final_batch_01.csv`);
    
    return { ingredients, batches: batches.length };
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  }
}

// Run it
try {
  createFullFridaFinal();
} catch (error) {
  console.error('💥 Failed:', error);
}