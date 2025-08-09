/**
 * Create ultra simple CSV - no JSON, just basic fields
 */

const fs = require('fs');

function createUltraSimpleCSV() {
  console.log('🔧 Creating ultra simple CSV (no JSON fields)...');
  
  // Create simple test data first
  const ingredients = [
    {
      id: 'frida-1',
      name: 'Strawberry raw',
      category: 'frugt',
      description: 'Strawberry raw fra Frida DTU database',
      calories: 38.46,
      protein: 0.66,
      carbs: 6.07,
      fat: 0.6,
      fiber: 1.49,
      source: 'frida_dtu',
      frida_id: '1',
      is_active: true
    },
    {
      id: 'frida-2',
      name: 'Apple raw all varieties',
      category: 'frugt',
      description: 'Apple raw all varieties fra Frida DTU database',
      calories: 55.06,
      protein: 0.27,
      carbs: 11.32,
      fat: 0.23,
      fiber: 2.21,
      source: 'frida_dtu',
      frida_id: '2',
      is_active: true
    },
    {
      id: 'frida-3',
      name: 'Banana raw',
      category: 'frugt',
      description: 'Banana raw fra Frida DTU database',
      calories: 93.48,
      protein: 1.14,
      carbs: 19.71,
      fat: 0.21,
      fiber: 1.63,
      source: 'frida_dtu',
      frida_id: '3',
      is_active: true
    }
  ];
  
  // Create CSV manually to ensure perfect formatting
  const lines = [
    'id,name,category,description,calories,protein,carbs,fat,fiber,source,frida_id,is_active'
  ];
  
  ingredients.forEach(ing => {
    const line = `${ing.id},"${ing.name}",${ing.category},"${ing.description}",${ing.calories},${ing.protein},${ing.carbs},${ing.fat},${ing.fiber},${ing.source},${ing.frida_id},${ing.is_active}`;
    lines.push(line);
  });
  
  const csvContent = lines.join('\n');
  fs.writeFileSync('frida_ultra_simple.csv', csvContent);
  
  console.log('✅ Created frida_ultra_simple.csv');
  console.log('\n📋 Content:');
  lines.forEach(line => console.log(line));
  
  return csvContent;
}

createUltraSimpleCSV();