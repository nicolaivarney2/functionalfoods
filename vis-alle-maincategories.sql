-- 📋 Vis alle mainCategory værdier (Aftensmad, Frokost, osv.)
-- Simpel oversigt over hvilke hovedkategorier der findes

-- Vis alle unikke mainCategory værdier og hvor mange opskrifter der har hver
SELECT 
  COALESCE("mainCategory", 'NULL') as kategori,
  COUNT(*) as antal_opskrifter
FROM recipes
GROUP BY "mainCategory"
ORDER BY antal_opskrifter DESC;

-- Vis også eksempler på opskrifter med hver kategori
SELECT 
  "mainCategory" as kategori,
  id,
  title
FROM recipes
WHERE "mainCategory" IS NOT NULL
ORDER BY "mainCategory", title
LIMIT 50;

