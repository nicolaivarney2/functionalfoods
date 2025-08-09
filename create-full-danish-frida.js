/**
 * Create the COMPLETE Danish Frida dataset (all 1,370 ingredients)
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

function createFullDanishFrida() {
  try {
    console.log('🇩🇰 Creating COMPLETE Danish Frida dataset...');
    
    // Convert Excel to CSV first (ALL data)
    const workbook = XLSX.readFile('Frida_Dataset_May2025.xlsx');
    const worksheet = workbook.Sheets['Data_Normalised'];
    const csv = XLSX.utils.sheet_to_csv(worksheet);
    
    // Parse the full CSV
    const rows = parseCSV(csv);
    const headers = rows[0];
    
    console.log(`📋 Processing ALL ${rows.length - 1} rows...`);
    
    // Convert to objects (ALL data)
    const rawData = [];
    for (let i = 1; i < rows.length; i++) {
      if (i % 20000 === 0) {
        console.log(`   Processed ${i}/${rows.length} rows (${Math.round(i/rows.length*100)}%)`);
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
      const foodNameDa = row.FødevareNavn || ''; // DANSK navn (primær)
      const foodNameEn = row.FoodName || '';     // Engelsk som backup
      const parameterNameDa = row.ParameterNavn || ''; // DANSK parameter (primær)
      const parameterNameEn = row.ParameterName || ''; // Engelsk som backup
      const value = parseFloat(row.ResVal);
      
      if (!foodId || (!parameterNameDa && !parameterNameEn)) return;
      
      // Prefer Danish name, fallback to English
      const displayName = foodNameDa || foodNameEn;
      const paramName = parameterNameDa || parameterNameEn;
      
      if (!foodsMap.has(foodId)) {
        foodsMap.set(foodId, {
          id: `frida-${foodId}`,
          name: displayName.replace(/"/g, '').replace(/,/g, ' '), // Clean name
          name_da: foodNameDa,
          name_en: foodNameEn,
          category: 'andre',
          description: `${displayName} fra Frida DTU database`.replace(/"/g, '').replace(/,/g, ' '),
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
      } else if (paramLower.includes('vitamin b-6') || paramLower.includes('b6')) {
        food.vitamins.B6 = Math.round(value * 1000) / 1000;
      } else if (paramLower.includes('vitamin b-12') || paramLower.includes('b12')) {
        food.vitamins.B12 = Math.round(value * 1000) / 1000;
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
      
      // Enhanced category mapping with Danish terms FIRST
      if (nameLower.includes('jordbær') || nameLower.includes('strawberry') || 
          nameLower.includes('æble') || nameLower.includes('apple') || 
          nameLower.includes('banan') || nameLower.includes('banana') ||
          nameLower.includes('bær') || nameLower.includes('berry') ||
          nameLower.includes('frugt') || nameLower.includes('fruit') ||
          nameLower.includes('appelsin') || nameLower.includes('orange') ||
          nameLower.includes('drue') || nameLower.includes('grape') ||
          nameLower.includes('pære') || nameLower.includes('pear') ||
          nameLower.includes('fersken') || nameLower.includes('peach') ||
          nameLower.includes('blomme') || nameLower.includes('plum') ||
          nameLower.includes('kirsebær') || nameLower.includes('cherry')) {
        food.category = 'frugt';
      } else if (nameLower.includes('kartoffel') || nameLower.includes('potato') ||
                 nameLower.includes('gulerod') || nameLower.includes('carrot') ||
                 nameLower.includes('løg') || nameLower.includes('onion') ||
                 nameLower.includes('tomat') || nameLower.includes('tomato') ||
                 nameLower.includes('peber') || nameLower.includes('pepper') ||
                 nameLower.includes('salat') || nameLower.includes('lettuce') ||
                 nameLower.includes('spinat') || nameLower.includes('spinach') ||
                 nameLower.includes('kål') || nameLower.includes('cabbage') ||
                 nameLower.includes('grøntsag') || nameLower.includes('vegetable') ||
                 nameLower.includes('broccoli') || nameLower.includes('blomkål') ||
                 nameLower.includes('cauliflower') || nameLower.includes('squash') ||
                 nameLower.includes('courgette') || nameLower.includes('agurk') ||
                 nameLower.includes('cucumber')) {
        food.category = 'grøntsager';
      } else if (nameLower.includes('mælk') || nameLower.includes('milk') ||
                 nameLower.includes('ost') || nameLower.includes('cheese') ||
                 nameLower.includes('yoghurt') || nameLower.includes('yogurt') ||
                 nameLower.includes('fløde') || nameLower.includes('cream') ||
                 nameLower.includes('smør') || nameLower.includes('butter') ||
                 nameLower.includes('skyr') || nameLower.includes('kefir')) {
        food.category = 'mejeriprodukter';
      } else if (nameLower.includes('oksekød') || nameLower.includes('beef') ||
                 nameLower.includes('svinekød') || nameLower.includes('pork') ||
                 nameLower.includes('kylling') || nameLower.includes('chicken') ||
                 nameLower.includes('kalkun') || nameLower.includes('turkey') ||
                 nameLower.includes('lam') || nameLower.includes('lamb') ||
                 nameLower.includes('kød') || nameLower.includes('meat') ||
                 nameLower.includes('oksekølle') || nameLower.includes('svin') ||
                 nameLower.includes('and') || nameLower.includes('duck') ||
                 nameLower.includes('gås') || nameLower.includes('goose')) {
        food.category = 'kød';
      } else if (nameLower.includes('fisk') || nameLower.includes('fish') ||
                 nameLower.includes('laks') || nameLower.includes('salmon') ||
                 nameLower.includes('torsk') || nameLower.includes('cod') ||
                 nameLower.includes('tune') || nameLower.includes('tuna') ||
                 nameLower.includes('makrel') || nameLower.includes('mackerel') ||
                 nameLower.includes('rødspætte') || nameLower.includes('plaice') ||
                 nameLower.includes('sild') || nameLower.includes('herring') ||
                 nameLower.includes('rejer') || nameLower.includes('shrimp') ||
                 nameLower.includes('hummer') || nameLower.includes('lobster')) {
        food.category = 'fisk';
      } else if (nameLower.includes('olie') || nameLower.includes('oil') ||
                 nameLower.includes('fedt') || nameLower.includes('fat') ||
                 nameLower.includes('margarine') || nameLower.includes('bacon')) {
        food.category = 'fedtstoffer';
      } else if (nameLower.includes('mandel') || nameLower.includes('almond') ||
                 nameLower.includes('valnød') || nameLower.includes('walnut') ||
                 nameLower.includes('jordnød') || nameLower.includes('peanut') ||
                 nameLower.includes('hasselnød') || nameLower.includes('hazelnut') ||
                 nameLower.includes('nødder') || nameLower.includes('nuts') ||
                 nameLower.includes('cashew') || nameLower.includes('pecan') ||
                 nameLower.includes('pistacienød') || nameLower.includes('pistachio')) {
        food.category = 'nødder';
      } else if (nameLower.includes('brød') || nameLower.includes('bread') ||
                 nameLower.includes('mel') || nameLower.includes('flour') ||
                 nameLower.includes('ris') || nameLower.includes('rice') ||
                 nameLower.includes('pasta') ||
                 nameLower.includes('morgenmad') || nameLower.includes('cereal') ||
                 nameLower.includes('havre') || nameLower.includes('oats') ||
                 nameLower.includes('byggryn') || nameLower.includes('barley') ||
                 nameLower.includes('quinoa') || nameLower.includes('couscous') ||
                 nameLower.includes('rugbrød') || nameLower.includes('toast')) {
        food.category = 'kornprodukter';
      } else if (nameLower.includes('bønner') || nameLower.includes('beans') ||
                 nameLower.includes('linser') || nameLower.includes('lentils') ||
                 nameLower.includes('ærter') || nameLower.includes('peas') ||
                 nameLower.includes('kikærter') || nameLower.includes('chickpeas') ||
                 nameLower.includes('sojabønner') || nameLower.includes('soybeans')) {
        food.category = 'bælgfrugter';
      }
      
      return food;
    });
    
    console.log(`✅ Processed ${ingredients.length} unique Danish foods`);
    
    // Show category breakdown
    const categoryCount = {};
    ingredients.forEach(ing => {
      categoryCount[ing.category] = (categoryCount[ing.category] || 0) + 1;
    });
    
    console.log('\n📊 Category breakdown:');
    Object.entries(categoryCount).forEach(([cat, count]) => {
      console.log(`   ${cat}: ${count} foods`);
    });
    
    // Create batched CSV files (200 per batch for easy upload)
    const batchSize = 200;
    const batches = [];
    
    for (let i = 0; i < ingredients.length; i += batchSize) {
      batches.push(ingredients.slice(i, i + batchSize));
    }
    
    console.log(`\n📦 Creating ${batches.length} Danish batch files...`);
    
    batches.forEach((batch, index) => {
      const csvLines = [
        'id,name,category,description,calories,protein,carbs,fat,fiber,vitamins,minerals,source,frida_id,is_active'
      ];
      
      batch.forEach(ing => {
        // Create clean CSV line with proper JSON escaping
        const vitaminsJson = JSON.stringify(ing.vitamins).replace(/"/g, '""');
        const mineralsJson = JSON.stringify(ing.minerals).replace(/"/g, '""');
        
        const csvLine = `${ing.id},"${ing.name}",${ing.category},"${ing.description}",${ing.calories||''},${ing.protein||''},${ing.carbs||''},${ing.fat||''},${ing.fiber||''},"${vitaminsJson}","${mineralsJson}",${ing.source},${ing.frida_id},${ing.is_active}`;
        csvLines.push(csvLine);
      });
      
      const filename = `frida_dansk_batch_${(index + 1).toString().padStart(2, '0')}.csv`;
      const csvContent = csvLines.join('\n');
      fs.writeFileSync(filename, csvContent);
      
      console.log(`   Created ${filename} (${batch.length} ingredients)`);
    });
    
    console.log(`\n🇩🇰 KOMPLET dansk Frida database klar!`);
    console.log(`📊 Total: ${ingredients.length} unikke danske fødevarer`);
    console.log(`📂 Created ${batches.length} batch files`);
    console.log(`🚀 Start uploading with frida_dansk_batch_01.csv`);
    
    return { ingredients, batches: batches.length };
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  }
}

// Run it
try {
  createFullDanishFrida();
} catch (error) {
  console.error('💥 Failed:', error);
}