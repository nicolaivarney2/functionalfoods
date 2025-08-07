const XLSX = require('xlsx');
const fs = require('fs');

console.log('📊 Converting Frida Excel data to JSON...');

try {
  // Read the Excel file
  const workbook = XLSX.readFile('Frida_Dataset_May2025.xlsx');
  
  console.log('📋 Available sheets:');
  console.log(workbook.SheetNames);
  
  // Convert the Food sheet
  const foodSheetName = 'Food';
  if (!workbook.SheetNames.includes(foodSheetName)) {
    console.log('❌ Food sheet not found');
    return;
  }
  
  console.log(`📊 Converting Food sheet: ${foodSheetName}`);
  const foodWorksheet = workbook.Sheets[foodSheetName];
  const foodData = XLSX.utils.sheet_to_json(foodWorksheet);
  console.log(`✅ Converted ${foodData.length} foods`);
  
  // Convert the Data_Normalised sheet
  const dataSheetName = 'Data_Normalised';
  if (!workbook.SheetNames.includes(dataSheetName)) {
    console.log('❌ Data_Normalised sheet not found');
    return;
  }
  
  console.log(`📊 Converting Data_Normalised sheet: ${dataSheetName}`);
  const dataWorksheet = workbook.Sheets[dataSheetName];
  const dataData = XLSX.utils.sheet_to_json(dataWorksheet);
  console.log(`✅ Converted ${dataData.length} nutritional data entries`);
  
  // Save both to JSON files
  fs.writeFileSync('frida-foods.json', JSON.stringify(foodData, null, 2));
  fs.writeFileSync('frida-nutritional-data.json', JSON.stringify(dataData, null, 2));
  console.log('💾 Saved to frida-foods.json and frida-nutritional-data.json');
  
  // Show sample data
  if (foodData.length > 0) {
    console.log('🍎 Sample foods:');
    foodData.slice(0, 5).forEach((food, index) => {
      console.log(`${index + 1}. ${food.FødevareNavn} (${food.FoodName})`);
    });
  }
  
  if (dataData.length > 0) {
    console.log('📊 Sample nutritional data:');
    console.log(JSON.stringify(dataData[0], null, 2));
    
    // Show some sample nutritional values
    console.log('🔍 Looking for specific foods...');
    const sampleFoods = ['kylling', 'laks', 'mælk', 'mandler'];
    sampleFoods.forEach(searchTerm => {
      const matchingFoods = foodData.filter(food => 
        food.FødevareNavn.toLowerCase().includes(searchTerm) ||
        food.FoodName.toLowerCase().includes(searchTerm)
      );
      if (matchingFoods.length > 0) {
        console.log(`✅ Found ${matchingFoods.length} foods matching "${searchTerm}":`);
        matchingFoods.slice(0, 3).forEach(food => {
          console.log(`  - ${food.FødevareNavn} (ID: ${food.FoodID})`);
        });
      }
    });
  }
  
} catch (error) {
  console.error('❌ Error converting Frida data:', error);
} 