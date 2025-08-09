/**
 * Transform Frida normalised data to frida_ingredients table format
 * Input: frida_sample_1000.csv (normalised - 1 row per nutrient per food)
 * Output: frida_ingredients_ready.csv (1 row per food with all nutrients)
 */

const fs = require('fs');

function transformFridaData() {
  try {
    console.log('🔄 Transforming Frida data to ingredients format...');
    
    // Read the normalised CSV
    const csvContent = fs.readFileSync('frida_sample_1000.csv', 'utf8');
    const lines = csvContent.split('\n');
    const headers = lines[0].split(',').map(h => h.replace(/"/g, ''));
    
    console.log('📋 Headers:', headers);
    
    // Parse data
    const rawData = [];
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      
      const values = lines[i].split(',').map(v => v.replace(/"/g, ''));
      const row = {};
      headers.forEach((header, index) => {
        row[header] = values[index];
      });
      rawData.push(row);
    }
    
    console.log(`✅ Parsed ${rawData.length} rows`);
    
    // Group by FoodID to aggregate nutrients
    const foodsMap = new Map();
    
    rawData.forEach(row => {
      const foodId = row.FoodID;
      const parameterName = row.ParameterName || row.ParameterNavn;
      const value = parseFloat(row.ResVal);
      
      if (!foodsMap.has(foodId)) {
        foodsMap.set(foodId, {
          id: `frida-${foodId}`,
          name: row.FoodName || row.FødevareNavn,
          name_da: row.FødevareNavn,
          name_en: row.FoodName,
          category: 'andre', // Default category
          description: `${row.FoodName || row.FødevareNavn} fra Frida DTU database`,
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
      
      // Map parameters to our structure
      if (isNaN(value)) return; // Skip invalid values
      
      const paramLower = parameterName.toLowerCase();
      
      // Basic macros
      if (paramLower.includes('energy (kcal)') || paramLower.includes('energi (kcal)')) {
        food.calories = value;
      } else if (paramLower.includes('protein')) {
        food.protein = value;
      } else if (paramLower.includes('carbohydrate') || paramLower.includes('kulhydrat')) {
        food.carbs = value;
      } else if (paramLower.includes('fat') && !paramLower.includes('fatty')) {
        food.fat = value;
      } else if (paramLower.includes('dietary fiber') || paramLower.includes('kostfibre')) {
        food.fiber = value;
      }
      
      // Vitamins
      else if (paramLower.includes('vitamin a') || paramLower.includes('retinol')) {
        food.vitamins.A = value;
      } else if (paramLower.includes('vitamin c') || paramLower.includes('ascorbic')) {
        food.vitamins.C = value;
      } else if (paramLower.includes('vitamin d')) {
        food.vitamins.D = value;
      } else if (paramLower.includes('vitamin e') || paramLower.includes('tocopherol')) {
        food.vitamins.E = value;
      } else if (paramLower.includes('thiamin') || paramLower.includes('vitamin b1')) {
        food.vitamins.B1 = value;
      } else if (paramLower.includes('riboflavin') || paramLower.includes('vitamin b2')) {
        food.vitamins.B2 = value;
      } else if (paramLower.includes('niacin') || paramLower.includes('vitamin b3')) {
        food.vitamins.B3 = value;
      } else if (paramLower.includes('vitamin b6')) {
        food.vitamins.B6 = value;
      } else if (paramLower.includes('vitamin b12')) {
        food.vitamins.B12 = value;
      } else if (paramLower.includes('folate') || paramLower.includes('folic')) {
        food.vitamins.Folate = value;
      }
      
      // Minerals
      else if (paramLower.includes('calcium')) {
        food.minerals.calcium = value;
      } else if (paramLower.includes('iron')) {
        food.minerals.iron = value;
      } else if (paramLower.includes('magnesium')) {
        food.minerals.magnesium = value;
      } else if (paramLower.includes('phosphorus') || paramLower.includes('phosphor')) {
        food.minerals.phosphor = value;
      } else if (paramLower.includes('potassium')) {
        food.minerals.potassium = value;
      } else if (paramLower.includes('sodium')) {
        food.minerals.sodium = value;
      } else if (paramLower.includes('zinc')) {
        food.minerals.zinc = value;
      } else if (paramLower.includes('selenium')) {
        food.minerals.selenium = value;
      }
    });
    
    // Convert to array and set categories based on food names
    const ingredients = Array.from(foodsMap.values()).map(food => {
      // Simple category mapping based on food names
      const nameLower = food.name.toLowerCase();
      
      if (nameLower.includes('milk') || nameLower.includes('mælk') || nameLower.includes('ost') || nameLower.includes('cheese') || nameLower.includes('yoghurt')) {
        food.category = 'mejeriprodukter';
      } else if (nameLower.includes('meat') || nameLower.includes('beef') || nameLower.includes('pork') || nameLower.includes('chicken') || nameLower.includes('kylling') || nameLower.includes('oksekød') || nameLower.includes('svinekød')) {
        food.category = 'kød';
      } else if (nameLower.includes('fish') || nameLower.includes('salmon') || nameLower.includes('cod') || nameLower.includes('fisk') || nameLower.includes('laks') || nameLower.includes('torsk')) {
        food.category = 'fisk';
      } else if (nameLower.includes('oil') || nameLower.includes('olie') || nameLower.includes('butter') || nameLower.includes('smør')) {
        food.category = 'fedtstoffer';
      } else if (nameLower.includes('potato') || nameLower.includes('kartoffel') || nameLower.includes('carrot') || nameLower.includes('gulerod') || nameLower.includes('tomato') || nameLower.includes('spinach') || nameLower.includes('spinat')) {
        food.category = 'grøntsager';
      } else if (nameLower.includes('apple') || nameLower.includes('æble') || nameLower.includes('banana') || nameLower.includes('strawberry') || nameLower.includes('jordbær')) {
        food.category = 'frugt';
      } else if (nameLower.includes('almond') || nameLower.includes('mandel') || nameLower.includes('walnut') || nameLower.includes('valnød')) {
        food.category = 'nødder';
      } else if (nameLower.includes('bread') || nameLower.includes('brød') || nameLower.includes('flour') || nameLower.includes('mel') || nameLower.includes('rice') || nameLower.includes('ris')) {
        food.category = 'kornprodukter';
      }
      
      return food;
    });
    
    console.log(`✅ Transformed to ${ingredients.length} unique foods`);
    
    // Show sample
    console.log('\n📋 Sample transformed ingredients:');
    ingredients.slice(0, 3).forEach(ing => {
      console.log(`   ${ing.name} (${ing.category}): ${ing.calories} kcal, ${ing.protein}g protein`);
    });
    
    // Create CSV for Supabase upload
    const csvHeaders = [
      'id', 'name', 'category', 'description', 'calories', 'protein', 'carbs', 'fat', 'fiber',
      'vitamins', 'minerals', 'source', 'frida_id', 'is_active'
    ];
    
    const csvRows = ingredients.map(ing => [
      ing.id,
      `"${ing.name}"`,
      ing.category,
      `"${ing.description}"`,
      ing.calories || 'NULL',
      ing.protein || 'NULL',
      ing.carbs || 'NULL',
      ing.fat || 'NULL',
      ing.fiber || 'NULL',
      `'${JSON.stringify(ing.vitamins)}'`,
      `'${JSON.stringify(ing.minerals)}'`,
      ing.source,
      ing.frida_id,
      ing.is_active
    ]);
    
    const outputCsv = [
      csvHeaders.join(','),
      ...csvRows.map(row => row.join(','))
    ].join('\n');
    
    fs.writeFileSync('frida_ingredients_ready.csv', outputCsv);
    console.log('✅ Saved as frida_ingredients_ready.csv');
    
    // Create sample JSON for preview
    fs.writeFileSync('frida_ingredients_sample.json', JSON.stringify(ingredients.slice(0, 10), null, 2));
    console.log('✅ Saved sample as frida_ingredients_sample.json');
    
    console.log(`\n📊 Summary:`);
    console.log(`   Unique foods: ${ingredients.length}`);
    console.log(`   Categories: ${[...new Set(ingredients.map(i => i.category))].join(', ')}`);
    
    return ingredients;
    
  } catch (error) {
    console.error('❌ Error transforming data:', error.message);
    throw error;
  }
}

// Run transformation
try {
  const ingredients = transformFridaData();
  
  console.log('\n🎉 Transformation completed successfully!');
  console.log('\n📋 Files ready for upload:');
  console.log('   • frida_ingredients_ready.csv (for Supabase upload)');
  console.log('   • frida_ingredients_sample.json (for preview)');
  console.log('\n📋 Next step: Upload frida_ingredients_ready.csv to Supabase frida_ingredients table');
  
} catch (error) {
  console.error('💥 Transformation failed:', error);
  process.exit(1);
}