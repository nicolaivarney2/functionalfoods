-- Create function to count unique matched products
CREATE OR REPLACE FUNCTION count_unique_matched_products()
RETURNS INTEGER
LANGUAGE SQL
SECURITY DEFINER
AS $$
  SELECT COUNT(DISTINCT product_external_id)::INTEGER
  FROM product_ingredient_matches
  WHERE product_external_id IS NOT NULL;
$$;
