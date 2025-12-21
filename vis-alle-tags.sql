-- 📋 Vis alle tags/kategorier der faktisk findes på opskrifter
-- Simpel oversigt så du kan se hvad der er der

-- Vis alle unikke tags og hvor mange opskrifter der har hver tag
SELECT 
  jsonb_array_elements_text("dietaryCategories") as tag,
  COUNT(*) as antal_opskrifter
FROM recipes
WHERE "dietaryCategories" IS NOT NULL 
  AND jsonb_array_length("dietaryCategories") > 0
GROUP BY tag
ORDER BY tag;


