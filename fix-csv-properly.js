/**
 * Properly fix ALL NULL values in CSV files for Supabase import
 */

const fs = require('fs');

function fixCSVProperly(filename) {
  console.log(`🔧 Properly fixing ALL NULL values in ${filename}...`);
  
  let content = fs.readFileSync(filename, 'utf8');
  
  // Show some examples of NULL issues first
  const lines = content.split('\n');
  console.log('📋 Sample lines with NULL:');
  lines.slice(0, 10).forEach((line, i) => {
    if (line.includes('NULL')) {
      console.log(`   Line ${i + 1}: ${line.substring(0, 100)}...`);
    }
  });
  
  // Replace ALL occurrences of NULL with empty string
  // This is more aggressive but safe for CSV import
  content = content.replace(/NULL/g, '');
  
  // Also handle any double commas that might result
  content = content.replace(/,,+/g, ',,'); // Multiple commas become double comma
  
  // Save fixed version
  const fixedFilename = filename.replace('.csv', '_supabase.csv');
  fs.writeFileSync(fixedFilename, content);
  
  // Verify no NULL remains
  const hasNull = fs.readFileSync(fixedFilename, 'utf8').includes('NULL');
  console.log(`✅ Created ${fixedFilename}`);
  console.log(`🔍 Contains NULL: ${hasNull ? '❌ YES' : '✅ NO'}`);
  
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
    fixCSVProperly(file);
  }
});

console.log('\n🎉 All files properly fixed! Upload the _supabase.csv versions');