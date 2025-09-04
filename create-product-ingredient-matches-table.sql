-- Create product_ingredient_matches table for linking products to ingredients
CREATE TABLE IF NOT EXISTS product_ingredient_matches (
  id SERIAL PRIMARY KEY,
  product_external_id TEXT NOT NULL,
  ingredient_id TEXT NOT NULL,
  confidence INTEGER DEFAULT 100,
  is_manual BOOLEAN DEFAULT false,
  match_type TEXT DEFAULT 'auto', -- 'auto', 'manual', 'ai'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Foreign key constraints
  FOREIGN KEY (product_external_id) REFERENCES supermarket_products(external_id) ON DELETE CASCADE,
  FOREIGN KEY (ingredient_id) REFERENCES ingredients(id) ON DELETE CASCADE,
  
  -- Unique constraint to prevent duplicate matches
  UNIQUE(product_external_id, ingredient_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_product_ingredient_matches_product ON product_ingredient_matches(product_external_id);
CREATE INDEX IF NOT EXISTS idx_product_ingredient_matches_ingredient ON product_ingredient_matches(ingredient_id);
CREATE INDEX IF NOT EXISTS idx_product_ingredient_matches_confidence ON product_ingredient_matches(confidence);
CREATE INDEX IF NOT EXISTS idx_product_ingredient_matches_type ON product_ingredient_matches(match_type);

-- Enable RLS
ALTER TABLE product_ingredient_matches ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access
CREATE POLICY "Allow public read access to product_ingredient_matches" ON product_ingredient_matches FOR SELECT USING (true);

-- Create policy for authenticated users to insert/update
CREATE POLICY "Allow authenticated users to insert product_ingredient_matches" ON product_ingredient_matches FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow authenticated users to update product_ingredient_matches" ON product_ingredient_matches FOR UPDATE USING (true);
CREATE POLICY "Allow authenticated users to delete product_ingredient_matches" ON product_ingredient_matches FOR DELETE USING (true);
