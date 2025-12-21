-- 🔧 Find og ret forkerte tag-navne
-- Dette script finder opskrifter med forkerte tag-navne og retter dem til de korrekte

-- ========================================
-- 1. FIND OPSKRIFTER MED FORKERTE TAG-NAVNE
-- ========================================

-- Find opskrifter med "GLP-1" i stedet for "GLP-1 kost"
SELECT 
  'GLP-1 (forkert)' as forkert_tag,
  COUNT(*) as antal_opskrifter
FROM recipes
WHERE "dietaryCategories" IS NOT NULL
  AND "dietaryCategories"::text ILIKE '%"GLP-1"%'
  AND "dietaryCategories"::text NOT ILIKE '%"GLP-1 kost"%';

-- Find opskrifter med andre forkerte varianter
SELECT 
  jsonb_array_elements_text("dietaryCategories") as tag,
  COUNT(*) as antal_opskrifter
FROM recipes
WHERE "dietaryCategories" IS NOT NULL
  AND (
    "dietaryCategories"::text ILIKE '%glp%'
    OR "dietaryCategories"::text ILIKE '%sense%'
    OR "dietaryCategories"::text ILIKE '%anti%inflamm%'
  )
GROUP BY tag
HAVING tag NOT IN ('GLP-1 kost', 'Sense', 'Antiinflammatorisk')
ORDER BY antal_opskrifter DESC;

-- ========================================
-- 2. RET FORKERTE TAG-NAVNE
-- ========================================

-- Ret "GLP-1" til "GLP-1 kost"
UPDATE recipes
SET "dietaryCategories" = (
  SELECT jsonb_agg(
    CASE 
      WHEN value::text = '"GLP-1"' THEN '"GLP-1 kost"'::jsonb
      ELSE value
    END
  )
  FROM jsonb_array_elements("dietaryCategories")
)
WHERE "dietaryCategories" IS NOT NULL
  AND "dietaryCategories"::text ILIKE '%"GLP-1"%'
  AND "dietaryCategories"::text NOT ILIKE '%"GLP-1 kost"%';

-- Ret "glp-1" (lowercase) til "GLP-1 kost"
UPDATE recipes
SET "dietaryCategories" = (
  SELECT jsonb_agg(
    CASE 
      WHEN LOWER(value::text) = '"glp-1"' OR LOWER(value::text) = '"glp1"' THEN '"GLP-1 kost"'::jsonb
      ELSE value
    END
  )
  FROM jsonb_array_elements("dietaryCategories")
)
WHERE "dietaryCategories" IS NOT NULL
  AND (
    "dietaryCategories"::text ILIKE '%"glp-1"%'
    OR "dietaryCategories"::text ILIKE '%"glp1"%'
  )
  AND "dietaryCategories"::text NOT ILIKE '%"GLP-1 kost"%';

-- Ret "sense" (lowercase) til "Sense"
UPDATE recipes
SET "dietaryCategories" = (
  SELECT jsonb_agg(
    CASE 
      WHEN LOWER(value::text) = '"sense"' THEN '"Sense"'::jsonb
      ELSE value
    END
  )
  FROM jsonb_array_elements("dietaryCategories")
)
WHERE "dietaryCategories" IS NOT NULL
  AND LOWER("dietaryCategories"::text) LIKE '%"sense"%'
  AND "dietaryCategories"::text NOT ILIKE '%"Sense"%';

-- Ret "anti-inflammatorisk" varianter til "Antiinflammatorisk"
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
  AND (
    "dietaryCategories"::text ILIKE '%anti%inflammatorisk%'
    OR "dietaryCategories"::text ILIKE '%anti-inflammatorisk%'
  )
  AND "dietaryCategories"::text NOT ILIKE '%"Antiinflammatorisk"%';

-- ========================================
-- 3. FJERN DUPLIKATER EFTER RETTELSER
-- ========================================
UPDATE recipes
SET "dietaryCategories" = (
  SELECT jsonb_agg(DISTINCT value ORDER BY value)
  FROM jsonb_array_elements("dietaryCategories")
)
WHERE "dietaryCategories" IS NOT NULL;

-- ========================================
-- 4. VERIFICER RESULTATET
-- ========================================

-- Tjek om der stadig er forkerte tag-navne
SELECT 
  jsonb_array_elements_text("dietaryCategories") as tag,
  COUNT(*) as antal_opskrifter
FROM recipes
WHERE "dietaryCategories" IS NOT NULL
  AND (
    "dietaryCategories"::text ILIKE '%glp%'
    OR "dietaryCategories"::text ILIKE '%sense%'
    OR "dietaryCategories"::text ILIKE '%anti%inflamm%'
  )
GROUP BY tag
ORDER BY tag;

-- Vis eksempler på opskrifter med de korrekte tags
SELECT 
  id,
  title,
  "dietaryCategories"
FROM recipes
WHERE "dietaryCategories" IS NOT NULL
  AND (
    "dietaryCategories"::text ILIKE '%"GLP-1 kost"%'
    OR "dietaryCategories"::text ILIKE '%"Sense"%'
    OR "dietaryCategories"::text ILIKE '%"Antiinflammatorisk"%'
  )
LIMIT 10;


