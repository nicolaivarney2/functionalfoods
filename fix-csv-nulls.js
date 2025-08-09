/**
 * Fix NULL values in CSV files for Supabase import
 */

const fs = require('fs');

function fixCSVNulls(filename) {
  console.log(`🔧 Fixing NULL values in ${filename}...`);
  
  let content = fs.readFileSync(filename, 'utf8');
  
  // Replace NULL with empty string (or 0 for numeric columns)
  content = content.replace(/,NULL,/g, ',,'); // Middle columns
  content = content.replace(/,NULL$/gm, ','); // End of line
  content = content.replace(/^NULL,/gm, ','); // Start of line (unlikely)
  
  // Save fixed version
  const fixedFilename = filename.replace('.csv', '_fixed.csv');
  fs.writeFileSync(fixedFilename, content);
  
  console.log(`✅ Created ${fixedFilename}`);
  return fixedFilename;
}

// Fix all batch files
const batchFiles = [
  'frida_ingredients_batch_01.csv',
  'frida_ingredients_batch_02.csv', 
  'frida_ingredients_batch_03.csv'
];

batchFiles.forEach(file => {
  if (fs.existsSync(file)) {
    fixCSVNulls(file);
  }
});

console.log('\n🎉 All files fixed! Upload the _fixed.csv versions to Supabase');