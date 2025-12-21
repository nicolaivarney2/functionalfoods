-- 📋 Vis alle forskellige mainCategory værdier der findes
-- Dette viser alle variationer så vi kan standardisere dem

-- Vis alle unikke mainCategory værdier og antal opskrifter
SELECT 
  "mainCategory" as kategori,
  COUNT(*) as antal_opskrifter
FROM recipes
WHERE "mainCategory" IS NOT NULL
  AND "mainCategory" != ''
GROUP BY "mainCategory"
ORDER BY antal_opskrifter DESC;

-- Vis også totalt antal opskrifter
SELECT 
  COUNT(*) as total_opskrifter,
  COUNT(DISTINCT "mainCategory") as antal_forskellige_kategorier
FROM recipes
WHERE "mainCategory" IS NOT NULL
  AND "mainCategory" != '';


