-- SQL script to create the necessary tables for ingredient matching system
-- Run this in your Supabase SQL editor

-- 1. Create frida_ingredients table (for the full Frida DTU database)
CREATE TABLE IF NOT EXISTS frida_ingredients (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT,
  description TEXT,
  
  -- Basic nutrition (per 100g)
  calories NUMERIC,
  protein NUMERIC,
  carbs NUMERIC,
  fat NUMERIC,
  fiber NUMERIC,
  
  -- Vitamins (per 100g) - stored as JSONB for flexibility
  vitamins JSONB DEFAULT '{}',
  
  -- Minerals (per 100g) - stored as JSONB for flexibility  
  minerals JSONB DEFAULT '{}',
  
  -- Metadata
  source TEXT DEFAULT 'frida_dtu',
  frida_id TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Search and matching fields
  normalized_name TEXT,
  search_terms TEXT[],
  exclusions TEXT[] DEFAULT '{}',
  allergens TEXT[] DEFAULT '{}',
  common_names TEXT[] DEFAULT '{}'
);

-- 2. Create ingredient_matches table (to store confirmed matches)
CREATE TABLE IF NOT EXISTS ingredient_matches (
  id SERIAL PRIMARY KEY,
  recipe_ingredient_id TEXT NOT NULL,
  frida_ingredient_id TEXT NOT NULL,
  confidence INTEGER DEFAULT 100,
  is_manual BOOLEAN DEFAULT true,
  match_type TEXT DEFAULT 'manual', -- 'exact', 'synonym', 'fuzzy', 'category', 'manual'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure each recipe ingredient can only have one match
  UNIQUE(recipe_ingredient_id)
);

-- 3. Add foreign key constraints (optional, for data integrity)
-- Note: Uncomment these if you want strict referential integrity
-- ALTER TABLE ingredient_matches 
-- ADD CONSTRAINT fk_recipe_ingredient 
-- FOREIGN KEY (recipe_ingredient_id) REFERENCES ingredients(id) ON DELETE CASCADE;

-- ALTER TABLE ingredient_matches 
-- ADD CONSTRAINT fk_frida_ingredient 
-- FOREIGN KEY (frida_ingredient_id) REFERENCES frida_ingredients(id) ON DELETE CASCADE;

-- 4. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_frida_ingredients_name ON frida_ingredients(name);
CREATE INDEX IF NOT EXISTS idx_frida_ingredients_category ON frida_ingredients(category);
CREATE INDEX IF NOT EXISTS idx_frida_ingredients_normalized_name ON frida_ingredients(normalized_name);
CREATE INDEX IF NOT EXISTS idx_frida_ingredients_is_active ON frida_ingredients(is_active);

CREATE INDEX IF NOT EXISTS idx_ingredient_matches_recipe_ingredient ON ingredient_matches(recipe_ingredient_id);
CREATE INDEX IF NOT EXISTS idx_ingredient_matches_frida_ingredient ON ingredient_matches(frida_ingredient_id);

-- 5. Create a view for easy querying of matched ingredients
CREATE OR REPLACE VIEW ingredient_matches_with_details AS
SELECT 
  im.*,
  i.name as recipe_ingredient_name,
  i.category as recipe_ingredient_category,
  fi.name as frida_ingredient_name,
  fi.category as frida_ingredient_category,
  fi.calories,
  fi.protein,
  fi.carbs,
  fi.fat,
  fi.fiber,
  fi.vitamins,
  fi.minerals
FROM ingredient_matches im
LEFT JOIN ingredients i ON im.recipe_ingredient_id = i.id
LEFT JOIN frida_ingredients fi ON im.frida_ingredient_id = fi.id;

