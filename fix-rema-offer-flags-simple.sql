-- SIMPLE FIX: Ret alle REMA offers baseret på prisforskellen
-- Kør denne query i Supabase SQL Editor

-- Først: Se hvor mange der skal rettes
SELECT 
  COUNT(*) as skal_retes,
  'Produkter der skal markeres som på tilbud' as beskrivelse
FROM product_offers
WHERE store_id = 'rema-1000'
  AND normal_price IS NOT NULL
  AND current_price IS NOT NULL
  AND normal_price > current_price
  AND (is_on_sale = false OR is_on_sale IS NULL)

UNION ALL

SELECT 
  COUNT(*) as skal_retes,
  'Produkter der skal fjernes fra tilbud' as beskrivelse
FROM product_offers
WHERE store_id = 'rema-1000'
  AND normal_price IS NOT NULL
  AND current_price IS NOT NULL
  AND normal_price <= current_price
  AND is_on_sale = true;

-- Hvis ovenstående viser produkter der skal rettes, kør så denne:

-- RET ALLE PRODUKTER DER SKAL VÆRE PÅ TILBUD
UPDATE product_offers
SET 
  is_on_sale = true,
  discount_percentage = ROUND(((normal_price - current_price) / normal_price) * 100),
  updated_at = NOW()
WHERE store_id = 'rema-1000'
  AND normal_price IS NOT NULL
  AND current_price IS NOT NULL
  AND normal_price > current_price
  AND (is_on_sale = false OR is_on_sale IS NULL);

-- RET ALLE PRODUKTER DER IKKE SKAL VÆRE PÅ TILBUD
UPDATE product_offers
SET 
  is_on_sale = false,
  discount_percentage = NULL,
  updated_at = NOW()
WHERE store_id = 'rema-1000'
  AND normal_price IS NOT NULL
  AND current_price IS NOT NULL
  AND normal_price <= current_price
  AND is_on_sale = true;

-- VERIFIKATION: Tjek resultatet
SELECT 
  COUNT(*) as total_offers,
  COUNT(CASE WHEN is_on_sale = true THEN 1 END) as på_tilbud,
  COUNT(CASE WHEN normal_price > current_price AND is_on_sale = true THEN 1 END) as korrekt_markeret_tilbud,
  COUNT(CASE WHEN normal_price <= current_price AND is_on_sale = false THEN 1 END) as korrekt_ikke_tilbud,
  COUNT(CASE WHEN normal_price > current_price AND is_on_sale = false THEN 1 END) as FEJL_ikke_markeret,
  COUNT(CASE WHEN normal_price <= current_price AND is_on_sale = true THEN 1 END) as FEJL_forkert_markeret
FROM product_offers
WHERE store_id = 'rema-1000'
  AND normal_price IS NOT NULL
  AND current_price IS NOT NULL;
