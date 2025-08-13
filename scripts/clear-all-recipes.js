const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing environment variables');
  console.log('NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl);
  console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY:', !!supabaseKey);
  process.exit(1);
}

// Anon client should now work with RLS policies
const supabase = createClient(supabaseUrl, supabaseKey);

async function clearAllRecipes() {
  try {
    console.log('🧹 Starting complete recipe cleanup...');
    
    // First, get all recipe IDs
    const { data: recipes, error: fetchError } = await supabase
      .from('recipes')
      .select('id, title');
    
    if (fetchError) {
      console.error('❌ Error fetching recipes:', fetchError);
      return;
    }
    
    console.log(`📋 Found ${recipes.length} recipes to delete:`);
    recipes.forEach(recipe => {
      console.log(`  - ${recipe.id}: ${recipe.title}`);
    });
    
    if (recipes.length === 0) {
      console.log('✅ No recipes to delete');
      return;
    }
    
    // Try multiple deletion strategies
    console.log('🗑️  Attempting deletion...');
    
    // Strategy 1: Delete with neq condition
    const { error: deleteError1 } = await supabase
      .from('recipes')
      .delete()
      .neq('id', 'dummy');
    
    if (deleteError1) {
      console.log('⚠️  Strategy 1 failed:', deleteError1.message);
    } else {
      console.log('✅ Strategy 1 completed');
    }
    
    // Strategy 2: Delete with gte condition
    const { error: deleteError2 } = await supabase
      .from('recipes')
      .delete()
      .gte('id', '');
    
    if (deleteError2) {
      console.log('⚠️  Strategy 2 failed:', deleteError2.message);
    } else {
      console.log('✅ Strategy 2 completed');
    }
    
    // Strategy 3: Delete all records without conditions
    const { error: deleteError3 } = await supabase
      .from('recipes')
      .delete();
    
    if (deleteError3) {
      console.log('⚠️  Strategy 3 failed:', deleteError3.message);
    } else {
      console.log('✅ Strategy 3 completed');
    }
    
    // Verify deletion
    console.log('🔍 Verifying deletion...');
    const { data: remainingRecipes, error: verifyError } = await supabase
      .from('recipes')
      .select('id, title');
    
    if (verifyError) {
      console.error('❌ Error verifying deletion:', verifyError);
      return;
    }
    
    console.log(`📊 Verification: ${remainingRecipes.length} recipes remaining`);
    
    if (remainingRecipes.length > 0) {
      console.log('⚠️  Some recipes remain. Final cleanup attempt...');
      
      // Final attempt: Delete remaining recipes one by one
      for (const recipe of remainingRecipes) {
        console.log(`🗑️  Deleting recipe: ${recipe.id} - ${recipe.title}`);
        const { error: singleDeleteError } = await supabase
          .from('recipes')
          .delete()
          .eq('id', recipe.id);
        
        if (singleDeleteError) {
          console.error(`❌ Failed to delete ${recipe.id}:`, singleDeleteError.message);
        } else {
          console.log(`✅ Deleted ${recipe.id}`);
        }
      }
    }
    
    // Final verification
    const { data: finalRecipes, error: finalVerifyError } = await supabase
      .from('recipes')
      .select('id');
    
    if (finalVerifyError) {
      console.error('❌ Final verification failed:', finalVerifyError);
    } else {
      console.log(`🎯 Final result: ${finalRecipes.length} recipes remaining`);
      if (finalRecipes.length === 0) {
        console.log('🎉 SUCCESS: All recipes deleted!');
      } else {
        console.log('⚠️  Some recipes still remain');
      }
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

clearAllRecipes();
