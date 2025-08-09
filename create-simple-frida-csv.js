/**
 * Create a simple CSV without JSON fields for easier Supabase import
 */

const fs = require('fs');

function createSimpleCSV() {
  console.log('🔧 Creating simplified CSV for Supabase...');
  
  // Read the original file
  const content = fs.readFileSync('frida_ingredients_batch_01_supabase.csv', 'utf8');
  const lines = content.split('\n');
  
  // New simplified header (remove complex JSON fields for now)
  const simpleHeader = 'id,name,category,description,calories,protein,carbs,fat,fiber,source,frida_id,is_active';
  
  const simpleLines = [simpleHeader];
  
  // Process each line
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    
    // Try to extract basic fields safely
    const line = lines[i];
    
    // Use regex to extract quoted fields
    const matches = line.match(/"([^"]+)"/g);
    if (!matches || matches.length < 4) continue;
    
    const id = matches[0].replace(/"/g, '');
    const name = matches[1].replace(/"/g, '');
    const category = matches[2].replace(/"/g, '');
    const description = matches[3].replace(/"/g, '');
    
    // Extract numeric fields after the description
    const afterDesc = line.split(matches[3])[1];
    const nums = afterDesc.split(',');
    
    const calories = nums[1] || '';
    const protein = nums[2] || '';
    const carbs = nums[3] || '';
    const fat = nums[4] || '';
    const fiber = nums[5] || '';
    
    // Skip vitamins and minerals for now, get the last fields
    const lastParts = afterDesc.split(',');
    const source = lastParts[lastParts.length - 3] || 'frida_dtu';
    const fridaId = lastParts[lastParts.length - 2] || '';
    const isActive = 'true';
    
    const simpleLine = `"${id}","${name}","${category}","${description}",${calories},${protein},${carbs},${fat},${fiber},"${source}","${fridaId}",${isActive}`;
    simpleLines.push(simpleLine);
  }
  
  // Write simple CSV
  const simpleContent = simpleLines.join('\n');
  fs.writeFileSync('frida_ingredients_simple_upload.csv', simpleContent);
  
  console.log(`✅ Created frida_ingredients_simple_upload.csv with ${simpleLines.length - 1} ingredients`);
  console.log('📋 This version has no JSON fields and should import cleanly');
  
  // Show sample
  console.log('\n📋 Sample lines:');
  simpleLines.slice(0, 5).forEach(line => console.log(line));
}

createSimpleCSV();