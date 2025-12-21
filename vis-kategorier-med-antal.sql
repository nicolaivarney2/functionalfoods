-- 📊 Vis alle kategorier og antal opskrifter i hver
SELECT 
  "mainCategory" as kategori,
  COUNT(*) as antal_opskrifter
FROM recipes
WHERE "mainCategory" IS NOT NULL
  AND "mainCategory" != ''
GROUP BY "mainCategory"
ORDER BY antal_opskrifter DESC;


