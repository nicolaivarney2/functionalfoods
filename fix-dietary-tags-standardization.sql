-- 🔧 Standardiser dietary tags til de korrekte navne
-- Dette sikrer konsistens i tag-navne baseret på recipe-tag-mapper.ts

-- ========================================
-- STANDARDISER GLP-1 TAGS
-- ========================================
-- Erstat alle varianter med "GLP-1 kost"
UPDATE recipes
SET "dietaryCategories" = (
  SELECT jsonb_agg(
    CASE 
      WHEN value::text ILIKE '%glp-1%' OR value::text ILIKE '%glp1%' 
      THEN '"GLP-1 kost"'::jsonb
      ELSE value
    END
  )
  FROM jsonb_array_elements("dietaryCategories")
)
WHERE "dietaryCategories" IS NOT NULL
  AND "dietaryCategories"::text ILIKE '%glp%';

-- ========================================
-- STANDARDISER SENSE TAGS
-- ========================================
-- Erstat alle varianter med "Sense"
UPDATE recipes
SET "dietaryCategories" = (
  SELECT jsonb_agg(
    CASE 
      WHEN value::text ILIKE '%sense%' 
      THEN '"Sense"'::jsonb
      ELSE value
    END
  )
  FROM jsonb_array_elements("dietaryCategories")
)
WHERE "dietaryCategories" IS NOT NULL
  AND "dietaryCategories"::text ILIKE '%sense%';

-- ========================================
-- STANDARDISER ANTIINFLAMMATORISK TAGS
-- ========================================
-- Erstat alle varianter med "Antiinflammatorisk"
UPDATE recipes
SET "dietaryCategories" = (
  SELECT jsonb_agg(
    CASE 
      WHEN value::text ILIKE '%anti%inflammatorisk%' 
         OR value::text ILIKE '%anti-inflammatorisk%'
         OR value::text ILIKE '%anti inflammatorisk%'
      THEN '"Antiinflammatorisk"'::jsonb
      ELSE value
    END
  )
  FROM jsonb_array_elements("dietaryCategories")
)
WHERE "dietaryCategories" IS NOT NULL
  AND ("dietaryCategories"::text ILIKE '%anti%inflammatorisk%'
       OR "dietaryCategories"::text ILIKE '%anti-inflammatorisk%');

-- ========================================
-- STANDARDISER FLEKSITARISK TAGS
-- ========================================
UPDATE recipes
SET "dietaryCategories" = (
  SELECT jsonb_agg(
    CASE 
      WHEN value::text ILIKE '%fleksitarisk%' 
      THEN '"Fleksitarisk"'::jsonb
      ELSE value
    END
  )
  FROM jsonb_array_elements("dietaryCategories")
)
WHERE "dietaryCategories" IS NOT NULL
  AND "dietaryCategories"::text ILIKE '%fleksitarisk%';

-- ========================================
-- STANDARDISER 5:2 TAGS
-- ========================================
-- Erstat "5-2" med "5:2"
UPDATE recipes
SET "dietaryCategories" = (
  SELECT jsonb_agg(
    CASE 
      WHEN value::text ILIKE '%5-2%' OR value::text ILIKE '%5:2%'
      THEN '"5:2"'::jsonb
      ELSE value
    END
  )
  FROM jsonb_array_elements("dietaryCategories")
)
WHERE "dietaryCategories" IS NOT NULL
  AND ("dietaryCategories"::text ILIKE '%5-2%'
       OR "dietaryCategories"::text ILIKE '%5:2%');

-- ========================================
-- STANDARDISER MEAL PREP TAGS
-- ========================================
-- Erstat alle varianter med "Meal prep"
UPDATE recipes
SET "dietaryCategories" = (
  SELECT jsonb_agg(
    CASE 
      WHEN value::text ILIKE '%meal-prep%' 
         OR value::text ILIKE '%mealprep%'
         OR value::text ILIKE '%meal prep%'
      THEN '"Meal prep"'::jsonb
      ELSE value
    END
  )
  FROM jsonb_array_elements("dietaryCategories")
)
WHERE "dietaryCategories" IS NOT NULL
  AND ("dietaryCategories"::text ILIKE '%meal-prep%'
       OR "dietaryCategories"::text ILIKE '%mealprep%'
       OR "dietaryCategories"::text ILIKE '%meal prep%');

-- ========================================
-- FJERN DUPLIKATER
-- ========================================
UPDATE recipes
SET "dietaryCategories" = (
  SELECT jsonb_agg(DISTINCT value ORDER BY value)
  FROM jsonb_array_elements("dietaryCategories")
)
WHERE "dietaryCategories" IS NOT NULL;

-- ========================================
-- VERIFICER RESULTATET
-- ========================================
SELECT 
  jsonb_array_elements_text("dietaryCategories") as tag,
  COUNT(*) as antal_opskrifter
FROM recipes
WHERE "dietaryCategories" IS NOT NULL 
  AND jsonb_array_length("dietaryCategories") > 0
GROUP BY tag
ORDER BY tag;

