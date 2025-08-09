/**
 * Create Frida dataset using DANISH names for consistency
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

function createDanishFridaCSV() {
  try {
    console.log('🇩🇰 Creating Frida dataset with DANISH names...');
    
    // Convert Excel to CSV first (first 2000 rows for testing)
    const workbook = XLSX.readFile('Frida_Dataset_May2025.xlsx');
    const worksheet = workbook.Sheets['Data_Normalised'];
    const csv = XLSX.utils.sheet_to_csv(worksheet);
    
    // Parse the CSV
    const rows = parseCSV(csv);
    const headers = rows[0];
    
    console.log(`📋 Processing first 2000 rows for testing...`);
    console.log(`📋 Headers: ${headers.join(', ')}`);
    
    // Convert to objects (limit to 2000 for testing)
    const rawData = [];
    for (let i = 1; i < Math.min(2001, rows.length); i++) {
      const row = {};
      headers.forEach((header, index) => {
        row[header] = rows[i][index] || '';
      });
      rawData.push(row);
    }
    
    console.log(`✅ Parsed ${rawData.length} rows`);
    
    // Show sample data
    console.log('\n📋 Sample raw data:');
    rawData.slice(0, 3).forEach((row, i) => {
      console.log(`Row ${i + 1}:`);
      console.log(`   FoodID: ${row.FoodID}`);
      console.log(`   FødevareNavn (DA): ${row.FødevareNavn}`);
      console.log(`   FoodName (EN): ${row.FoodName}`);
      console.log(`   ParameterNavn (DA): ${row.ParameterNavn}`);
      console.log(`   ParameterName (EN): ${row.ParameterName}`);
      console.log(`   ResVal: ${row.ResVal}`);
    });
    
    // Group by food and aggregate nutrition
    const foodsMap = new Map();
    
    rawData.forEach((row) => {
      const foodId = row.FoodID;
      const foodNameDa = row.FødevareNavn || ''; // DANSK navn
      const foodNameEn = row.FoodName || '';     // Engelsk som backup
      const parameterNameDa = row.ParameterNavn || ''; // DANSK parameter
      const parameterNameEn = row.ParameterName || ''; // Engelsk som backup
      const value = parseFloat(row.ResVal);
      
      if (!foodId || (!parameterNameDa && !parameterNameEn)) return;
      
      // Prefer Danish name, fallback to English
      const displayName = foodNameDa || foodNameEn;
      const paramName = parameterNameDa || parameterNameEn;
      
      if (!foodsMap.has(foodId)) {
        foodsMap.set(foodId, {
          id: `frida-${foodId}`,
          name: displayName.replace(/"/g, ''),
          name_da: foodNameDa,
          name_en: foodNameEn,
          category: 'andre',
          description: `${displayName} fra Frida DTU database`.replace(/"/g, ''),
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
      
      const paramLower = paramName.toLowerCase();
      
      // Map nutrition parameters (support both Danish and English terms)
      if (paramLower.includes('energi (kcal)') || paramLower.includes('energy (kcal)')) {
        food.calories = Math.round(value * 100) / 100;
      } else if (paramLower === 'protein') {
        food.protein = Math.round(value * 100) / 100;
      } else if (paramLower.includes('kulhydrat') || paramLower.includes('carbohydrate')) {
        food.carbs = Math.round(value * 100) / 100;
      } else if (paramLower === 'fedt' || paramLower === 'fat') {
        food.fat = Math.round(value * 100) / 100;
      } else if (paramLower.includes('kostfiber') || paramLower.includes('dietary fiber')) {
        food.fiber = Math.round(value * 100) / 100;
      }
      
      // Vitamins (support Danish and English)
      else if (paramLower.includes('vitamin a') || paramLower.includes('a-vitamin')) {
        food.vitamins.A = Math.round(value * 100) / 100;
      } else if (paramLower.includes('vitamin c') || paramLower.includes('c-vitamin')) {
        food.vitamins.C = Math.round(value * 100) / 100;
      } else if (paramLower.includes('vitamin d') || paramLower.includes('d-vitamin')) {
        food.vitamins.D = Math.round(value * 100) / 100;
      } else if (paramLower.includes('vitamin e') || paramLower.includes('e-vitamin')) {
        food.vitamins.E = Math.round(value * 100) / 100;
      } else if (paramLower.includes('thiamin') || paramLower.includes('b1')) {
        food.vitamins.B1 = Math.round(value * 1000) / 1000;
      } else if (paramLower.includes('riboflavin') || paramLower.includes('b2')) {
        food.vitamins.B2 = Math.round(value * 1000) / 1000;
      } else if (paramLower.includes('niacin') || paramLower.includes('b3')) {
        food.vitamins.B3 = Math.round(value * 100) / 100;
      } else if (paramLower.includes('folat') || paramLower.includes('folate')) {
        food.vitamins.Folate = Math.round(value * 100) / 100;
      }
      
      // Minerals (support Danish and English)
      else if (paramLower.includes('calcium') || paramLower.includes('kalcium')) {
        food.minerals.calcium = Math.round(value);
      } else if (paramLower.includes('iron') || paramLower.includes('jern')) {
        food.minerals.iron = Math.round(value * 100) / 100;
      } else if (paramLower.includes('magnesium')) {
        food.minerals.magnesium = Math.round(value);
      } else if (paramLower.includes('phosphorus') || paramLower.includes('fosfor')) {
        food.minerals.phosphor = Math.round(value);
      } else if (paramLower.includes('potassium') || paramLower.includes('kalium')) {
        food.minerals.potassium = Math.round(value);
      } else if (paramLower.includes('sodium') || paramLower.includes('natrium')) {
        food.minerals.sodium = Math.round(value);
      } else if (paramLower.includes('zinc') || paramLower.includes('zink')) {
        food.minerals.zinc = Math.round(value * 100) / 100;
      } else if (paramLower.includes('selenium') || paramLower.includes('selen')) {
        food.minerals.selenium = Math.round(value * 100) / 100;
      }
    });
    
    console.log('🏷️ Categorizing foods with Danish terms...');
    
    // Convert to array and improve categories using Danish terms
    const ingredients = Array.from(foodsMap.values()).map(food => {
      const nameLower = food.name.toLowerCase();
      
      // Enhanced category mapping with Danish terms
      if (nameLower.includes('jordbær') || nameLower.includes('strawberry') || 
          nameLower.includes('æble') || nameLower.includes('apple') || 
          nameLower.includes('banan') || nameLower.includes('banana') ||
          nameLower.includes('bær') || nameLower.includes('berry') ||
          nameLower.includes('frugt') || nameLower.includes('fruit') ||
          nameLower.includes('appelsin') || nameLower.includes('orange') ||
          nameLower.includes('drue') || nameLower.includes('grape') ||
          nameLower.includes('pære') || nameLower.includes('pear')) {
        food.category = 'frugt';
      } else if (nameLower.includes('kartoffel') || nameLower.includes('potato') ||
                 nameLower.includes('gulerod') || nameLower.includes('carrot') ||
                 nameLower.includes('løg') || nameLower.includes('onion') ||
                 nameLower.includes('tomat') || nameLower.includes('tomato') ||
                 nameLower.includes('peber') || nameLower.includes('pepper') ||
                 nameLower.includes('salat') || nameLower.includes('lettuce') ||
                 nameLower.includes('spinat') || nameLower.includes('spinach') ||
                 nameLower.includes('kål') || nameLower.includes('cabbage') ||
                 nameLower.includes('grøntsag') || nameLower.includes('vegetable')) {
        food.category = 'grøntsager';
      } else if (nameLower.includes('mælk') || nameLower.includes('milk') ||
                 nameLower.includes('ost') || nameLower.includes('cheese') ||
                 nameLower.includes('yoghurt') || nameLower.includes('yogurt') ||
                 nameLower.includes('fløde') || nameLower.includes('cream') ||
                 nameLower.includes('smør') || nameLower.includes('butter')) {
        food.category = 'mejeriprodukter';
      } else if (nameLower.includes('oksekød') || nameLower.includes('beef') ||
                 nameLower.includes('svinekød') || nameLower.includes('pork') ||
                 nameLower.includes('kylling') || nameLower.includes('chicken') ||
                 nameLower.includes('kalkun') || nameLower.includes('turkey') ||
                 nameLower.includes('lam') || nameLower.includes('lamb') ||
                 nameLower.includes('kød') || nameLower.includes('meat')) {
        food.category = 'kød';
      } else if (nameLower.includes('fisk') || nameLower.includes('fish') ||
                 nameLower.includes('laks') || nameLower.includes('salmon') ||
                 nameLower.includes('torsk') || nameLower.includes('cod') ||
                 nameLower.includes('tune') || nameLower.includes('tuna') ||
                 nameLower.includes('makrel') || nameLower.includes('mackerel')) {
        food.category = 'fisk';
      } else if (nameLower.includes('olie') || nameLower.includes('oil') ||
                 nameLower.includes('fedt') || nameLower.includes('fat')) {
        food.category = 'fedtstoffer';
      } else if (nameLower.includes('mandel') || nameLower.includes('almond') ||
                 nameLower.includes('valnød') || nameLower.includes('walnut') ||
                 nameLower.includes('jordnød') || nameLower.includes('peanut') ||
                 nameLower.includes('hasselnød') || nameLower.includes('hazelnut') ||
                 nameLower.includes('nødder') || nameLower.includes('nuts')) {
        food.category = 'nødder';
      } else if (nameLower.includes('brød') || nameLower.includes('bread') ||
                 nameLower.includes('mel') || nameLower.includes('flour') ||
                 nameLower.includes('ris') || nameLower.includes('rice') ||
                 nameLower.includes('pasta') ||
                 nameLower.includes('morgenmad') || nameLower.includes('cereal') ||
                 nameLower.includes('havre') || nameLower.includes('oats')) {
        food.category = 'kornprodukter';
      } else if (nameLower.includes('bønner') || nameLower.includes('beans') ||
                 nameLower.includes('linser') || nameLower.includes('lentils') ||
                 nameLower.includes('ærter') || nameLower.includes('peas')) {
        food.category = 'bælgfrugter';
      }
      
      return food;
    });
    
    console.log(`✅ Processed ${ingredients.length} unique foods`);
    
    // Show sample with Danish names
    console.log('\n📋 Sample ingredients with Danish names:');
    ingredients.slice(0, 10).forEach(ing => {
      console.log(`   ${ing.name} (${ing.category}): ${ing.calories || 'N/A'} kcal`);
    });
    
    // Show category breakdown
    const categoryCount = {};
    ingredients.forEach(ing => {
      categoryCount[ing.category] = (categoryCount[ing.category] || 0) + 1;
    });
    
    console.log('\n📊 Category breakdown:');
    Object.entries(categoryCount).forEach(([cat, count]) => {
      console.log(`   ${cat}: ${count} foods`);
    });
    
    // Create CSV with Danish focus
    const csvLines = [
      'id,name,category,description,calories,protein,carbs,fat,fiber,vitamins,minerals,source,frida_id,is_active'
    ];
    
    ingredients.forEach(ing => {
      // Create clean CSV line with proper JSON escaping
      const vitaminsJson = JSON.stringify(ing.vitamins).replace(/"/g, '""');
      const mineralsJson = JSON.stringify(ing.minerals).replace(/"/g, '""');
      
      const csvLine = `${ing.id},"${ing.name}",${ing.category},"${ing.description}",${ing.calories||''},${ing.protein||''},${ing.carbs||''},${ing.fat||''},${ing.fiber||''},"${vitaminsJson}","${mineralsJson}",${ing.source},${ing.frida_id},${ing.is_active}`;
      csvLines.push(csvLine);
    });
    
    const csvContent = csvLines.join('\n');
    fs.writeFileSync('frida_danish_sample.csv', csvContent);
    
    console.log(`\n✅ Created frida_danish_sample.csv with Danish names`);
    console.log(`📊 Contains ${ingredients.length} ingredients`);
    
    return ingredients.length;
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  }
}

// Run it
try {
  const count = createDanishFridaCSV();
  console.log(`\n🇩🇰 Ready! ${count} ingredients with Danish names`);
} catch (error) {
  console.error('💥 Failed:', error);
}