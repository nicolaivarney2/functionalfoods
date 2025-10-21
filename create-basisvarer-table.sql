-- Create user basisvarer table for saving specific supermarket products
-- This allows users to save actual products they always buy (not generic items)

CREATE TABLE IF NOT EXISTS user_basisvarer (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  product_id INTEGER REFERENCES supermarket_products(id) NOT NULL,
  quantity INTEGER DEFAULT 1,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, product_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_basisvarer_user_id ON user_basisvarer(user_id);
CREATE INDEX IF NOT EXISTS idx_user_basisvarer_product_id ON user_basisvarer(product_id);

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
