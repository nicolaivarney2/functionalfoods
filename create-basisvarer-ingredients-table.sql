-- 🛒 Basisvarer System - Ingredient-based
-- Kør dette script i din Supabase SQL editor

-- Drop existing table if it exists (be careful in production!)
DROP TABLE IF EXISTS user_basisvarer CASCADE;

-- Create new ingredient-based basisvarer table
CREATE TABLE IF NOT EXISTS user_basisvarer (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  ingredient_name TEXT NOT NULL, -- "Mælk", "Brød", "Æg", etc.
  quantity INTEGER DEFAULT 1,
  unit TEXT DEFAULT 'stk', -- "stk", "kg", "L", etc.
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, ingredient_name)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_basisvarer_user_id ON user_basisvarer(user_id);
CREATE INDEX IF NOT EXISTS idx_user_basisvarer_ingredient ON user_basisvarer(ingredient_name);

-- Enable RLS (Row Level Security)
ALTER TABLE user_basisvarer ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own basisvarer" ON user_basisvarer 
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own basisvarer" ON user_basisvarer 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own basisvarer" ON user_basisvarer 
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own basisvarer" ON user_basisvarer 
  FOR DELETE USING (auth.uid() = user_id);

-- Create function to update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_user_basisvarer_updated_at 
  BEFORE UPDATE ON user_basisvarer 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Insert some common ingredients for testing
INSERT INTO user_basisvarer (user_id, ingredient_name, quantity, unit, notes) VALUES
  ('00000000-0000-0000-0000-000000000000', 'Mælk', 1, 'L', 'Altid mælk på listen'),
  ('00000000-0000-0000-0000-000000000000', 'Brød', 1, 'stk', 'Rugbrød eller franskbrød'),
  ('00000000-0000-0000-0000-000000000000', 'Æg', 6, 'stk', 'Friske æg'),
  ('00000000-0000-0000-0000-000000000000', 'Smør', 1, 'pakke', 'Salted smør')
ON CONFLICT (user_id, ingredient_name) DO NOTHING;