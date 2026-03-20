-- Add is_offer_active to product_offers for fast offer filtering
ALTER TABLE product_offers
ADD COLUMN IF NOT EXISTS is_offer_active BOOLEAN DEFAULT false;

-- Optional: index for fast offer queries
CREATE INDEX IF NOT EXISTS idx_product_offers_is_offer_active
  ON product_offers(is_offer_active);

-- Backfill existing rows (best effort based on current data)
-- Active if: (sale_valid_to is null OR sale_valid_to >= now) AND (is_on_sale OR normal_price > current_price)
UPDATE product_offers
SET is_offer_active = (
  (sale_valid_to IS NULL OR sale_valid_to >= NOW())
  AND (
    is_on_sale = true
    OR (normal_price IS NOT NULL AND current_price IS NOT NULL AND normal_price > current_price)
  )
)
WHERE is_offer_active IS DISTINCT FROM (
  (sale_valid_to IS NULL OR sale_valid_to >= NOW())
  AND (
    is_on_sale = true
    OR (normal_price IS NOT NULL AND current_price IS NOT NULL AND normal_price > current_price)
  )
);
