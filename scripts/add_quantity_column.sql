-- Add amount and quantity columns to supermarket_products table
ALTER TABLE supermarket_products 
ADD COLUMN IF NOT EXISTS amount INTEGER;

ALTER TABLE supermarket_products 
ADD COLUMN IF NOT EXISTS quantity TEXT;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_supermarket_products_amount ON supermarket_products(amount);
CREATE INDEX IF NOT EXISTS idx_supermarket_products_quantity ON supermarket_products(quantity);

-- Set default values for existing records
UPDATE supermarket_products 
SET amount = 1, quantity = '1 stk' 
WHERE amount IS NULL;

-- Make columns NOT NULL after setting defaults
ALTER TABLE supermarket_products 
ALTER COLUMN amount SET NOT NULL;

ALTER TABLE supermarket_products 
ALTER COLUMN amount SET DEFAULT 1;

ALTER TABLE supermarket_products 
ALTER COLUMN quantity SET NOT NULL;

ALTER TABLE supermarket_products 
ALTER COLUMN quantity SET DEFAULT '1 stk';

-- Verify the change
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'supermarket_products' 
AND column_name = 'quantity';

