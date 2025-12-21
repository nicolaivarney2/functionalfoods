-- 🏷️ Standardiser alle tags til de korrekte navne
-- Dette script mapper alle eksisterende tags til de standardiserede tag-navne

-- ========================================
-- STANDARDISER TIL KORREKTE TAG-NAVNE
-- ========================================

-- 1. [Keto] → Keto
UPDATE recipes
SET "dietaryCategories" = (
  SELECT jsonb_agg(
    CASE 
      WHEN value::text = '"[Keto]"' THEN '"Keto"'::jsonb
      ELSE value
    END
  )
  FROM jsonb_array_elements("dietaryCategories")
)
WHERE "dietaryCategories" IS NOT NULL
  AND "dietaryCategories"::text LIKE '%"[Keto]"%';

-- 2. keto (lowercase) → Keto
UPDATE recipes
SET "dietaryCategories" = (
  SELECT jsonb_agg(
    CASE 
      WHEN LOWER(value::text) = '"keto"' THEN '"Keto"'::jsonb
      ELSE value
    END
  )
  FROM jsonb_array_elements("dietaryCategories")
)
WHERE "dietaryCategories" IS NOT NULL
  AND LOWER("dietaryCategories"::text) LIKE '%"keto"%'
  AND "dietaryCategories"::text NOT LIKE '%"Keto"%';

-- 3. [Liberal LCHF] → Low carb
UPDATE recipes
SET "dietaryCategories" = (
  SELECT jsonb_agg(
    CASE 
      WHEN value::text LIKE '%"[Liberal%LCHF]"%' OR value::text LIKE '%"[Liberalt%LCHF]"%' THEN '"Low carb"'::jsonb
      ELSE value
    END
  )
  FROM jsonb_array_elements("dietaryCategories")
)
WHERE "dietaryCategories" IS NOT NULL
  AND ("dietaryCategories"::text LIKE '%"[Liberal%LCHF]"%' OR "dietaryCategories"::text LIKE '%"[Liberalt%LCHF]"%');

-- 4. [Low carb] → Low carb (standardiser navnet)
UPDATE recipes
SET "dietaryCategories" = (
  SELECT jsonb_agg(
    CASE 
      WHEN value::text LIKE '%"[Low carb]"%' THEN '"Low carb"'::jsonb
      ELSE value
    END
  )
  FROM jsonb_array_elements("dietaryCategories")
)
WHERE "dietaryCategories" IS NOT NULL
  AND "dietaryCategories"::text LIKE '%"[Low carb]"%';

-- 5. antiinflammatorisk → Anti-inflammatorisk
UPDATE recipes
SET "dietaryCategories" = (
  SELECT jsonb_agg(
    CASE 
      WHEN LOWER(value::text) = '"antiinflammatorisk"' THEN '"Anti-inflammatorisk"'::jsonb
      ELSE value
    END
  )
  FROM jsonb_array_elements("dietaryCategories")
)
WHERE "dietaryCategories" IS NOT NULL
  AND LOWER("dietaryCategories"::text) LIKE '%"antiinflammatorisk"%';

-- 6. Antiinflammatorisk → Anti-inflammatorisk
UPDATE recipes
SET "dietaryCategories" = (
  SELECT jsonb_agg(
    CASE 
      WHEN value::text = '"Antiinflammatorisk"' THEN '"Anti-inflammatorisk"'::jsonb
      ELSE value
    END
  )
  FROM jsonb_array_elements("dietaryCategories")
)
WHERE "dietaryCategories" IS NOT NULL
  AND "dietaryCategories"::text LIKE '%"Antiinflammatorisk"%';

-- 7. lav-kulhydrat → Fjern (du har ikke "Low carb" i din liste)
UPDATE recipes
SET "dietaryCategories" = (
  SELECT jsonb_agg(
    CASE 
      WHEN value::text LIKE '%"lav-kulhydrat"%' THEN NULL
      ELSE value
    END
  )
  FROM jsonb_array_elements("dietaryCategories")
)
WHERE "dietaryCategories" IS NOT NULL
  AND "dietaryCategories"::text LIKE '%"lav-kulhydrat"%';

-- 8. LCHF → Fjern (du har ikke "LCHF" i din liste)
UPDATE recipes
SET "dietaryCategories" = (
  SELECT jsonb_agg(
    CASE 
      WHEN value::text = '"LCHF"' THEN NULL
      ELSE value
    END
  )
  FROM jsonb_array_elements("dietaryCategories")
)
WHERE "dietaryCategories" IS NOT NULL
  AND "dietaryCategories"::text LIKE '%"LCHF"%';

-- 9. Paleo → Fjern (du har ikke "Paleo" i din liste)
UPDATE recipes
SET "dietaryCategories" = (
  SELECT jsonb_agg(
    CASE 
      WHEN value::text = '"Paleo"' THEN NULL
      ELSE value
    END
  )
  FROM jsonb_array_elements("dietaryCategories")
)
WHERE "dietaryCategories" IS NOT NULL
  AND "dietaryCategories"::text LIKE '%"Paleo"%';

-- 10. sund → Fjern (du har ikke "sund" i din liste)
UPDATE recipes
SET "dietaryCategories" = (
  SELECT jsonb_agg(
    CASE 
      WHEN value::text = '"sund"' THEN NULL
      ELSE value
    END
  )
  FROM jsonb_array_elements("dietaryCategories")
)
WHERE "dietaryCategories" IS NOT NULL
  AND "dietaryCategories"::text LIKE '%"sund"%';

-- 11. GLP-1 → GLP-1 kost
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
  AND "dietaryCategories"::text LIKE '%"GLP-1"%'
  AND "dietaryCategories"::text NOT LIKE '%"GLP-1 kost"%';

-- Fjern NULL værdier
UPDATE recipes
SET "dietaryCategories" = (
  SELECT jsonb_agg(value)
  FROM jsonb_array_elements("dietaryCategories")
  WHERE value IS NOT NULL
)
WHERE "dietaryCategories" IS NOT NULL;

-- Fjern tomme arrays
UPDATE recipes
SET "dietaryCategories" = NULL
WHERE "dietaryCategories" IS NOT NULL
  AND jsonb_array_length("dietaryCategories") = 0;

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
-- Vis alle tags efter standardisering
SELECT 
  jsonb_array_elements_text("dietaryCategories") as tag,
  COUNT(*) as antal_opskrifter
FROM recipes
WHERE "dietaryCategories" IS NOT NULL 
  AND jsonb_array_length("dietaryCategories") > 0
GROUP BY tag
ORDER BY tag;

