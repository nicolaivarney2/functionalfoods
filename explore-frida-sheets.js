/**
 * Explore all sheets in Frida Excel file to find the data
 */

const XLSX = require('xlsx');

try {
  console.log('🔍 Exploring Frida Excel file sheets...');
  
  const workbook = XLSX.readFile('Frida_Dataset_May2025.xlsx');
  const sheetNames = workbook.SheetNames;
  
  console.log(`📋 Found ${sheetNames.length} sheets:`);
  
  sheetNames.forEach((sheetName, index) => {
    console.log(`\n${index + 1}. Sheet: "${sheetName}"`);
    
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet);
    
    console.log(`   Rows: ${jsonData.length}`);
    
    if (jsonData.length > 0) {
      const columns = Object.keys(jsonData[0]);
      console.log(`   Columns (${columns.length}): ${columns.slice(0, 5).join(', ')}${columns.length > 5 ? '...' : ''}`);
      
      // Look for food-related data
      const hasFood = columns.some(col => 
        col.toLowerCase().includes('food') || 
        col.toLowerCase().includes('name') ||
        col.toLowerCase().includes('mad') ||
        col.toLowerCase().includes('fødevare')
      );
      
      const hasNutrition = columns.some(col =>
        col.toLowerCase().includes('energy') ||
        col.toLowerCase().includes('protein') ||
        col.toLowerCase().includes('kcal') ||
        col.toLowerCase().includes('calories')
      );
      
      if (hasFood && hasNutrition) {
        console.log(`   🎯 This looks like FOOD DATA! ⭐`);
      } else if (hasFood) {
        console.log(`   🍽️ Has food names`);
      } else if (hasNutrition) {
        console.log(`   🥗 Has nutrition data`);
      }
      
      // Show sample data
      console.log(`   Sample: ${JSON.stringify(jsonData[0]).substring(0, 100)}...`);
    } else {
      console.log(`   (Empty sheet)`);
    }
  });
  
} catch (error) {
  console.error('❌ Error exploring Excel file:', error.message);
}