-- Delete all recipes from database
-- Run this in your Supabase SQL editor

-- First, let's see how many recipes we have
SELECT COUNT(*) as total_recipes FROM recipes;

-- Delete all recipes
DELETE FROM recipes;

-- Verify deletion
SELECT COUNT(*) as remaining_recipes FROM recipes;

-- Should return 0
