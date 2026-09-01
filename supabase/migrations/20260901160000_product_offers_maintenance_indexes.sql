-- FF product_offers: indexes til vedligehold og butiksfiltre.
--
-- Tabellen havde kun indexes til visnings-queries (is_available/is_offer_active,
-- product_id, sortering, trgm på name_store). Alt vedligehold der filtrerer på
-- store_id, source, is_on_sale eller last_seen_at lavede derfor seq scan over
-- ~125k rækker og ramte statement_timeout — det var netop dem der fejlede i
-- Fooddata→FF-importens oprydning ("statement timeout" på sleep stale / cleanup).
--
-- Importens sweep er skrevet om til at paginere på primærnøglen og er derfor ikke
-- afhængig af disse indexes, men de gør ad-hoc oprydning, launch-health og
-- butiksfiltrerede tilbuds-queries billige igen.

-- Aktive tilbud pr. butik (launch-health, tilbudsfiltre, oprydning).
CREATE INDEX IF NOT EXISTS idx_product_offers_store_on_sale
  ON public.product_offers (store_id, is_on_sale);

-- "Hvad er forældet?" — last_seen_at pr. butik.
CREATE INDEX IF NOT EXISTS idx_product_offers_store_last_seen
  ON public.product_offers (store_id, last_seen_at);

-- Kildefiltre: goma-på-Salling, Tjek-overlay pr. kæde, sunset-oprydning.
CREATE INDEX IF NOT EXISTS idx_product_offers_source_store
  ON public.product_offers (source, store_id);

-- Udløbne tilbud (kun rækker der stadig påstår at være på tilbud).
CREATE INDEX IF NOT EXISTS idx_product_offers_expiring_sales
  ON public.product_offers (sale_valid_to)
  WHERE is_on_sale = true;

-- EAN-baseret billed-fallback. idx_products_ean_with_image (juni) kan ikke
-- bruges: dens WHERE indeholder btrim(image_url) <> '', som PostgREST-queryen
-- (.in('ean', …).not('image_url','is',null)) ikke kan udtrykke, så planneren
-- kan ikke bevise at det partielle index dækker. Resultatet er et seq scan
-- over ~103k rækker og statement_timeout selv for ét enkelt EAN. Predikatet
-- her er implicit opfyldt af .in('ean', …).
CREATE INDEX IF NOT EXISTS idx_products_ean_lookup
  ON public.products (ean)
  WHERE ean IS NOT NULL;
