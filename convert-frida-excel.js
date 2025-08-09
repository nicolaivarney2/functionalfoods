/**
 * Convert Frida Excel file to CSV for Supabase upload
 */

const XLSX = require('xlsx');
const fs = require('fs');

async function convertFridaExcel() {
  try {
    console.log('🔄 Converting Frida Excel file to CSV...');
    
    // Read Excel file
    const workbook = XLSX.readFile('Frida_Dataset_May2025.xlsx');
    const sheetNames = workbook.SheetNames;
    
    console.log(`📋 Found ${sheetNames.length} sheets: ${sheetNames.join(', ')}`);
    
    // Convert first sheet to JSON
    const worksheet = workbook.Sheets[sheetNames[0]];
    const jsonData = XLSX.utils.sheet_to_json(worksheet);
    
    console.log(`✅ Loaded ${jsonData.length} rows from Excel`);
    
    if (jsonData.length > 0) {
      console.log('📋 Columns:', Object.keys(jsonData[0]));
      console.log('📋 Sample row:', jsonData[0]);
    }
    
    // Convert to CSV
    const csv = XLSX.utils.sheet_to_csv(worksheet);
    
    // Save CSV
    fs.writeFileSync('frida_dataset.csv', csv);
    console.log('✅ Saved as frida_dataset.csv');
    
    // Show file size
    const stats = fs.statSync('frida_dataset.csv');
    console.log(`📁 CSV file size: ${(stats.size / 1024 / 1024).toFixed(1)} MB`);
    
    // Save sample for preview
    const sampleData = jsonData.slice(0, 5);
    fs.writeFileSync('frida_sample.json', JSON.stringify(sampleData, null, 2));
    console.log('✅ Saved sample as frida_sample.json');
    
    return true;
    
  } catch (error) {
    console.error('❌ Error converting Excel file:', error.message);
    
    if (error.message.includes('Cannot resolve module')) {
      console.log('💡 Installing required package...');
      console.log('Run: npm install xlsx');
      return false;
    }
    
    throw error;
  }
}

// Run conversion
convertFridaExcel()
  .then(() => {
    console.log('🎉 Conversion completed successfully!');
    console.log('📋 Next steps:');
    console.log('   1. Check frida_dataset.csv');
    console.log('   2. Upload to Supabase frida_ingredients table');
    console.log('   3. Test ingredient matching interface');
  })
  .catch(error => {
    console.error('💥 Conversion failed:', error);
    process.exit(1);
  });