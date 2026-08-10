# Ingrediens → fremgangsmåde (skalerede mængder i trin)

Spejler Planomo-kontrakten. Se også `src/lib/recipe-ingredient-tags.ts`.

## Formål

Mængder lever kun i ingredienslisten. Fremgangsmåden nævner ingredienser uden gram/ml. Ved visning (og når brugeren skifter portioner) indsættes den skalerede mængde inline i trin-teksten.

## Formater

| Lag | Format |
|-----|--------|
| AI-input | `[[ing:løg]]` / `[[ing:smør#2]]` |
| Persistens | `{{ing:<rowId>}}` |
| Render | `0.5 stk løg` (skaleret) |

## Datamodel

Hver linje har `id` (katalog) + `rowId` (unik linje). Tags peger på `rowId`, så to linjer med samme katalog-id (fx 50 g + 25 g smør) kan have forskellige mængder i trin.

## Pipeline ved save

1. `ensureIngredientRowIds()`
2. `linkIngredientTagsInInstructions()` (navne-tags + fuzzy → `{{ing:rowId}}`)
3. Gem ingredients + instructions

Wirede save-ruter: `save-ai-draft`, `save-generated-recipe`, provisional promote, `PUT /api/admin/recipes`.

## Render

- Web: `InstructionsList` (highlight, følger `servings`)
- App: `opskrift/[id].tsx` (`InstructionRichText`)
- SEO: `structured-data.ts` ekspanderer tags til plain text

## Backfill (eksisterende opskrifter)

```bash
npx tsx scripts/backfill-ingredient-tags.ts                 # dry-run
npx tsx scripts/backfill-ingredient-tags.ts --status=published --limit=20
npx tsx scripts/backfill-ingredient-tags.ts --apply         # skriv til DB
```

Idempotent. Volume er ikke problemet — kør dry-run og spot-check et par previews før `--apply`.
