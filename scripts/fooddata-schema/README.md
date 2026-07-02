# Fooddata schema — fælles kurering

Kør i **grocery Supabase** (`GROCERY_SUPABASE_URL`) i denne rækkefølge:

1. `001_planomo_publish_tables.sql` — opret publish-tabeller med `source IN ('planomo', 'ff')`
2. `002_shared_curation_source.sql` — opgrader eksisterende tabeller til fælles kurering
3. `003_ingredient_id_text.sql` — `ingredient_id` som text (accepterer UUID + `ingredient-*`)
4. `004_curation_rls_service_role.sql` — RLS policies så `GROCERY_SUPABASE_SECRET_KEY` kan pushe
5. `009_rls_grocery_migrations_ledger.sql` — RLS på `_grocery_migrations` (lukker kritisk sikkerhedshul)
6. `010_security_hardening.sql` — `set_updated_at` search_path + flyt `pg_trgm` til `extensions` schema

**FF ansvar:** Kør alle scripts én gang i grocery-projektet (eller `npx tsx scripts/grocery-migrate.ts` for `005_*` i repo). Eksisterende installs: kør mindst `003` efter `001`+`002`, derefter re-merge fra Planomo.

**Planomo:** Bruger ikke disse scripts direkte — kun push/pull via `src/lib/fooddata-publish/` og import-scripts.

## Oprydning (jun 2026)

| Script | Hvor | Hvad |
|--------|------|------|
| `005_purge_legacy_goma_ids.sql` | Grocery | Goma i fælles DB (allerede kørt) |
| `006_purge_legacy_goma_ff.sql` | **FF main** | Goma i FF cache (~1786 matches, ~1400 kø) |
| `007_purge_planomo_duplicate_matches.sql` | Grocery | Planomo-duplikater (~473), behold unikke ~389 |
| `008_verify_curation_alignment.sql` | FF + grocery | Read-only verify efter oprydning |

Efter oprydning: `npm run fooddata:import:curation-only` (skulle være 0 nye matches).
