-- 🔍 Tjek konsistens af tag-navne
-- Kør dette for at se alle tag-navne der bruges i systemet

-- Vis alle unikke tag-navne og hvor mange opskrifter der bruger dem
SELECT 
  jsonb_array_elements_text("dietaryCategories") as tag,
  COUNT(*) as antal_opskrifter,
  ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM recipes WHERE "dietaryCategories" IS NOT NULL), 2) as procent
FROM recipes
WHERE "dietaryCategories" IS NOT NULL 
  AND jsonb_array_length("dietaryCategories") > 0
GROUP BY tag
ORDER BY antal_opskrifter DESC;

-- Tjek specifikt for GLP-1 varianter
SELECT 
  CASE 
    WHEN "dietaryCategories"::text ILIKE '%"GLP-1 kost"%' THEN 'GLP-1 kost (korrekt)'
    WHEN "dietaryCategories"::text ILIKE '%"GLP-1"%' THEN 'GLP-1 (forkert - mangler "kost")'
    WHEN "dietaryCategories"::text ILIKE '%glp-1%' OR "dietaryCategories"::text ILIKE '%glp1%' THEN 'glp-1/glp1 (forkert - lowercase eller variant)'
    ELSE 'Ingen GLP-1 tag'
  END as tag_status,
  COUNT(*) as antal_opskrifter
FROM recipes
WHERE "dietaryCategories" IS NOT NULL
  AND (
    "dietaryCategories"::text ILIKE '%glp%'
  )
GROUP BY tag_status
ORDER BY antal_opskrifter DESC;

-- Vis eksempler på opskrifter med "GLP-1" (forkert)
SELECT 
  id,
  title,
  "dietaryCategories",
  calories,
  carbs
FROM recipes
WHERE "dietaryCategories" IS NOT NULL
  AND "dietaryCategories"::text ILIKE '%"GLP-1"%'
  AND "dietaryCategories"::text NOT ILIKE '%"GLP-1 kost"%'
LIMIT 10;