-- 6. Insert sample Frida ingredients (the mock data we're using)
INSERT INTO frida_ingredients (
  id, name, category, description, calories, protein, carbs, fat, fiber, 
  vitamins, minerals, source, frida_id, is_active, created_at, updated_at
) VALUES 
  (
    'frida-mandel-raa',
    'Mandel, rå',
    'nødder',
    'Rå mandler fra Frida DTU database',
    579,
    21.15,
    21.55,
    49.93,
    12.5,
    '{"E": 25.63, "B3": 3.618, "B2": 1.138, "B1": 0.211}',
    '{"calcium": 269, "magnesium": 270, "phosphor": 481, "potassium": 733, "iron": 3.71}',
    'frida_dtu',
    'mandel_raa_001',
    true,
    '2024-01-01T00:00:00.000Z',
    '2024-01-01T00:00:00.000Z'
  ),
  (
    'frida-olie-oliven',
    'Olie, oliven',
    'fedtstoffer',
    'Olivenolie fra Frida DTU database',
    884,
    0,
    0,
    100,
    0,
    '{"E": 14.35, "K": 60.2}',
    '{}',
    'frida_dtu',
    'olie_oliven_001',
    true,
    '2024-01-01T00:00:00.000Z',
    '2024-01-01T00:00:00.000Z'
  ),
  (
    'frida-kyllingebryst-kogt',
    'Kyllingebryst, kogt',
    'kød',
    'Kogt kyllingebryst fra Frida DTU database',
    165,
    31.02,
    0,
    3.57,
    0,
    '{"B3": 14.772, "B6": 0.6, "B12": 0.34, "B1": 0.07}',
    '{"phosphor": 220, "potassium": 256, "sodium": 74, "selenium": 27.4}',
    'frida_dtu',
    'kyllingebryst_kogt_001',
    true,
    '2024-01-01T00:00:00.000Z',
    '2024-01-01T00:00:00.000Z'
  ),
  (
    'frida-tomat-raa',
    'Tomat, rå',
    'grøntsager',
    'Friske tomater fra Frida DTU database',
    18,
    0.88,
    3.89,
    0.2,
    1.2,
    '{"C": 14, "A": 833, "K": 7.9, "B6": 0.08}',
    '{"potassium": 237, "phosphor": 24, "calcium": 10, "magnesium": 11}',
    'frida_dtu',
    'tomat_raa_001',
    true,
    '2024-01-01T00:00:00.000Z',
    '2024-01-01T00:00:00.000Z'
  ),
  (
    'frida-ost-cheddar',
    'Ost, cheddar',
    'mejeriprodukter',
    'Cheddar ost fra Frida DTU database',
    403,
    24.9,
    1.28,
    33.14,
    0,
    '{"A": 1242, "B12": 0.83, "B2": 0.375, "B6": 0.066}',
    '{"calcium": 721, "phosphor": 512, "sodium": 621, "zinc": 3.11}',
    'frida_dtu',
    'ost_cheddar_001',
    true,
    '2024-01-01T00:00:00.000Z',
    '2024-01-01T00:00:00.000Z'
  ),
  (
    'frida-hvidloeg-raa',
    'Hvidløg, rå',
    'grøntsager',
    'Frisk hvidløg fra Frida DTU database',
    149,
    6.36,
    33.06,
    0.5,
    2.1,
    '{"C": 31.2, "B6": 1.235, "B1": 0.2}',
    '{"potassium": 401, "phosphor": 153, "calcium": 181, "magnesium": 25}',
    'frida_dtu',
    'hvidloeg_raa_001',
    true,
    '2024-01-01T00:00:00.000Z',
    '2024-01-01T00:00:00.000Z'
  ),
  (
    'frida-aeble-raa',
    'Æble, rå, med skræl',
    'frugt',
    'Friske æbler med skræl fra Frida DTU database',
    52,
    0.26,
    13.81,
    0.17,
    2.4,
    '{"C": 4.6, "A": 54, "K": 2.2}',
    '{"potassium": 107, "phosphor": 11, "calcium": 6, "magnesium": 5}',
    'frida_dtu',
    'aeble_raa_001',
    true,
    '2024-01-01T00:00:00.000Z',
    '2024-01-01T00:00:00.000Z'
  ),
  (
    'frida-basilikum-frisk',
    'Basilikum, frisk',
    'krydderier',
    'Frisk basilikum fra Frida DTU database',
    22,
    3.15,
    2.65,
    0.64,
    1.6,
    '{"C": 18.0, "A": 5275, "K": 414.8, "B6": 0.155}',
    '{"potassium": 295, "calcium": 177, "magnesium": 64, "iron": 3.17}',
    'frida_dtu',
    'basilikum_frisk_001',
    true,
    '2024-01-01T00:00:00.000Z',
    '2024-01-01T00:00:00.000Z'
  ),
  (
    'frida-spinat-raa',
    'Spinat, rå',
    'grøntsager',
    'Frisk spinat fra Frida DTU database',
    23,
    2.86,
    3.63,
    0.39,
    2.2,
    '{"C": 28.1, "A": 9377, "K": 482.9, "Folate": 194}',
    '{"potassium": 558, "calcium": 99, "magnesium": 79, "iron": 2.71}',
    'frida_dtu',
    'spinat_raa_001',
    true,
    '2024-01-01T00:00:00.000Z',
    '2024-01-01T00:00:00.000Z'
  ),
  (
    'frida-laks-raa',
    'Laks, rå',
    'fisk',
    'Rå laks fra Frida DTU database',
    208,
    25.44,
    0,
    12.35,
    0,
    '{"D": 11.0, "B12": 2.8, "B3": 8.042, "B6": 0.8}',
    '{"potassium": 363, "phosphor": 371, "selenium": 36.5, "calcium": 9}',
    'frida_dtu',
    'laks_raa_001',
    true,
    '2024-01-01T00:00:00.000Z',
    '2024-01-01T00:00:00.000Z'
  )
ON CONFLICT (id) DO NOTHING; -- Don't insert if already exists

-- 7. Show success message
SELECT 'Database tables created successfully!' as message;
SELECT 'Sample Frida ingredients inserted!' as message;
SELECT COUNT(*) || ' Frida ingredients in database' as message FROM frida_ingredients;