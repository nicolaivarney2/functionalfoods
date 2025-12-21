# 🏷️ Dietary Tags Reference

Dette dokument viser de korrekte tag-navne der skal bruges i systemet, baseret på `recipe-tag-mapper.ts`.

## Korrekte Tag Navne

Disse tags er defineret i systemet og skal bruges konsistent:

| Intern Kategori | Korrekt Tag Navn | Beskrivelse |
|----------------|------------------|-------------|
| `familiemad` | `Familiemad` | Opskrifter til hele familien |
| `keto` | `Keto` | Keto-diæt opskrifter |
| `sense` | `Sense` | Sense-diæt opskrifter |
| `glp-1` / `glp1` | `GLP-1 kost` | GLP-1 medicin venlige opskrifter |
| `antiinflammatorisk` | `Antiinflammatorisk` | Anti-inflammatoriske opskrifter |
| `fleksitarisk` | `Fleksitarisk` | Fleksitariske opskrifter |
| `5-2` | `5:2` | 5:2 diæt opskrifter |
| `meal-prep` / `mealprep` | `Meal prep` | Meal prep opskrifter |

## Vigtigt

- **Brug altid de eksakte tag-navne** som vist i tabellen ovenfor
- Tags gemmes i `recipes.dietaryCategories` som et JSONB array
- Eksempel: `["Keto", "GLP-1 kost", "Sense"]`

## SQL Queries

1. **Tjek eksisterende tags**: Kør `check-recipe-tags.sql`
2. **Tilføj tags til opskrifter**: Kør `add-dietary-tags-to-recipes.sql` (tilpas WHERE betingelserne)
3. **Standardiser tags**: Kør `fix-dietary-tags-standardization.sql` for at sikre konsistens

## Eksempel på Brug

Når du importerer Ketoliv opskrifter og vil markere dem med tags:

```sql
-- Eksempel: Tilføj "GLP-1 kost" tag til specifikke opskrifter
UPDATE recipes
SET dietaryCategories = COALESCE(dietaryCategories, '[]'::jsonb) || '["GLP-1 kost"]'::jsonb
WHERE id IN ('recipe-id-1', 'recipe-id-2')
  AND NOT (dietaryCategories::text ILIKE '%GLP-1 kost%');
```


