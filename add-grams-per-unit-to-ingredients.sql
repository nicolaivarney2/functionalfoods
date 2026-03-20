-- Standardvægt pr. stk (gram) for konvertering mellem gram og stk i indkøbsliste-priser.
-- Bruges fx: rødløg 80 g/stk, så 500 g pakke = 6,25 stk.
ALTER TABLE ingredients
ADD COLUMN IF NOT EXISTS grams_per_unit NUMERIC DEFAULT NULL;

COMMENT ON COLUMN ingredients.grams_per_unit IS 'Typisk vægt i gram pr. 1 stk (for grøntsager/frugt). Bruges til at konvertere mellem gram og stk i indkøbsliste-priser.';
