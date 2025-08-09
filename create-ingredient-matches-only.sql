-- Simple script to create only the ingredient_matches table
-- This table stores confirmed matches between recipe ingredients and Frida ingredients

CREATE TABLE IF NOT EXISTS ingredient_matches (
  id SERIAL PRIMARY KEY,
  recipe_ingredient_id TEXT NOT NULL,
  frida_ingredient_id TEXT NOT NULL,
  confidence INTEGER DEFAULT 100,
  is_manual BOOLEAN DEFAULT true,
  match_type TEXT DEFAULT 'manual',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure each recipe ingredient can only have one match
  UNIQUE(recipe_ingredient_id)
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_ingredient_matches_recipe_id ON ingredient_matches(recipe_ingredient_id);
CREATE INDEX IF NOT EXISTS idx_ingredient_matches_frida_id ON ingredient_matches(frida_ingredient_id);

-- Add comment
COMMENT ON TABLE ingredient_matches IS 'Stores confirmed matches between recipe ingredients and Frida DTU ingredients';