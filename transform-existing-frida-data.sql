-- Transform existing Frida data to frida_ingredients table
-- This copies from your existing frida_foods and frida_nutrition_values tables

-- First, let's see what we have
SELECT 'Current frida_foods count:' as info, COUNT(*) as count FROM frida_foods;
SELECT 'Current frida_nutrition_values count:' as info, COUNT(*) as count FROM frida_nutrition_values;
SELECT 'Current frida_ingredients count:' as info, COUNT(*) as count FROM frida_ingredients;

-- Transform frida_foods to frida_ingredients
-- (Adjust column names based on your actual table structure)
INSERT INTO frida_ingredients (
  id,
  name, 
  category,
  description,
  calories,
  protein,
  carbs,
  fat,
  fiber,
  vitamins,
  minerals,
  source,
  frida_id,
  is_active,
  created_at,
  updated_at
)
SELECT 
  -- Generate unique ID
  'frida-' || LOWER(REGEXP_REPLACE(COALESCE(food_name, name, 'unknown'), '[^a-zæøå0-9]', '-', 'g')) || '-' || EXTRACT(EPOCH FROM NOW())::bigint as id,
  
  -- Basic info
  COALESCE(food_name, name, 'Unknown Food') as name,
  COALESCE(food_group, category, 'andre') as category,
  COALESCE(food_name, name, 'Unknown Food') || ' fra Frida DTU database' as description,
  
  -- Basic nutrition (adjust column names to match your table)
  COALESCE(energy_kcal, energy, calories, 0)::numeric as calories,
  COALESCE(protein, 0)::numeric as protein,
  COALESCE(carbohydrate, carbs, carbohydrates, 0)::numeric as carbs,
  COALESCE(fat, fats, 0)::numeric as fat,
  COALESCE(fiber, dietary_fiber, 0)::numeric as fiber,
  
  -- Vitamins (create JSON from available vitamin columns)
  jsonb_build_object(
    'A', COALESCE(vitamin_a, 0),
    'C', COALESCE(vitamin_c, 0),
    'D', COALESCE(vitamin_d, 0),
    'E', COALESCE(vitamin_e, 0),
    'B1', COALESCE(thiamine, vitamin_b1, 0),
    'B2', COALESCE(riboflavin, vitamin_b2, 0),
    'B3', COALESCE(niacin, vitamin_b3, 0),
    'B6', COALESCE(vitamin_b6, 0),
    'B12', COALESCE(vitamin_b12, 0),
    'Folate', COALESCE(folate, 0)
  ) as vitamins,
  
  -- Minerals (create JSON from available mineral columns)
  jsonb_build_object(
    'calcium', COALESCE(calcium, 0),
    'iron', COALESCE(iron, 0),
    'magnesium', COALESCE(magnesium, 0),
    'phosphor', COALESCE(phosphorus, phosphor, 0),
    'potassium', COALESCE(potassium, 0),
    'sodium', COALESCE(sodium, 0),
    'zinc', COALESCE(zinc, 0),
    'selenium', COALESCE(selenium, 0)
  ) as minerals,
  
  -- Metadata
  'frida_dtu' as source,
  COALESCE(food_id, id)::text as frida_id,
  true as is_active,
  NOW() as created_at,
  NOW() as updated_at

FROM frida_foods f
-- Left join with nutrition values if they're in separate table
-- LEFT JOIN frida_nutrition_values n ON f.food_id = n.food_id
WHERE 
  COALESCE(food_name, name) IS NOT NULL
  AND COALESCE(food_name, name) != ''
LIMIT 1000; -- Start with first 1000 to test

-- Check results
SELECT 'New frida_ingredients count:' as info, COUNT(*) as count FROM frida_ingredients;
SELECT 'Sample entries:' as info;
SELECT name, category, calories, protein FROM frida_ingredients ORDER BY name LIMIT 10;