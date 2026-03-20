-- Add isBasis column to ingredients table
ALTER TABLE ingredients 
ADD COLUMN IF NOT EXISTS is_basis BOOLEAN DEFAULT false;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_ingredients_is_basis ON ingredients(is_basis);
