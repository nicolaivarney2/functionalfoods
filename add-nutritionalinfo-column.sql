-- Add nutritionalinfo JSONB column to recipes table
ALTER TABLE recipes ADD COLUMN nutritionalinfo JSONB;

-- Add index for faster queries on nutritional data
CREATE INDEX idx_recipes_nutritionalinfo ON recipes USING GIN (nutritionalinfo);

-- Comment to explain the structure
COMMENT ON COLUMN recipes.nutritionalinfo IS 'Complete nutritional information with calories, protein, carbs, fat, fiber, vitamins, and minerals from Frida DTU database';