/**
 * Check what languages are available in Frida data
 */

const XLSX = require('xlsx');

function checkFridaLanguages() {
  try {
    console.log('🔍 Checking language options in Frida data...');
    
    const workbook = XLSX.readFile('Frida_Dataset_May2025.xlsx');
    const worksheet = workbook.Sheets['Data_Normalised'];
    
    // Convert just first 50 rows to check columns
    const range = XLSX.utils.decode_range(worksheet['!ref']);
    range.e.r = Math.min(range.e.r, 50); // Limit to first 50 rows
    
    const limitedSheet = {};
    limitedSheet['!ref'] = XLSX.utils.encode_range(range);
    
    // Copy cells within range
    for (let R = range.s.r; R <= range.e.r; ++R) {
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
        if (worksheet[cellAddress]) {
          limitedSheet[cellAddress] = worksheet[cellAddress];
        }
      }
    }
    
    const csv = XLSX.utils.sheet_to_csv(limitedSheet);
    const lines = csv.split('\n');
    const headers = lines[0].split(',');
    
    console.log('\n📋 Available columns:');
    headers.forEach((header, i) => {
      console.log(`   ${i}: ${header}`);
    });
    
    console.log('\n📋 Sample data rows:');
    for (let i = 1; i <= Math.min(5, lines.length - 1); i++) {
      const cells = lines[i].split(',');
      console.log(`\nRow ${i}:`);
      
      // Show key fields
      const foodNameEn = cells[headers.indexOf('FoodName')] || 'N/A';
      const foodNameDa = cells[headers.indexOf('FødevareNavn')] || 'N/A';
      const paramEn = cells[headers.indexOf('ParameterName')] || 'N/A';
      const paramDa = cells[headers.indexOf('ParameterNavn')] || 'N/A';
      
      console.log(`   FoodName (EN): ${foodNameEn}`);
      console.log(`   FødevareNavn (DA): ${foodNameDa}`);
      console.log(`   ParameterName (EN): ${paramEn}`);
      console.log(`   ParameterNavn (DA): ${paramDa}`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkFridaLanguages();