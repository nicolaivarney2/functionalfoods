-- 🛒 Database Migration - Add Missing Columns
-- Kør dette script i din Supabase SQL editor

-- Tilføj manglende kolonner til supermarket_products tabellen
ALTER TABLE supermarket_products
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'DKK',
ADD COLUMN IF NOT EXISTS amount DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS quantity DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS store_url TEXT,
  ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Opdater eksisterende rækker med default værdier
UPDATE supermarket_products
SET currency = 'DKK'
WHERE currency IS NULL;

-- 📈 Tilføj interessant prishistorik test data for JORDBÆRMARMELADE (python-100004)
INSERT INTO supermarket_price_history (product_external_id, price, original_price, is_on_sale, sale_end_date, timestamp) VALUES
-- Sidste 4 uger prisudvikling for jordbærmarmelade - realistisk prisstigninger/fald
('python-100004', 21.50, 21.50, false, '2099-12-31T00:00:00', '2025-07-20T10:00:00'),  -- Start lavere
('python-100004', 21.95, 21.95, false, '2099-12-31T00:00:00', '2025-07-25T14:30:00'),  -- Lille stigning
('python-100004', 19.95, 21.95, true, '2025-08-05T00:00:00', '2025-08-01T09:15:00'),   -- Tilbud!
('python-100004', 19.95, 21.95, true, '2025-08-05T00:00:00', '2025-08-03T16:45:00'),   -- Tilbud fortsætter
('python-100004', 22.95, 22.95, false, '2099-12-31T00:00:00', '2025-08-06T11:20:00'),  -- Back to normal + lidt højere
('python-100004', 24.95, 24.95, false, '2099-12-31T00:00:00', '2025-08-10T13:00:00'),  -- Prisstigninger
('python-100004', 23.50, 24.95, true, '2025-08-15T00:00:00', '2025-08-12T08:30:00'),   -- Lille tilbud
('python-100004', 23.95, 23.95, false, '2099-12-31T00:00:00', '2025-08-16T12:00:00');  -- Aktuel pris

-- 🚨 FIX RLS PROBLEM - Tillad API skrivning
-- Opret en policy der tillader vores API at skrive produkter
-- Først fjern eksisterende policies hvis de findes
DROP POLICY IF EXISTS "Allow API to insert products" ON supermarket_products;
DROP POLICY IF EXISTS "Allow API to update products" ON supermarket_products;
DROP POLICY IF EXISTS "Allow API to insert price history" ON supermarket_price_history;

-- Opret nye policies
CREATE POLICY "Allow API to insert products" ON supermarket_products
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow API to update products" ON supermarket_products
  FOR UPDATE USING (true);

CREATE POLICY "Allow API to insert price history" ON supermarket_price_history
  FOR INSERT WITH CHECK (true);

-- Alternativt: Midlertidigt disable RLS for testing (fjern denne linje før production!)
-- ALTER TABLE supermarket_products DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE supermarket_price_history DISABLE ROW LEVEL SECURITY;

