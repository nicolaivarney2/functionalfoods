/**
 * Convert Frida "Data_Normalised" sheet to CSV for Supabase upload
 */

const XLSX = require('xlsx');
const fs = require('fs');

async function convertFridaData() {
  try {
    console.log('🔄 Converting Frida Data_Normalised sheet...');
    
    const workbook = XLSX.readFile('Frida_Dataset_May2025.xlsx');
    
    // Get the Data_Normalised sheet (the big one with 137k rows)
    const worksheet = workbook.Sheets['Data_Normalised'];
    const jsonData = XLSX.utils.sheet_to_json(worksheet);
    
    console.log(`✅ Loaded ${jsonData.length} rows from Data_Normalised sheet`);
    console.log('📋 Columns:', Object.keys(jsonData[0]));
    
    // Show sample data
    console.log('\n📋 Sample data:');
    console.log(JSON.stringify(jsonData.slice(0, 3), null, 2));
    
    // Convert to CSV
    const csv = XLSX.utils.sheet_to_csv(worksheet);
    
    // Save full CSV
    fs.writeFileSync('frida_data_normalised.csv', csv);
    console.log('✅ Saved as frida_data_normalised.csv');
    
    // Show file size
    const stats = fs.statSync('frida_data_normalised.csv');
    console.log(`📁 Full CSV file size: ${(stats.size / 1024 / 1024).toFixed(1)} MB`);
    
    // Create a smaller sample for testing (first 1000 rows)
    const sampleData = jsonData.slice(0, 1000);
    const sampleCsv = [
      Object.keys(jsonData[0]).join(','),
      ...sampleData.map(row => Object.values(row).map(val => `"${val}"`).join(','))
    ].join('\n');
    
    fs.writeFileSync('frida_sample_1000.csv', sampleCsv);
    console.log('✅ Created sample file: frida_sample_1000.csv (1000 rows)');
    
    // Analyze the data structure
    const uniqueFoods = new Set(jsonData.map(row => row.FoodID));
    const uniqueParameters = new Set(jsonData.map(row => row.ParameterID));
    
    console.log(`\n📊 Data Analysis:`);
    console.log(`   Total rows: ${jsonData.length}`);
    console.log(`   Unique foods: ${uniqueFoods.size}`);
    console.log(`   Unique parameters: ${uniqueParameters.size}`);
    
    // Show some food examples
    const sampleFoods = [...uniqueFoods].slice(0, 5);
    console.log(`\n🍽️ Sample foods:`);
    sampleFoods.forEach(foodId => {
      const foodRow = jsonData.find(row => row.FoodID === foodId);
      console.log(`   ${foodId}: ${foodRow.FødevareNavn} / ${foodRow.FoodName}`);
    });
    
    return true;
    
  } catch (error) {
    console.error('❌ Error converting data:', error.message);
    throw error;
  }
}

// Run conversion
convertFridaData()
  .then(() => {
    console.log('\n🎉 Conversion completed successfully!');
    console.log('\n📋 Files created:');
    console.log('   • frida_data_normalised.csv (full dataset ~137k rows)');
    console.log('   • frida_sample_1000.csv (sample for testing)');
    console.log('\n📋 Next steps:');
    console.log('   1. Start with frida_sample_1000.csv for testing');
    console.log('   2. Upload to Supabase frida_ingredients table');
    console.log('   3. Test ingredient matching interface');
    console.log('   4. If all works, upload full frida_data_normalised.csv');
  })
  .catch(error => {
    console.error('💥 Conversion failed:', error);
    process.exit(1);
  });