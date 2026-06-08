-- Tags på VARER til indkøbsliste-økologi (ikke ingredienser)
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS organic_tags text[] DEFAULT ARRAY[]::text[];

COMMENT ON COLUMN public.products.organic_tags IS
  'organic-priority = øko i navn. organic-animal = øko i navn + mejeri/kød. Sat af oko-scan-products.';

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS labels text[] DEFAULT ARRAY[]::text[];

CREATE INDEX IF NOT EXISTS idx_products_organic_tags
  ON public.products USING GIN (organic_tags);
