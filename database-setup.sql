-- 🛒 Supermarket Scraper Database Setup
-- Kør dette script i din Supabase SQL editor eller via psql

-- Opret tabel til supermarket produkter
CREATE TABLE IF NOT EXISTS supermarket_products (
  id SERIAL PRIMARY KEY,
  external_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  subcategory TEXT,
  price DECIMAL(10,2) NOT NULL,
  original_price DECIMAL(10,2),
  unit TEXT,
  amount DECIMAL(10,2),
  quantity DECIMAL(10,2),
  unit_price DECIMAL(10,2),
  currency TEXT DEFAULT 'DKK',
  is_on_sale BOOLEAN DEFAULT false,
  sale_end_date TIMESTAMP,
  image_url TEXT,
  store TEXT NOT NULL,
  available BOOLEAN DEFAULT true,
  temperature_zone TEXT,
  nutrition_info JSONB,
  labels TEXT[],
  metadata JSONB,
  source TEXT NOT NULL,
  last_updated TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Opret tabel til pris historik
CREATE TABLE IF NOT EXISTS supermarket_price_history (
  id SERIAL PRIMARY KEY,
  product_external_id TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  original_price DECIMAL(10,2),
  is_on_sale BOOLEAN DEFAULT false,
  sale_end_date TIMESTAMP,
  timestamp TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (product_external_id) REFERENCES supermarket_products(external_id) ON DELETE CASCADE
);

-- Opret indexes for bedre performance
CREATE INDEX IF NOT EXISTS idx_supermarket_products_external_id ON supermarket_products(external_id);
CREATE INDEX IF NOT EXISTS idx_supermarket_products_category ON supermarket_products(category);
CREATE INDEX IF NOT EXISTS idx_supermarket_products_store ON supermarket_products(store);
CREATE INDEX IF NOT EXISTS idx_supermarket_products_is_on_sale ON supermarket_products(is_on_sale);
CREATE INDEX IF NOT EXISTS idx_supermarket_products_last_updated ON supermarket_products(last_updated);

CREATE INDEX IF NOT EXISTS idx_price_history_product_id ON supermarket_price_history(product_external_id);
CREATE INDEX IF NOT EXISTS idx_price_history_timestamp ON supermarket_price_history(timestamp);

-- Opret RLS (Row Level Security) policies
ALTER TABLE supermarket_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE supermarket_price_history ENABLE ROW LEVEL SECURITY;

-- Policy: Alle kan læse produkter (public read)
CREATE POLICY "Allow public read access to supermarket products" ON supermarket_products
  FOR SELECT USING (true);

-- Policy: Kun service role kan skrive produkter
CREATE POLICY "Allow service role to manage supermarket products" ON supermarket_products
  FOR ALL USING (auth.role() = 'service_role');

-- Policy: Alle kan læse pris historik
CREATE POLICY "Allow public read access to price history" ON supermarket_price_history
  FOR SELECT USING (true);

-- Policy: Kun service role kan skrive pris historik
CREATE POLICY "Allow service role to manage price history" ON supermarket_price_history
  FOR ALL USING (auth.role() = 'service_role');

-- Opret funktion til at opdatere updated_at timestamp automatisk
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Opret trigger til at opdatere updated_at automatisk
CREATE TRIGGER update_supermarket_products_updated_at 
  BEFORE UPDATE ON supermarket_products 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Opret funktion til at rydde op i gammel pris historik (behold kun 30 dage)
CREATE OR REPLACE FUNCTION cleanup_old_price_history()
RETURNS void AS $$
BEGIN
  DELETE FROM supermarket_price_history 
  WHERE timestamp < NOW() - INTERVAL '30 days';
END;
$$ language 'plpgsql';

-- Opret en view til at se produkter med deres seneste pris
CREATE OR REPLACE VIEW supermarket_products_with_latest_price AS
SELECT 
  sp.*,
  ph.price as current_price,
  ph.original_price as current_original_price,
  ph.is_on_sale as current_is_on_sale,
  ph.sale_end_date as current_sale_end_date,
  ph.timestamp as price_updated_at
FROM supermarket_products sp
LEFT JOIN LATERAL (
  SELECT * FROM supermarket_price_history 
  WHERE product_external_id = sp.external_id 
  ORDER BY timestamp DESC 
  LIMIT 1
) ph ON true;

-- Opret en view til at se produkter på tilbud
CREATE OR REPLACE VIEW products_on_sale AS
SELECT 
  sp.*,
  ph.price as current_price,
  ph.original_price as current_original_price,
  ph.sale_end_date as current_sale_end_date,
  ph.timestamp as price_updated_at
FROM supermarket_products sp
LEFT JOIN LATERAL (
  SELECT * FROM supermarket_price_history 
  WHERE product_external_id = sp.external_id 
  ORDER BY timestamp DESC 
  LIMIT 1
) ph ON true
WHERE ph.is_on_sale = true;

-- Opret en view til at se pris statistikker
CREATE OR REPLACE VIEW price_statistics AS
SELECT 
  COUNT(*) as total_products,
  COUNT(CASE WHEN ph.is_on_sale THEN 1 END) as products_on_sale,
  AVG(ph.price) as average_price,
  MIN(ph.price) as min_price,
  MAX(ph.price) as max_price,
  COUNT(DISTINCT sp.category) as unique_categories,
  MAX(sp.last_updated) as last_update
FROM supermarket_products sp
LEFT JOIN LATERAL (
  SELECT * FROM supermarket_price_history 
  WHERE product_external_id = sp.external_id 
  ORDER BY timestamp DESC 
  LIMIT 1
) ph ON true;

-- Indsæt nogle eksempel produkter for testing (valgfrit)
INSERT INTO supermarket_products (
  external_id, 
  name, 
  description, 
  category, 
  subcategory, 
  price, 
  original_price, 
  unit, 
  unit_price, 
  is_on_sale, 
  store, 
  available, 
  source, 
  last_updated
) VALUES 
(
  'rema-304020',
  'ØKO. BANANER FAIRTRADE',
  'Oprindelsen kan være forskellig fra dag til dag. Bananerne kommer fra et af følgende lande: Domonikanske Republik el. Ecuador.',
  'Frugt & grønt',
  'Frugt',
  10.00,
  10.00,
  'bdt',
  10.00,
  false,
  'REMA 1000',
  true,
  'rema1000',
  NOW()
),
(
  'rema-440065',
  'LAKSEFILETER',
  'Ferske norske laksefiletportioner uden ben - superior kvalitet.',
  'Kød, fisk & fjerkræ',
  'Fisk',
  39.00,
  49.95,
  'kg',
  173.33,
  true,
  'REMA 1000',
  true,
  'rema1000',
  NOW()
)
ON CONFLICT (external_id) DO NOTHING;

-- Indsæt eksempel pris historik
INSERT INTO supermarket_price_history (
  product_external_id,
  price,
  original_price,
  is_on_sale,
  sale_end_date
) VALUES 
(
  'rema-304020',
  10.00,
  10.00,
  false,
  NULL
),
(
  'rema-440065',
  39.00,
  49.95,
  true,
  '2025-08-23 00:00:00'
)
ON CONFLICT DO NOTHING;

-- Vis resultatet
SELECT 'Database setup completed successfully!' as status;

-- Vis tabellerne
SELECT table_name, table_type 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 'supermarket%';

-- Vis views
SELECT table_name, table_type 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE '%sale%' OR table_name LIKE '%statistics%';

-- Test: Vis eksempel produkter
SELECT 
  external_id,
  name,
  category,
  price,
  is_on_sale,
  last_updated
FROM supermarket_products 
ORDER BY created_at DESC 
LIMIT 5;
