-- Hurtigere EAN-baseret billed-fallback (dagligvarer).
CREATE INDEX IF NOT EXISTS idx_products_ean_with_image
  ON public.products (ean)
  WHERE ean IS NOT NULL AND image_url IS NOT NULL AND btrim(image_url) <> '';
