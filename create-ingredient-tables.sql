-- Create ingredient_matches table
CREATE TABLE IF NOT EXISTS ingredient_matches (
  id SERIAL PRIMARY KEY,
  recipe_ingredient_id TEXT NOT NULL,
  frida_ingredient_id TEXT NOT NULL,
  confidence INTEGER DEFAULT 100,
  is_manual BOOLEAN DEFAULT false,
  match_type TEXT DEFAULT 'auto',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create frida_ingredients table if it doesn't exist
CREATE TABLE IF NOT EXISTS frida_ingredients (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT,
  calories NUMERIC,
  protein NUMERIC,
  carbs NUMERIC,
  fat NUMERIC,
  fiber NUMERIC,
  vitamins JSONB,
  minerals JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create ingredients table if it doesn't exist
CREATE TABLE IF NOT EXISTS ingredients (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT,
  description TEXT,
  exclusions TEXT[],
  allergens TEXT[],
  common_names TEXT[],
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add some sample data to ingredients table
INSERT INTO ingredients (id, name, category, description) VALUES
('kylling', 'Kylling', 'kød', 'Frisk kyllingekød'),
('gulerod', 'Gulerod', 'grøntsager', 'Friske gulerødder'),
('løg', 'Løg', 'grøntsager', 'Hvidløg eller rødløg'),
('hvidløg', 'Hvidløg', 'krydderier', 'Frisk hvidløg'),
('olivenolie', 'Olivenolie', 'fedtstoffer', 'Ekstra virgin olivenolie'),
('salt', 'Salt', 'krydderier', 'Bord salt'),
('peber', 'Peber', 'krydderier', 'Sort peber'),
('tomat', 'Tomat', 'grøntsager', 'Friske tomater'),
('ost', 'Ost', 'mælkeprodukter', 'Grevet ost'),
('fløde', 'Fløde', 'mælkeprodukter', 'Piskefløde')
ON CONFLICT (id) DO NOTHING;

-- Add some sample data to frida_ingredients table
INSERT INTO frida_ingredients (id, name, category, calories, protein, carbs, fat) VALUES
('kylling-frida', 'Kylling, kød', 'kød', 165, 31, 0, 3.6),
('gulerod-frida', 'Gulerod, rå', 'grøntsager', 41, 0.9, 9.6, 0.2),
('løg-frida', 'Løg, rå', 'grøntsager', 40, 1.1, 9.3, 0.1),
('hvidløg-frida', 'Hvidløg, rå', 'krydderier', 149, 6.4, 33.1, 0.5),
('olivenolie-frida', 'Olivenolie', 'fedtstoffer', 884, 0, 0, 100),
('salt-frida', 'Salt', 'krydderier', 0, 0, 0, 0),
('peber-frida', 'Peber, sort', 'krydderier', 251, 10.4, 64.8, 3.3),
('tomat-frida', 'Tomat, rå', 'grøntsager', 18, 0.9, 3.9, 0.2),
('ost-frida', 'Ost, cheddar', 'mælkeprodukter', 403, 25, 1.3, 33),
('fløde-frida', 'Fløde, piskefløde 38%', 'mælkeprodukter', 345, 2.1, 2.8, 38)
ON CONFLICT (id) DO NOTHING;

-- Verify the tables were created
SELECT 
  table_name,
  column_name,
  data_type
FROM information_schema.columns 
WHERE table_name IN ('ingredient_matches', 'frida_ingredients', 'ingredients')
ORDER BY table_name, ordinal_position;

-- Show sample data
SELECT 'ingredients' as table_name, COUNT(*) as count FROM ingredients
UNION ALL
SELECT 'frida_ingredients' as table_name, COUNT(*) as count FROM frida_ingredients
UNION ALL
SELECT 'ingredient_matches' as table_name, COUNT(*) as count FROM ingredient_matches;
