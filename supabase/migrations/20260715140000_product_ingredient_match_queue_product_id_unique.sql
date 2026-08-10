-- Align FF match queue with fooddata: one row per product_id (required for pull upsert).
-- Replaces partial unique index (pending only) with full UNIQUE on product_id.

WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY product_id
      ORDER BY
        CASE status
          WHEN 'pending' THEN 0
          WHEN 'matched' THEN 1
          ELSE 2
        END,
        queued_at DESC
    ) AS rn
  FROM public.product_ingredient_match_queue
)
DELETE FROM public.product_ingredient_match_queue q
USING ranked r
WHERE q.id = r.id
  AND r.rn > 1;

DROP INDEX IF EXISTS public.product_ingredient_match_queue_one_pending_per_product;

ALTER TABLE public.product_ingredient_match_queue
  ADD CONSTRAINT product_ingredient_match_queue_product_id_key UNIQUE (product_id);

COMMENT ON TABLE public.product_ingredient_match_queue IS
  'Match-kø (vare → ingrediens). Én række pr. product_id — synket med fooddata.';
