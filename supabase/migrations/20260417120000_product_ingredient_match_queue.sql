-- Kø: nye produkter fra Goma-sync der endnu ikke er koblet til en ingrediens.
-- Kun rækker indsat efter denne migration + ny import logik (ingen bagudfyldning).

CREATE TABLE IF NOT EXISTS public.product_ingredient_match_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  store_product_id TEXT NOT NULL,
  store_id TEXT NOT NULL,
  product_name_snapshot TEXT,
  queued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'matched', 'dismissed')),
  resolved_at TIMESTAMPTZ
);

COMMENT ON TABLE public.product_ingredient_match_queue IS
  'Nye Goma-katalogprodukter der afventer manuel kobling til ingrediens (vare → ingrediens).';

-- Én aktiv pending pr. product_id (globalt vare-id)
CREATE UNIQUE INDEX IF NOT EXISTS product_ingredient_match_queue_one_pending_per_product
  ON public.product_ingredient_match_queue (product_id)
  WHERE (status = 'pending');

CREATE INDEX IF NOT EXISTS product_ingredient_match_queue_pending_queued
  ON public.product_ingredient_match_queue (queued_at DESC)
  WHERE (status = 'pending');

ALTER TABLE public.product_ingredient_match_queue ENABLE ROW LEVEL SECURITY;
