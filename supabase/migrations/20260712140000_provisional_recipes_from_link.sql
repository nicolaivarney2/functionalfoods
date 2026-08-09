-- Tilføj 'from-link' som gyldig kilde for foreløbige opskrifter (import fra webside).
-- Idempotent.

ALTER TABLE provisional_recipes DROP CONSTRAINT IF EXISTS provisional_recipes_source_check;

ALTER TABLE provisional_recipes
  ADD CONSTRAINT provisional_recipes_source_check
  CHECK (source IN ('ai-photo', 'ai-voice', 'manual', 'from-link'));
